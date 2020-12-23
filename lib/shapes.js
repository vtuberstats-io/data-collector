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

module.exports = {
  channelInfoMeta,
  channelInfoDataYoutube,
  livestreamInfoMeta,
  livestreamInfoData
};
