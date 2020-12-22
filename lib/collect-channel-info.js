const { default: ow } = require('ow');
const { channelInfoMeta, channelInfoDataYoutube } = require('./shapes');

function verifyChannelInfo(meta, data) {
  ow(meta, channelInfoMeta);
  if (meta.domain === 'youtube') {
    ow(data, channelInfoDataYoutube);
  }
  // TODO: domain: bilibili
}

async function collectChannelInfo(ctx, meta, data) {
  const collection = ctx.channelInfoCollection;
  const filter = { domain: meta.domain, kind: meta.kind, id: meta.id };
  await collection.updateOne(filter, data, { upsert: true });
  // TODO: check and save new image to filesystem
  // TODO: influxdb
}

module.exports = { verifyChannelInfo, collectChannelInfo };
