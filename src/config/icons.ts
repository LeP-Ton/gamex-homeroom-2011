import manifest from '../assets/xp-icons/manifest.json';

export const NATIVE_ICONS = manifest.icons;
export type LegacyIconName = keyof typeof NATIVE_ICONS;

export function nativeIconSize(size: number) {
  return size <= 24 ? 16 : size <= 40 ? 32 : 48;
}
