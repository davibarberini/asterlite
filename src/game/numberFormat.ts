const namedThousandSuffixes = [
  '',
  'K',
  'M',
  'B',
  'T',
  'Qa',
  'Qi',
  'Sx',
  'Sp',
  'Oc',
  'No',
  'Dc'
];

const getGeneratedSuffix = (group: number): string => {
  let index = Math.max(0, Math.floor(group - namedThousandSuffixes.length));
  let suffix = '';
  do {
    suffix = String.fromCharCode(65 + (index % 26)) + suffix;
    index = Math.floor(index / 26) - 1;
  } while (index >= 0);
  return `A${suffix}`;
};

const getThousandSuffix = (group: number): string =>
  namedThousandSuffixes[group] ?? getGeneratedSuffix(group);

const trimDecimals = (value: string): string =>
  value.replace(/\.0+$/, '').replace(/(\.\d*[1-9])0+$/, '$1');

const formatThreeSignificantDigits = (value: number): string => {
  if (value >= 100) {
    return Math.floor(value).toString();
  }
  if (value >= 10) {
    return trimDecimals(value.toFixed(1));
  }
  return trimDecimals(value.toFixed(2));
};

export const formatCompactNumber = (value: number): string => {
  if (!Number.isFinite(value)) {
    return '0';
  }

  const sign = value < 0 ? '-' : '';
  const absoluteValue = Math.abs(value);
  if (absoluteValue < 1000) {
    return `${sign}${Math.floor(absoluteValue)}`;
  }

  const group = Math.min(102, Math.floor(Math.log10(absoluteValue) / 3));
  const scaledValue = absoluteValue / 1000 ** group;
  const roundedValue = Number(formatThreeSignificantDigits(scaledValue));
  if (roundedValue >= 1000) {
    return `${sign}1${getThousandSuffix(group + 1)}`;
  }

  return `${sign}${formatThreeSignificantDigits(scaledValue)}${getThousandSuffix(group)}`;
};

export const formatMoney = (value: number): string =>
  `$${formatCompactNumber(value)}`;
