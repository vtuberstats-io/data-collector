const { default: ow } = require('ow');

const channelInfoMeta = ow.object.exactShape({
  scheduledTimestamp: ow.string.nonEmpty,
  domain: ow.string.oneOf(['bilibili', 'youtube']),
  kind: ow.string.nonEmpty,
  id: ow.string.nonEmpty,
  channelId: ow.string.nonEmpty
});

const channelInfoDataYoutube = ow.object.exactShape({
  title: ow.string.nonEmpty,
  description: ow.string.nonEmpty,
  publishedAt: ow.string.nonEmpty,
  thumbnailUrl: ow.string.nonEmpty,
  bannerUrl: ow.string.nonEmpty,
  viewCount: ow.number.positive,
  subscriberCount: ow.number.positive,
  videoCount: ow.number.positive
});

const livestreamInfoMeta = ow.object.exactShape({
  domain: ow.string.oneOf(['bilibili', 'youtube']),
  videoId: ow.string.nonEmpty
});

const livestreamInfoData = ow.object.exactShape({
  title: ow.string.nonEmpty,
  description: ow.string.nonEmpty,
  thumbnailUrl: ow.string.nonEmpty,
  publishedAt: ow.string.nonEmpty,
  tags: ow.array.ofType(ow.string.nonEmpty),
  isLive: ow.boolean,
  viewCount: ow.number.positive,
  viewerCount: ow.number.positive,
  likeCount: ow.number.positive,
  dislikeCount: ow.number.positive,
  scheduledStartTime: ow.string.nonEmpty,
  scheduledEndTime: ow.string.nonEmpty,
  actualStartTime: ow.string.nonEmpty,
  actualEndTime: ow.string.nonEmpty
});

const livechatMessageMeta = ow.object.exactShape({
  domain: ow.string.oneOf(['bilibili', 'youtube']),
  videoId: ow.string.nonEmpty
});

const livechatTextMessageData = ow.object.exactShape({
  offsetTimeMs: ow.number.greaterThanOrEqual(0),
  type: ow.string.equals('text'),
  authorChannelId: ow.string.nonEmpty,
  message: ow.string.nonEmpty,
  isMember: ow.boolean
});

const livechatSuperchatMessageData = ow.object.exactShape({
  offsetTimeMs: ow.number.greaterThanOrEqual(0),
  type: ow.string.equals('superchat'),
  authorChannelId: ow.string.nonEmpty,
  message: ow.string.nonEmpty,
  amountText: ow.string.nonEmpty,
  isMember: ow.boolean
});

const videoInfoMeta = ow.object.exactShape({
  scheduledTimestamp: ow.string.nonEmpty,
  domain: ow.string.oneOf(['bilibili', 'youtube']),
  kind: ow.string.nonEmpty,
  id: ow.string.nonEmpty,
  channelId: ow.string.nonEmpty
});

const videoInfoData = ow.object.exactShape({
  title: ow.string.nonEmpty,
  description: ow.string.nonEmpty,
  publishedAt: ow.string.nonEmpty,
  thumbnailUrl: ow.string.nonEmpty,
  tags: ow.array.ofType(ow.string.nonEmpty),
  viewCount: ow.number.positive,
  likeCount: ow.number.positive,
  dislikeCount: ow.number.positive
});

module.exports = {
  channelInfoMeta,
  channelInfoDataYoutube,
  livestreamInfoMeta,
  livestreamInfoData,
  livechatMessageMeta,
  livechatTextMessageData,
  livechatSuperchatMessageData,
  videoInfoMeta,
  videoInfoData
};
