import { useColorScheme } from 'react-native';

export const CARD_COLORS = ['#0A7552', '#2F5BD3', '#C2412D', '#B8740A', '#7A3FC4', '#0F7F93', '#C23C7A', '#3D4A55'];

const light = {
  bg: '#EDF1EE', surface: '#FFFFFF', ink: '#15211C', muted: '#5B6B64', line: '#D3DDD8',
  accent: '#0A7552', accentInk: '#FFFFFF', near: '#D9452B', nearBg: '#FDE8E3', chip: '#E2EBE6',
};
const dark = {
  bg: '#0F1613', surface: '#18221E', ink: '#E6EEE9', muted: '#98AAA1', line: '#2A3832',
  accent: '#3FC597', accentInk: '#062218', near: '#FF8A73', nearBg: '#3A1D17', chip: '#22302A',
};

export function useTheme() {
  return useColorScheme() === 'dark' ? dark : light;
}

export const KIND_LABEL = { barcode: 'バーコード・写真', photo: 'バーコード・写真', app: '公式アプリ' };

// Preset 2-4 color palettes for cards the user makes. The first color is the background (white text sits on it).
export const PALETTES = [
  ['#0A7552', '#F2C14E', '#FFFFFF'],
  ['#2F5BD3', '#FFFFFF', '#F25C54'],
  ['#C2412D', '#FFD166', '#FFFFFF'],
  ['#B8740A', '#3D2B1F', '#FFFFFF'],
  ['#7A3FC4', '#FF9FD2', '#FFFFFF'],
  ['#0F7F93', '#A8E6CF', '#FFFFFF'],
  ['#C23C7A', '#FFFFFF'],
  ['#3D4A55', '#E9C46A', '#E76F51', '#FFFFFF'],
];


// Tag colors for 「ポイントカード」 and 「支払い」, readable on any card color.
export const TYPE_COLORS = {
  point: { bg: '#FFF3DC', fg: '#8A5A00' },
  pay: { bg: '#E6EEFC', fg: '#24509E' },
};
