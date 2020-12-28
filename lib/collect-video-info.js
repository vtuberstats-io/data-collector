const { default: ow } = require('ow');
const { videoInfoMeta, videoInfoData } = require('./shapes');
const { Point } = require('@influxdata/influxdb-client');

function verifyVideoInfo(meta, data) {
  ow(meta, videoInfoMeta);
  ow(data, videoInfoData);
}

function makePoint(measurement, meta, value) {
  return new Point(measurement)
    .timestamp(meta.timestamp)
    .tag('domain', meta.domain)
    .tag('videoId', meta.videoId)
    .intField('value', value);
}

async function collectVideoInfo(ctx, meta, data) {
  const collection = ctx.videoInfoCollection;
  const filter = { domain: meta.domain, videoId: meta.videoId };
  const infoData = {
    domain: meta.domain,
    videoId: meta.videoId,
    lastUpdatedAt: meta.timestamp,
    info: data
  };
  await collection.updateOne(filter, infoData, { upsert: true });

  ctx.livestreamStatsBucket.writePoints([
    makePoint('view-count', meta, data.viewCount),
    makePoint('like-count', meta, data.likeCount),
    makePoint('dislike-count', meta, data.dislikeCount)
  ]);

  await ctx.elasticClient.index({
    index: 'vtuberstats',
    type: 'youtube-video-info',
    body: {
      videoId: meta.videoId,
      title: data.title,
      description: data.description,
      tags: data.tags
    }
  });

  // TODO: check and save new image to filesystem
}

module.exports = { verifyVideoInfo, collectVideoInfo };
