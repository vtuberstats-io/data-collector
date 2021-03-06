const { default: ow } = require('ow');
const {
  livechatMessageMeta,
  livechatTextMessageData,
  livechatSuperchatMessageData
} = require('./shapes');
const { resolveAmountText } = require('./superchat-amount-utils');
const { Point } = require('@influxdata/influxdb-client');

function verifyLivechatMessage(meta, data) {
  ow(meta, livechatMessageMeta);
  switch (data.type) {
    case 'text':
      ow(data, livechatTextMessageData);
      break;
    case 'superchat':
      ow(data, livechatSuperchatMessageData);
      break;
    default:
      throw new Error(
        `unknown livechat message type '${data.type}' for '${JSON.stringify({ meta, data })}'`
      );
  }
}

function makeMessagePoint(meta, data) {
  return new Point('message')
    .timestamp(new Date(data.offsetTimeMs).toISOString())
    .tag('domain', meta.domain)
    .tag('videoId', meta.videoId)
    .tag('isMember', data.isMember)
    .stringField('authorChannelId', data.authorChannelId);
}

function makeSuperchatMessagePoints(meta, data) {
  const { type, amount, amountInUsd } = resolveAmountText(data.amountText);
  return [
    new Point('total-in-usd')
      .timestamp(new Date(data.offsetTimeMs).toISOString())
      .tag('domain', meta.domain)
      .tag('videoId', meta.videoId)
      .tag('isMember', data.isMember)
      .floatField(data.authorChannelId, amountInUsd),
    new Point(type)
      .timestamp(new Date(data.offsetTimeMs).toISOString())
      .tag('domain', meta.domain)
      .tag('videoId', meta.videoId)
      .tag('isMember', data.isMember)
      .floatField(data.authorChannelId, amount)
  ];
}

async function collectLivechatMessage(ctx, meta, data) {
  switch (data.type) {
    case 'text':
      ctx.livechatMessageBucket.writePoint(makeMessagePoint(meta, data));
      await ctx.elasticClient.index({
        index: 'vtuberstats',
        type: 'youtube-livechat-text-message',
        body: {
          videoId: meta.videoId,
          authorChannelId: data.authorChannelId,
          isMember: data.isMember,
          message: data.message
        }
      });
      break;
    case 'superchat':
      ctx.livechatSuperchatMessageBucket.writePoints(makeSuperchatMessagePoints(meta, data));
      await ctx.elasticClient.index({
        index: 'vtuberstats',
        type: 'youtube-livechat-superchat-message',
        body: {
          videoId: meta.videoId,
          authorChannelId: data.authorChannelId,
          isMember: data.isMember,
          message: data.message
        }
      });
      break;
  }
}

module.exports = { verifyLivechatMessage, collectLivechatMessage };
