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
    .tag('videoId', meta.domain)
    .intField('value', value);
}

async function collectLivestreamInfo(ctx, meta, data) {
  const collection = ctx.channelInfoCollection;

  const filter = { videoId: meta.videoId };
  const infoData = {
    videoId: meta.videoId,
    lastUpdatedAt: meta.timestamp,
    info: data
  };
  await collection.updateOne(filter, infoData, { upsert: true });

  ctx.livestreamStatsBucket.writePoints([
    makePoint('view-count', meta, data.viewCount),
    makePoint('viewer-count', meta, data.viewerCount),
    makePoint('like-count', meta, data.likeCount),
    makePoint('dislike-count', meta, data.dislikeCount)
  ]);

  // TODO: check and save new image to filesystem
}

module.exports = { verifyLivestreamInfo, collectLivestreamInfo };
