const { default: ow } = require('ow');
const { livestreamInfoMeta, livestreamInfoData } = require('./shapes');
const { Point } = require('@influxdata/influxdb-client');

function verifyLivestreamInfo(meta, data) {
  ow(meta, livestreamInfoMeta);
  ow(data, livestreamInfoData);
}

function makePoint(measurement, meta, value) {
  return new Point(measurement)
    .timestamp(meta.timestamp)
    .tag('domain', meta.domain)
    .tag('videoId', meta.videoId)
    .intField('value', value);
}

async function collectLivestreamInfo(ctx, meta, data) {
  const collection = ctx.channelInfoCollection;
  const filter = { domain: meta.domain, videoId: meta.videoId };
  const infoData = {
    domain: meta.domain,
    videoId: meta.videoId,
    lastUpdatedAt: meta.timestamp,
    info: data
  };
  await collection.updateOne(filter, { $set: infoData }, { upsert: true });

  ctx.livestreamStatsBucket.writePoints([
    makePoint('view-count', meta, data.viewCount),
    makePoint('viewer-count', meta, data.viewerCount),
    makePoint('like-count', meta, data.likeCount),
    makePoint('dislike-count', meta, data.dislikeCount)
  ]);

  await ctx.elasticClient.index({
    index: 'vtuberstats',
    type: 'youtube-livestream-info',
    body: {
      videoId: meta.videoId,
      title: data.title,
      description: data.description,
      tags: data.tags
    }
  });

  // TODO: check and save new image to filesystem
}

module.exports = { verifyLivestreamInfo, collectLivestreamInfo };
