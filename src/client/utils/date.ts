const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const getOrdinalSuffix = (day: number): string => {
  const lastTwo = day % 100;
  if (lastTwo >= 11 && lastTwo <= 13) return 'th';

  switch (day % 10) {
    case 1:
      return 'st';
    case 2:
      return 'nd';
    case 3:
      return 'rd';
    default:
      return 'th';
  }
};

const formatParts = (year: number, monthIndex: number, day: number): string => {
  const month = MONTH_NAMES[monthIndex] ?? 'Unknown';
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
};

export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '';

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return formatParts(Number(year), Number(month) - 1, Number(day));
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return formatParts(date.getFullYear(), date.getMonth(), date.getDate());
};
