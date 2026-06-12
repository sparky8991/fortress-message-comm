export const BURN_AFTER_READ_SECONDS = 120;

export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value === 'string' || typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  return null;
};

export const getBurnTimeLeftSeconds = (expiresAt, now = new Date()) => {
  const expiresAtDate = toDate(expiresAt);
  if (!expiresAtDate) return null;

  return Math.max(0, Math.ceil((expiresAtDate.getTime() - now.getTime()) / 1000));
};

export const isBurnExpired = (expiresAt, now = new Date()) => {
  const secondsLeft = getBurnTimeLeftSeconds(expiresAt, now);
  return secondsLeft !== null && secondsLeft <= 0;
};

export const isBurnUnread = (metadata) =>
  metadata?.burnAfterRead === true && !toDate(metadata.burnOpenedAt);

export const isBurnAfterRead = (metadata) => metadata?.burnAfterRead === true;
