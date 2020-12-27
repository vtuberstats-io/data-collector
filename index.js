const KAFKA_BROKERS = process.env.KAFKA_BROKERS;
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const UPDATE_USD_EXCHANGE_RATE_INTERVAL =
  Number(process.env.UPDATE_USD_EXCHANGE_RATE_INTERVAL) || 60 * 60 * 3000; // 3 hours
const HOSTNAME = process.env.HOSTNAME; // offered by kubernetes automatically

if (!KAFKA_BROKERS || !INFLUX_URL || !INFLUX_TOKEN || !MONGODB_URL || !HOSTNAME) {
  console.error(`missing environment variables, env: ${JSON.stringify(process.env)}`);
  process.exit(1);
}

const { addExitHook } = require('exit-hook-plus');
const { Kafka } = require('kafkajs');
const { InfluxDB } = require('@influxdata/influxdb-client');
const { MongoClient } = require('mongodb');
const { updateUsdExchangeRateMapping } = require('./lib/superchat-amount-utils');
const { verifyChannelInfo, collectChannelInfo } = require('./lib/collect-channel-info');
const { verifyLivestreamInfo, collectLivestreamInfo } = require('./lib/collect-livestream-info');
const { verifyVideoInfo, collectVideoInfo } = require('./lib/collect-video-info');
const { verifyLivechatMessage, collectLivechatMessage } = require('./lib/collect-livechat-message');

const kafka = new Kafka({
  clientId: HOSTNAME,
  brokers: KAFKA_BROKERS.trim().split(',')
});
const kafkaDataConsumer = kafka.consumer({ groupId: 'data-collector', sessionTimeout: 12 * 1000 });
const mongo = new MongoClient(MONGODB_URL);
const influx = new InfluxDB({
  url: INFLUX_URL,
  token: INFLUX_TOKEN
});

const COLLECTOR_ITEMS = {
  'channel-info': [verifyChannelInfo, collectChannelInfo],
  'video-info': [verifyVideoInfo, collectVideoInfo],
  'livestream-info': [verifyLivestreamInfo, collectLivestreamInfo],
  'livechat-message': [verifyLivechatMessage, collectLivechatMessage]
};
const TARGET_TOPICS = Array.from(Object.keys(COLLECTOR_ITEMS));

async function init() {
  console.info('connecting to kafka');
  await kafkaDataConsumer.connect();
  for (const topic of TARGET_TOPICS) {
    await kafkaDataConsumer.subscribe({ topic });
  }
  addExitHook(async () => await kafkaDataConsumer.disconnect());

  console.info('connecting to mongodb');
  await mongo.connect();
  addExitHook(async () => await mongo.close());
  const db = mongo.db('vtuberstats');
  const usdExchangeRateCollection = db.collection('usd-exchange-rate');
  const channelInfoCollection = db.collection('channel-info');
  const videoInfoCollection = db.collection('video-info');
  const livestreamInfoCollection = db.collection('livestream-info');

  await initUsdExchangeRateUpdating(usdExchangeRateCollection);

  console.info('preparing influxdb write apis');
  const channelStatsBucket = influx.getWriteApi('vtuberstats', 'channel-stats', 'ms');
  const videoStatsBucket = influx.getWriteApi('vtuberstats', 'video-stats', 'ms');
  const livestreamStatsBucket = influx.getWriteApi('vtuberstats', 'livestream-stats', 'ms');
  const livechatMessageBucket = influx.getWriteApi('vtuberstats', 'livechat-messages', 'ms');
  const livechatSuperchatMessageBucket = influx.getWriteApi(
    'vtuberstats',
    'livechat-superchat-messages',
    'ms'
  );
  addExitHook(async () => await ctx.channelStatsBucket.close());

  const ctx = {
    channelStatsBucket,
    livestreamStatsBucket,
    videoStatsBucket,
    livechatMessageBucket,
    livechatSuperchatMessageBucket,
    channelInfoCollection,
    videoInfoCollection,
    livestreamInfoCollection
  };

  console.info('start reading data from kafka');
  await readMessageFromKafka(ctx);
}

init();

async function readMessageFromKafka(collectorCtx) {
  await kafkaDataConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = JSON.parse(message.value.toString());
      const item = COLLECTOR_ITEMS[topic];
      if (!item) {
        console.warn(`no collector found for topic '${topic}'`);
        return;
      }

      const { meta, data } = value;
      const [verify, collect] = item;
      try {
        verify(meta, data);
      } catch (e) {
        console.warn(
          `dropping invalid message (verify failed: '${e.message}'): '${message.value.toString()}'`
        );
        return;
      }

      try {
        await collect(collectorCtx, meta, data);
      } catch (e) {
        console.error(`failed to collect message '${message.value.toString()}', err: ${e.stack}`);
        // crash the consumer
        throw e;
      }
    }
  });
}

async function initUsdExchangeRateUpdating(collection) {
  console.info('loading USD exchange rate mapping from mongodb for the first time');
  await updateUsdExchangeRateMapping(collection);
  const action = async () => {
    console.info('updating loaded USD exchange rate mapping');
    try {
      await updateUsdExchangeRateMapping(collection);
    } catch (e) {
      console.warn(`failed to update usd exchange rate mapping, error: ${e.stack}`);
    }
    setTimeout(action, UPDATE_USD_EXCHANGE_RATE_INTERVAL);
  };
  setTimeout(action, UPDATE_USD_EXCHANGE_RATE_INTERVAL);
}
