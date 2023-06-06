import { OnTransactionHandler } from '@metamask/snaps-types';
import { divider, heading, panel, text } from '@metamask/snaps-ui';

const wei = 1000000000000000000;

const getFees = async () => {
  const data = await fetch(
    'https://api.dune.com/api/v1/query/2612275/results?api_key=gYecTnhhFCXuAcnQAgyBpG20ymZz8AZF',
  ).then((response) => response.json());
  return data;
};

const exchangeEthToUsd = async () => {
  const data = await fetch(
    `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=ethereum`,
  )
    .then((response) => response.json())
    // eslint-disable-next-line @typescript-eslint/no-shadow
    .then((data) => {
      return data[0].current_price;
    });
  return data;
};

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  // Use the window.ethereum global provider to fetch the gas price.
  const res = await getFees();

  const date = new Date();
  const hours = date.getHours() - 2;

  const usd = await exchangeEthToUsd();

  const { result } = res;

  const { rows } = result;
  const fees = rows.map((row: any) => {
    // eslint-disable-next-line camelcase
    const { avg_base_fee_per_gas } = row;
    // eslint-disable-next-line camelcase
    return avg_base_fee_per_gas;
  });

  const highest = Math.max(...fees);
  const max = fees.indexOf(highest);
  // En düşük 3 değeri bul
  const lowestThreeIndices = Array.from(Array(fees.length).keys())
    .sort((a, b) => fees[a] - fees[b])
    .slice(0, 3);

  // En düşük 3 değeri saatine göre sırala
  lowestThreeIndices.sort((a, b) => a - b);

  // Aritmetik düzeni kontrol et ve sonuçları yazdır
  const intervals = [];
  let start = lowestThreeIndices[0];

  for (let i = 0; i < lowestThreeIndices.length - 1; i++) {
    if (lowestThreeIndices[i + 1] - lowestThreeIndices[i] !== 1) {
      // Check if hours are not consecutive
      intervals.push([start, lowestThreeIndices[i] + 1]);
      start = lowestThreeIndices[i + 1];
    }
  }

  intervals.push([
    start,
    lowestThreeIndices[lowestThreeIndices.length - 1] + 1,
  ]); // Add the last interval

  const { gas, maxFeePerGas } = transaction;
  const gasT = parseInt(gas?.toString() || '', 16);
  const maxFeePerGasT = parseInt(maxFeePerGas?.toString() || '', 16);
  const fee = (gasT * maxFeePerGasT) / wei;

  const amount = fee * usd;

  if (intervals.find((interval) => interval[0] === hours)) {
    return {
      content: panel([
        heading({ value: '🟢 Happy Hour 🟢' }),
        text(`**Current Gas Fee**`),
        text({
          value: `**${amount.toFixed(2)}$ $**`,
        }),
        divider(),
        text('Best time to make a transaction 💰'),
      ]),
    };
  } else if (max === hours) {
    return {
      content: panel([
        heading({ value: '🛑 Worst Hour 🛑' }),
        text(`**Current Gas Fee**`),
        text({
          value: `**${amount.toFixed(2)}$ $**`,
        }),
        divider(),
        text('Save Your Money 💰'),
        ...intervals.map((interval, index) =>
          text(
            `🕔 ${interval[0]}:00 - ${interval[1]}:00 arasında -> ${(
              (rows[index].avg_base_fee_per_gas * gasT * usd) /
              wei
            ).toFixed(2)}$ ✅%${Math.floor(
              ((amount -
                (rows[index].avg_base_fee_per_gas * gasT * usd) / wei) /
                amount) *
                100,
            )}`,
          ),
        ),
      ]),
    };
  }
  return {
    content: panel([
      text(`**Current Gas Fee**`),
      text({
        value: `**${amount.toFixed(2)} $**`,
      }),
      divider(),
      text('Save Your Money 💰'),
      ...intervals.map((interval, index) =>
        text(
          `🕔 ${interval[0]}:00 - ${interval[1]}:00 arasında -> ${(
            (rows[index].avg_base_fee_per_gas * gasT * usd) /
            wei
          ).toFixed(2)}$ ✅%${Math.floor(
            ((amount - (rows[index].avg_base_fee_per_gas * gasT * usd) / wei) /
              amount) *
              100,
          )}`,
        ),
      ),
      text(hours.toString()),
    ]),
  };
};
