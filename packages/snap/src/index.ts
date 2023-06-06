import { OnTransactionHandler } from '@metamask/snaps-types';
import { heading, panel, text } from '@metamask/snaps-ui';

const wei = 1000000000000000000;

const getFees = async () => {
  const data = await fetch(
    'https://api.dune.com/api/v1/query/2612275/results?api_key=gYecTnhhFCXuAcnQAgyBpG20ymZz8AZF',
  ).then((response) => response.json());

  return data;
};

// Handle outgoing transactions.
export const onTransaction: OnTransactionHandler = async ({ transaction }) => {
  // Use the window.ethereum global provider to fetch the gas price.
  const res = await getFees();

  const { result } = res;

  const { rows } = result;
  const fees = rows.map((row: any) => {
    // eslint-disable-next-line camelcase
    const { avg_base_fee_per_gas } = row;
    // eslint-disable-next-line camelcase
    return avg_base_fee_per_gas;
  });
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
  const fee = ((gasT * maxFeePerGasT) / wei).toFixed(8);

  return {
    content: panel([
      heading({ value: 'Transaction Fees' }),
      text(`**Current gas price**: ${fee} ETH`),
      ...intervals.map((interval, index) =>
        text(
          `**${interval[0]} ve ${interval[1]} arasında** => ${(
            (rows[index].avg_base_fee_per_gas * gasT) /
            wei
          ).toFixed(8)} ETH`,
        ),
      ),
    ]),
  };
};
