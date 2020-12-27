const CURRENCY_TYPE_MAPPING = {
  '￥': 'JPY',
  SGD: 'SGD',
  CA$: 'CAD',
  NT$: 'TWD',
  $: 'USD',
  A$: 'AUD',
  '€': 'EUR',
  PHP: 'PHP',
  MX$: 'MXD',
  HK$: 'HKD',
  '₩': 'KRW',
  RUB: 'RUB',
  NZ$: 'NZD',
  ARS: 'ARS',
  CHF: 'CHF',
  '£': 'GBP',
  PEN: 'PEN',
  CLP: 'CLP',
  PLN: 'PLN',
  HUF: 'HUF',
  R$: 'SAR',
  RON: 'RON',
  '₹': 'INR',
  SEK: 'SEK',
  NOK: 'NOK',
  UYU: 'UYU',
  BOB: 'BOB',
  BYN: 'BYN',
  CRC: 'CRC',
  ZAR: 'ZAR',
  ISK: 'ISK',
  COP: 'COP',
  DKK: 'DKK',
  PYG: 'PYG',
  CZK: 'CZK',
  GTQ: 'GTQ',
  HRK: 'HRK',
  HNL: 'HNL',
  UGX: 'UGX',
  RSD: 'RSD',
  BGN: 'BGN',
  NIO: 'NIO',
  DOP: 'DOP'
};

let usdExchangeRateMapping = new Map();

async function updateUsdExchangeRateMapping(dbCollection) {
  const newMap = new Map();
  const exchangeRateItems = dbCollection.find({});
  for await (const item of exchangeRateItems) {
    newMap.set(item.type, item.exchangeRateUsd);
  }
  usdExchangeRateMapping = newMap;
}

const AMOUNT_TEXT_REGEX = /^(.*?)(\d+(?:\.([\d]+))*)/i;

function resolveAmountText(amountText) {
  const result = AMOUNT_TEXT_REGEX.exec(amountText);
  if (!result) {
    throw new Error(`invalid amount text: ${amountText}`);
  }

  const typeText = result[1];
  const type = CURRENCY_TYPE_MAPPING[typeText];
  if (!type) {
    throw new Error(
      `no mapping found for currency ${typeText}, map: ${JSON.stringify(usdExchangeRateMapping)}`
    );
  }

  const rate = usdExchangeRateMapping.get(type);
  if (!rate) {
    throw new Error(`no exchange rate found for currency type ${type} (typeText: ${typeText})`);
  }

  const amount = Number(result[2]);
  const amountInUsd = amount / rate;
  if (!amount || !amountInUsd) {
    throw new Error(
      `failed to calculate amount for ${amountText}, amount: ${amount}, amountInUsd: ${amountInUsd}`
    );
  }

  return {
    type,
    amount,
    amountInUsd
  };
}

module.exports = { updateUsdExchangeRateMapping, resolveAmountText };
