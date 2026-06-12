export type BurnAfterReadMetadata = Record<string, unknown> & {
  burnAfterRead?: boolean;
  burnAfterReadSeconds?: number;
  burnOpenedAt?: Date | string | number | { toDate: () => Date } | null;
  burnExpiresAt?: Date | string | number | { toDate: () => Date } | null;
  burnOpenedBy?: string | null;
};

export const BURN_AFTER_READ_SECONDS: 120;
export const toDate: (value: unknown) => Date | null;
export const getBurnTimeLeftSeconds: (expiresAt: unknown, now?: Date) => number | null;
export const isBurnExpired: (expiresAt: unknown, now?: Date) => boolean;
export const isBurnUnread: (metadata?: BurnAfterReadMetadata | null) => boolean;
export const isBurnAfterRead: (metadata?: BurnAfterReadMetadata | null) => boolean;
