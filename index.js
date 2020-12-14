const KAFKA_BROKERS = process.env.KAFKA_BROKERS;
const INFLUX_URL = process.env.INFLUX_URL;
const INFLUX_TOKEN = process.env.INFLUX_TOKEN;
const HOSTNAME = process.env.HOSTNAME; // offered by kubernetes automatically

if (!KAFKA_BROKERS) {
  console.error('environment variable KAFKA_BROKERS is not specified!');
  process.exit(1);
}
if (!INFLUX_URL) {
  console.error('environment variable INFLUX_URL is not specified!');
  process.exit(1);
}
if (!INFLUX_TOKEN) {
  console.error('environment variable INFLUX_TOKEN is not specified!');
  process.exit(1);
}

const { Kafka } = require('kafkajs');
const { InfluxDB } = require('@influxdata/influxdb-client');

const TARGET_TOPICS = ['fetch-task-done'];

const kafka = new Kafka({
  clientId: HOSTNAME,
  brokers: KAFKA_BROKERS.trim().split(',')
});
const influx = new InfluxDB({
  url: INFLUX_URL,
  token: INFLUX_TOKEN
});

const kafkaDataConsumer = kafka.consumer({ groupId: 'data-collector', sessionTimeout: 12 * 1000 });

async function init() {
  console.info(`connecting to kafka with brokers: ${KAFKA_BROKERS}`);
  await kafkaDataConsumer.connect();
  for (const topic of TARGET_TOPICS) {
    await kafkaDataConsumer.subscribe({ topic });
  }

  console.info('start reading data from kafka');
  await doReadDataFromKafka();
}

async function doReadDataFromKafka() {
  await kafkaDataConsumer.run({
    eachMessage: async ({ topic, message }) => {
      const data = JSON.parse(message.value.toString());
    }
  });
}

init().catch((err) => console.error(err));
