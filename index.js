const KAFKA_BROKERS = process.env.KAFKA_BROKERS;
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const MONGODB_URL = process.env.MONGODB_URL;
const HOSTNAME = process.env.HOSTNAME; // offered by kubernetes automatically

if (!KAFKA_BROKERS || !INFLUX_URL || !INFLUX_TOKEN || !MONGODB_URL) {
  console.error(`missing environment variables, env: ${process.env}`);
  process.exit(1);
}

const { Kafka } = require('kafkajs');
const { InfluxDB } = require('@influxdata/influxdb-client');
const { MongoClient } = require('mongodb');
const collectYoutubeChannelInfo = require('./lib/youtube-channel-info-collector');

const kafka = new Kafka({
  clientId: HOSTNAME,
  brokers: KAFKA_BROKERS.trim().split(',')
});
const kafkaDataConsumer = kafka.consumer({ groupId: 'data-collector', sessionTimeout: 12 * 1000 });

const COLLECTORS = {
  'youtube-channel-info': collectYoutubeChannelInfo
};
const TARGET_TOPICS = Array.from(Object.getOwnPropertyNames(COLLECTORS));

const ctx = {
  influx: new InfluxDB({
    url: INFLUX_URL,
    token: INFLUX_TOKEN
  })
};

async function init() {
  console.info('connecting to kafka');
  await kafkaDataConsumer.connect();
  for (const topic of TARGET_TOPICS) {
    await kafkaDataConsumer.subscribe({ topic });
  }

  console.info('connecting to mongodb');
  const db = (await MongoClient.connect(MONGODB_URL)).db('vtuberstats');

  console.info('start reading data from kafka');
  await readMessageFromKafka({ db });
}

async function readMessageFromKafka(collectorCtx) {
  await kafkaDataConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const value = JSON.parse(message.value.toString());
      const { data, meta } = value;

      if (
        !value.hasOwnProperty('data') ||
        !value.hasOwnProperty('meta') ||
        typeof data !== 'object' ||
        typeof meta !== 'object'
      ) {
        console.warn(`invalid message: '${message}'`);
        return;
      }

      const collector = COLLECTORS[topic];
      if (!collector) {
        console.warn(`cannot find collector for topic '${topic}'`);
        return;
      }

      collector(collectorCtx, data, meta || {}).error((e) => {
        console.error(`failed to collect message '${message}', err: ${e}`);
      });
    }
  });
}

init().catch((err) => console.error(err));
