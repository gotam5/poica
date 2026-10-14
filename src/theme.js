import { useColorScheme } from 'react-native';

export const CARD_COLORS = ['#0A7552', '#2F5BD3', '#C2412D', '#B8740A', '#7A3FC4', '#0F7F93', '#C23C7A', '#3D4A55'];

// Glass look: surfaces are translucent over the soft glows of Backdrop.js; surfaceSolid where something must stay opaque.
const light = {
  dark: false,
  bg: '#EEF2F0', surface: 'rgba(255,255,255,0.62)', surfaceSolid: '#FFFFFF', ink: '#15211C', muted: '#5B6B64', line: 'rgba(21,33,28,0.10)',
  accent: '#0A7552', accentInk: '#FFFFFF', near: '#D9452B', nearBg: 'rgba(253,232,227,0.85)', chip: 'rgba(21,33,28,0.06)',
  glassEdge: 'rgba(255,255,255,0.75)', track: 'rgba(21,33,28,0.16)', shadow: 'rgba(16,40,30,0.10)',
};
const dark = {
  dark: true,
  bg: '#0C1210', surface: 'rgba(38,50,45,0.55)', surfaceSolid: '#18221E', ink: '#E6EEE9', muted: '#98AAA1', line: 'rgba(255,255,255,0.09)',
  accent: '#3FC597', accentInk: '#062218', near: '#FF8A73', nearBg: 'rgba(58,29,23,0.85)', chip: 'rgba(255,255,255,0.07)',
  glassEdge: 'rgba(255,255,255,0.14)', track: 'rgba(255,255,255,0.18)', shadow: 'rgba(0,0,0,0.35)',
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
