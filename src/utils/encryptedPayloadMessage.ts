export type EncryptedPayloadMetadata = Record<string, unknown> & {
  originalName?: string;
  shareCode?: string;
};

export const buildEncryptedPayloadMessage = (metadata?: EncryptedPayloadMetadata | null) => {
  const fileName = typeof metadata?.originalName === 'string' ? metadata.originalName : 'secure image';

  return [
    'ENCRYPTED PAYLOAD DEPLOYED',
    '',
    `Payload: ${fileName}`,
    'Share the decryption key separately with authorized personnel only.'
  ].join('\n');
};

export const stripEncryptedPayloadSecrets = <T extends Record<string, unknown> | null | undefined>(metadata: T) => {
  if (!metadata) return metadata;

  const { shareCode, ...safeMetadata } = metadata;
  return safeMetadata;
};
