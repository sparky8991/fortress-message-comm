export const FORTRESS = {
  bg: '#070B09',
  surface: '#0C120F',
  surfaceRaised: '#101814',
  surfaceSunken: '#0F1612',
  border: '#1C2B22',
  borderFaint: '#141E18',
  borderGreen: '#1E5C3C',
  text: '#DCEAE1',
  textBright: '#ECF7F0',
  textDim: '#76897D',
  textFaint: '#4A5A50',
  textMuted: '#5C6E63',
  green: '#36E27B',
  greenSoft: '#7BEFA9',
  amber: '#F2B43C',
  amberBorder: '#6B4E16',
  orange: '#F2792B',
  red: '#FF6B61',
  redBorder: '#5C2420',
} as const;

export const FORTRESS_VERSION = 'v3.5';
export const FORTRESS_BUILD = '0615Z';

export const alpha = (hex: string, opacity: number): string => {
  const value = parseInt(hex.replace(/#/g, ''), 16);
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${opacity})`;
};

export type TrafficMark = 'normal' | 'sensitive' | 'locked';

export interface MarkMeta {
  label: string;
  accent: string;
  tipTitle: string;
  tipBody: string;
  onClass: string;
}

export const MARK_META: Record<TrafficMark, MarkMeta> = {
  normal: {
    label: 'UNCLASS',
    accent: FORTRESS.green,
    tipTitle: 'Unclassified mark',
    tipBody: 'Routine protected traffic. No special handling beyond the encrypted channel.',
    onClass: 'border-green-400/70 bg-green-500/15 text-green-300',
  },
  sensitive: {
    label: 'CONF',
    accent: FORTRESS.amber,
    tipTitle: 'Confidential mark',
    tipBody: 'Need-to-know traffic. Adds an amber handling mark inside the conversation.',
    onClass: 'border-amber-400/70 bg-amber-400/15 text-amber-300',
  },
  locked: {
    label: 'SECRET',
    accent: FORTRESS.red,
    tipTitle: 'Secret payload',
    tipBody: 'Opens the key-locked payload flow and creates a separate decryption key.',
    onClass: 'border-red-400/70 bg-red-500/15 text-red-300',
  },
};

export const MARK_IDLE_CLASS =
  'border-green-500/20 text-green-500/45 hover:border-green-500/40 hover:text-green-300';

export const AUTO_DELETE_WINDOWS: { hours: number; label: string }[] = [
  { hours: 1, label: '1H' },
  { hours: 24, label: '24H' },
  { hours: 168, label: '7D' },
  { hours: 720, label: '30D' },
];

export const ACCENT_SWATCHES = [
  '#36E27B',
  '#4D8DF7',
  '#A06BF5',
  '#F25C9B',
  '#F2792B',
  '#2BC8DD',
  '#F2554B',
  '#E8C13A',
];

export const BG_PRESETS = ['#070B09', '#0A0A0D', '#0C1220', '#150A1C', '#0A1A10'];
