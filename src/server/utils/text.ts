export const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/\u2028|\u2029/g, '')
    .trim();
};

export const currentDateIso = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};


export const nextUtcMidnightIso = (date = currentDateIso()): string => {
  const next = new Date(`${date}T00:00:00.000Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return next.toISOString();
};
