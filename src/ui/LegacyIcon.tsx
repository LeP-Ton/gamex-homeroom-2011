import { NATIVE_ICONS, nativeIconSize, type LegacyIconName } from '../config/icons';

const bitmaps = import.meta.glob<string>('../assets/xp-icons/*.png', {
  eager: true,
  query: '?url',
  import: 'default',
});

function iconFrame(name: LegacyIconName, size: number) {
  const frames = NATIVE_ICONS[name].frames;
  // ICO的小图由原作者逐像素调整过；优先精确尺寸，再选最接近的原始帧。
  return frames.reduce((best, frame) => {
    const cost = Math.abs(frame.width - size);
    const bestCost = Math.abs(best.width - size);
    return cost < bestCost || (cost === bestCost && frame.width > best.width) ? frame : best;
  });
}

function bitmapUrl(file: string) {
  return bitmaps['../assets/xp-icons/' + file];
}

export function LegacyIcon({
  name,
  size = 32,
  shortcut = false,
  className = '',
  'aria-label': label,
}: {
  name: LegacyIconName;
  size?: number;
  shortcut?: boolean;
  className?: string;
  'aria-label'?: string;
}) {
  const pixels = nativeIconSize(size);
  const frame = iconFrame(name, pixels);
  const icon = (
    <img
      src={bitmapUrl(frame.file)}
      width={pixels}
      height={Math.round((pixels * frame.height) / frame.width)}
      className={
        'legacy-icon native-icon legacy-' +
        name +
        (frame.width < pixels ? ' native-upscaled ' : ' ') +
        className
      }
      data-icon={name}
      data-source-size={frame.width + 'x' + frame.height}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      draggable={false}
    />
  );
  if (!shortcut) return icon;
  return (
    <span className="xp-shortcut-icon" style={{ width: pixels, height: pixels }}>
      {icon}
      <img
        src={bitmapUrl(iconFrame('shortcut', 16).file)}
        className="xp-shortcut-overlay"
        width={16}
        height={16}
        alt=""
        aria-hidden="true"
        draggable={false}
      />
    </span>
  );
}

export function WindowsFlag({ size = 22 }: { size?: number }) {
  const frame = iconFrame('windows-logo', size);
  return (
    <img
      src={bitmapUrl(frame.file)}
      className="windows-flag"
      width={size}
      height={Math.round((size * frame.height) / frame.width)}
      alt=""
      aria-hidden="true"
      draggable={false}
    />
  );
}

// 窗口按钮和菜单三角是经典控件字形，不属于彩色应用图标。
export function ClassicGlyph({
  name,
  size = 12,
}: {
  name:
    | 'close'
    | 'minimize'
    | 'maximize'
    | 'restore'
    | 'left'
    | 'right'
    | 'up'
    | 'down'
    | 'sort'
    | 'plus'
    | 'grip'
    | 'external';
  size?: number;
}) {
  return (
    <span
      className={'classic-glyph glyph-' + name}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
