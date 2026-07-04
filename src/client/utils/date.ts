export const formatDisplayDate = (value?: string | null): string => {
  if (!value) return '';

  const isoDateMatch = /^(\d{4})-(\d{2})-(\d{2})/u.exec(value);
  if (isoDateMatch) {
    const [, year, month, day] = isoDateMatch;
    return `${month}-${day}-${year}`;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  const year = `${date.getFullYear()}`;
  return `${month}-${day}-${year}`;
};
