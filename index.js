const KAFKA_BROKERS = process.env.KAFKA_BROKERS;
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const HOSTNAME = process.env.HOSTNAME; // offered by kubernetes automatically

if (!KAFKA_BROKERS || !INFLUX_URL || !INFLUX_TOKEN || !MONGODB_URL || !HOSTNAME) {
  console.error(`missing environment variables, env: ${JSON.stringify(process.env)}`);
  process.exit(1);
}

const { addExitHook } = require('exit-hook-plus');
const { Kafka } = require('kafkajs');
const { InfluxDB } = require('@influxdata/influxdb-client');
const { MongoClient } = require('mongodb');
const { verifyChannelInfo, collectChannelInfo } = require('./lib/collect-channel-info');

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
  'channel-info': [verifyChannelInfo, collectChannelInfo]
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
  const vtuberMetaCollection = db.collection('vtuber-meta');
  const groupMetaCollection = db.collection('group-meta');
  const channelInfoCollection = db.collection('channel-info');

  console.info('preparing influxdb write apis');
  const influxChannelStatsBucket = influx.getWriteApi('vtuberstats', 'channel-stats', 'ms');
  addExitHook(async () => await ctx.influxChannelStatsBucket.close());

  const ctx = {
    influxChannelStatsBucket,
    vtuberMetaCollection,
    groupMetaCollection,
    channelInfoCollection
  };

  console.info('start reading data from kafka');
  await readMessageFromKafka(ctx);
}

init();

async function readMessageFromKafka(collectorCtx) {
  await kafkaDataConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = JSON.parse(message.value.toString());
      const { meta, data } = value;

      if (
        !value.hasOwnProperty('meta') ||
        !value.hasOwnProperty('data') ||
        typeof meta !== 'object' ||
        typeof data !== 'object'
      ) {
        console.warn(`dropping invalid message (no meta or data): '${message.value.toString()}'`);
        return;
      }

      const item = COLLECTOR_ITEMS[topic];
      if (!item) {
        console.warn(`no collector found for topic '${topic}'`);
        return;
      }

      const verify = item[0];
      const collect = item[1];
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
