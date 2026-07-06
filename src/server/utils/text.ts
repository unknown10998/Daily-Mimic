export const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\u2028|\u2029/g, '')
    .trim();
};

const CENTRAL_TIME_ZONE = 'America/Chicago';

const getCentralDateParts = (date: Date) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: CENTRAL_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string): string => parts.find((part) => part.type === type)?.value ?? '01';
  return {
    year: getPart('year'),
    month: getPart('month'),
    day: getPart('day'),
  };
};

export const currentDateIso = (): string => {
  const { year, month, day } = getCentralDateParts(new Date());
  return `${year}-${month}-${day}`;
};

const getTimeZoneOffsetMs = (date: Date, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(date);

  const getPart = (type: string): number => Number(parts.find((part) => part.type === type)?.value ?? '0');
  const localAsUtc = Date.UTC(getPart('year'), getPart('month') - 1, getPart('day'), getPart('hour'), getPart('minute'), getPart('second'));
  return localAsUtc - date.getTime();
};

const centralLocalDateToUtcIso = (date: string): string => {
  const [year, month, day] = date.split('-').map(Number);
  let utcTime = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0);

  for (let index = 0; index < 3; index += 1) {
    const offset = getTimeZoneOffsetMs(new Date(utcTime), CENTRAL_TIME_ZONE);
    utcTime = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, 0, 0, 0) - offset;
  }

  return new Date(utcTime).toISOString();
};

export const nextUtcMidnightIso = (date = currentDateIso()): string => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return centralLocalDateToUtcIso(next.toISOString().slice(0, 10));
};
