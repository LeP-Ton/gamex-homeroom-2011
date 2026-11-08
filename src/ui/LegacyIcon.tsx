import { useId } from 'react';
import type { LegacyIconName } from '../config/desktop';

// 用矢量重新绘制当年的彩色桌面图标，保持不同尺寸下的清晰度。
export function LegacyIcon({ name, size = 32 }: { name: LegacyIconName; size?: number }) {
  const id = useId().replaceAll(':', '');
  const paint = (key: string) => `url(#${id}-${key})`;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      className={`legacy-icon legacy-${name}`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`${id}-blue`} x2=".3" y2="1">
          <stop stopColor="#a8e2ff" />
          <stop offset=".45" stopColor="#3a8edf" />
          <stop offset="1" stopColor="#164ba1" />
        </linearGradient>
        <linearGradient id={`${id}-gray`} x2=".6" y2="1">
          <stop stopColor="#fff" />
          <stop offset=".55" stopColor="#cad7df" />
          <stop offset="1" stopColor="#718297" />
        </linearGradient>
        <linearGradient id={`${id}-gold`} x2=".2" y2="1">
          <stop stopColor="#fff6b1" />
          <stop offset=".5" stopColor="#f5cf51" />
          <stop offset="1" stopColor="#cf8a16" />
        </linearGradient>
        <linearGradient id={`${id}-green`} x2="1" y2="1">
          <stop stopColor="#9dd59c" />
          <stop offset=".4" stopColor="#398447" />
          <stop offset="1" stopColor="#145528" />
        </linearGradient>
        <linearGradient id={`${id}-red`} x2=".3" y2="1">
          <stop stopColor="#ffb67b" />
          <stop offset="1" stopColor="#ce3221" />
        </linearGradient>
      </defs>
      {name === 'computer' && (
        <>
          <path d="M7 7 36 5 39 31 8 34Z" fill={paint('gray')} stroke="#526276" />
          <path d="m11 11 21-1 1 16-21 2Z" fill={paint('blue')} stroke="#33495e" />
          <path d="M19 33v5l-7 3h23l-7-4v-5" fill={paint('gray')} stroke="#69778a" />
          <path d="m33 15 10 3v24l-9-3Z" fill={paint('gray')} stroke="#758598" />
          <path d="m36 23 5 1m-5 4 5 1m-5 4 5 1" stroke="#748697" />
          <circle cx="38" cy="37" r="1.2" fill="#73d844" />
        </>
      )}
      {name === 'folder' && (
        <>
          <path d="M4 11h16l4 5h19v24H5Z" fill={paint('gold')} stroke="#bd8a23" />
          <path d="m5 21 40-3-5 24H5Z" fill={paint('gold')} stroke="#b68730" />
          <path d="m8 24 34-3" stroke="#fff4aa" />
        </>
      )}
      {name === 'recycle' && (
        <>
          <path d="m12 12 25 2-4 29-18-1Z" fill={paint('gray')} stroke="#7892a4" />
          <ellipse cx="25" cy="13" rx="14" ry="5" fill="#dceaf3" stroke="#7b9bae" />
          <ellipse cx="25" cy="13" rx="10" ry="2" fill="#758c9e" />
          <path
            d="m24 21-4 7 3 1m-4-2 1 8h7m-3 2 6-5-3-2m5 0-5-8"
            fill="none"
            stroke="#50a253"
            strokeWidth="3"
          />
        </>
      )}
      {name === 'ie' && (
        <>
          <circle cx="25" cy="25" r="17" fill={paint('blue')} stroke="#1a5ea0" />
          <text
            x="11"
            y="37"
            fontFamily="Georgia,serif"
            fontStyle="italic"
            fontWeight="bold"
            fontSize="42"
            fill="#e8f8ff"
          >
            e
          </text>
          <ellipse
            cx="24"
            cy="24"
            rx="24"
            ry="8"
            transform="rotate(-32 24 24)"
            fill="none"
            stroke="#f2c942"
            strokeWidth="4"
          />
        </>
      )}
      {(name === 'word' || name === 'excel') && (
        <>
          <path d="M16 4h23l6 7v31H16Z" fill="#fffef9" stroke="#7e8a9b" />
          <path d="M38 4v9h7" fill="#c7dbed" stroke="#7e8a9b" />
          {name === 'excel' ? (
            <>
              <path
                d="M22 17h18v20H22Z M22 23h18m-18 7h18m-12-13v20m6-20v20"
                stroke="#97b39c"
                fill="none"
              />
              <path d="m3 10 23-4v37L3 38Z" fill={paint('green')} stroke="#24532e" />
              <text
                x="5"
                y="32"
                fill="white"
                fontFamily="Georgia,serif"
                fontWeight="bold"
                fontSize="25"
              >
                X
              </text>
            </>
          ) : (
            <>
              <path d="M23 21h17m-17 5h17m-17 5h15m-15 5h17" stroke="#87a1c1" strokeWidth="2" />
              <path d="m3 10 23-4v37L3 38Z" fill={paint('blue')} stroke="#25589b" />
              <text
                x="4"
                y="32"
                fill="white"
                fontFamily="Georgia,serif"
                fontWeight="bold"
                fontSize="23"
              >
                W
              </text>
            </>
          )}
        </>
      )}
      {name === 'qq' && (
        <>
          <ellipse cx="24" cy="43" rx="16" ry="3" fill="#59647844" />
          <path d="m13 36-6 6 15-1m12-5 7 6-15-1" fill={paint('gold')} stroke="#b17b19" />
          <path
            d="M12 23c0-11 4-20 12-20s12 9 12 20c6 8 5 13 1 12l-3-4c1 9-21 10-21 0l-3 5c-4 0-3-6 2-13Z"
            fill="#252a31"
            stroke="#10161e"
          />
          <ellipse cx="24" cy="28" rx="10" ry="12" fill="#fffdf3" />
          <ellipse cx="20" cy="13" rx="3" ry="4.5" fill="#fff" />
          <ellipse cx="28" cy="13" rx="3" ry="4.5" fill="#fff" />
          <circle cx="21" cy="14" r="1" />
          <circle cx="27" cy="14" r="1" />
          <path d="m18 19 6-3 7 3-7 3Z" fill="#edb638" />
          <path d="m12 23 26 1-3 5-21-1m13 0v8l5-2-1-6" fill={paint('red')} stroke="#af3120" />
        </>
      )}
      {name === 'school' && (
        <>
          <path d="M8 13h32v29H8Z" fill={paint('gray')} stroke="#556a84" />
          <path d="M5 14 24 3l20 11Z" fill={paint('blue')} stroke="#284d82" />
          <path d="M11 23h6m5 0h6m5 0h5m-27 9h6m16 0h5" stroke="#4d7ba7" strokeWidth="4" />
          <path d="M21 31h8v11h-8Z" fill="#536c89" />
          <circle cx="24" cy="12" r="3" fill="#f5db66" />
        </>
      )}
      {name === 'calendar' && (
        <>
          <path d="M6 9h36v33H6Z" fill="#f9faf8" stroke="#748999" />
          <path d="M6 9h36v10H6Z" fill={paint('red')} />
          <path d="M14 5v9m20-9v9" stroke="#556477" strokeWidth="3" />
          <text x="12" y="36" fill="#244d7c" fontFamily="Arial" fontSize="18" fontWeight="bold">
            28
          </text>
        </>
      )}
      {name === 'notepad' && (
        <>
          <path d="m12 4 29 4-4 36-29-4Z" fill={paint('gray')} stroke="#6e8798" />
          <path d="m13 9 22 3-3 25-21-3Z" fill="#fffef6" />
          <path d="m14 15 17 2m-18 4 17 2m-17 4 17 2m-18 4 17 2" stroke="#7ea0b5" />
          <path d="m29 35 11-24 4 3-11 23-5 3Z" fill={paint('gold')} stroke="#95621e" />
        </>
      )}
      {name === 'save' && (
        <>
          <path d="M7 5h31l5 5v33H7Z" fill={paint('blue')} stroke="#29597d" />
          <path d="M14 5h21v13H14Z" fill={paint('gray')} />
          <path d="M13 27h23v16H13Z" fill="#fffdf4" stroke="#667d95" />
          <path d="M28 7h4v9h-4Z" fill="#365d82" />
        </>
      )}
      {name === 'help' && (
        <>
          <circle cx="24" cy="24" r="20" fill={paint('blue')} stroke="#2e5785" />
          <text x="13" y="37" fontSize="36" fontFamily="Arial" fill="#fff" fontWeight="bold">
            ?
          </text>
        </>
      )}
      {name === 'shutdown' && (
        <>
          <rect x="5" y="5" width="38" height="38" rx="7" fill={paint('red')} stroke="#a53b2d" />
          <path d="M17 15a13 13 0 1 0 14 0M24 9v16" fill="none" stroke="white" strokeWidth="4" />
        </>
      )}
    </svg>
  );
}
export function WindowsFlag({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <path d="m3 5 10-2v10L2 14Z" fill="#f15e2f" />
      <path d="m15 3 11 2-1 10-10-2Z" fill="#7fc441" />
      <path d="m2 16 11-1v10L3 23Z" fill="#389fe4" />
      <path d="m15 15 10 2-1 9-9-1Z" fill="#f8ce39" />
    </svg>
  );
}
