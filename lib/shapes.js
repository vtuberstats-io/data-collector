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

module.exports = { channelInfoMeta, channelInfoDataYoutube };
