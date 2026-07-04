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
