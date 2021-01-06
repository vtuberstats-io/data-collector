const { default: ow } = require('ow');
const { channelInfoMeta, channelInfoDataYoutube } = require('./shapes');
const { Point } = require('@influxdata/influxdb-client');

function verifyChannelInfo(meta, data) {
  ow(meta, channelInfoMeta);
  if (meta.domain === 'youtube') {
    ow(data, channelInfoDataYoutube);
  }
  // TODO: domain: bilibili
}

function makePoint(measurement, meta, value) {
  return new Point(measurement)
    .timestamp(meta.scheduledTimestamp)
    .tag('domain', meta.domain)
    .tag('kind', meta.kind)
    .tag('id', meta.id)
    .intField('value', value);
}

async function collectChannelInfo(ctx, meta, data) {
  const collection = ctx.channelInfoCollection;

  const filter = { domain: meta.domain, kind: meta.kind, id: meta.id };
  const infoData = {
    domain: meta.domain,
    kind: meta.kind,
    id: meta.id,
    lastUpdatedAt: meta.scheduledTimestamp,
    info: data
  };
  await collection.updateOne(filter, { $set: infoData }, { upsert: true });

  ctx.channelStatsBucket.writePoints([
    makePoint('view-count', meta, data.viewCount),
    makePoint('subscriber-count', meta, data.subscriberCount),
    makePoint('video-count', meta, data.videoCount)
  ]);

  await ctx.elasticClient.index({
    index: 'vtuberstats',
    type: 'youtube-channel-info',
    body: {
      kind: meta.kind,
      title: data.title,
      description: data.description
    }
  });

  // TODO: check and save new image to filesystem
}

module.exports = { verifyChannelInfo, collectChannelInfo };
