async function collect(ctx, data, meta) {
  const collection = ctx.db.collection('channel-info');
  await collection.insert({
    raw: data,
    domain: 'youtube',
    type: 'vtuber',
    id: meta.vtuberId,
    title: data.brandSettings.channel.title,
    description: data.brandSettings.channel.description,
    publishedAt: data.brandSettings.channel.publishedAt,
    videoCount: data.statistics.videoCount,
    viewCount: data.statistics.viewCount,
    subscriberCount: data.statistics.subscriberCount
  });
}

module.exports = collect;
