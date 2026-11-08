import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import type { LegacyIconName } from '../config/icons';
import { ClassicGlyph, LegacyIcon } from './LegacyIcon';
import { placeTrayBalloon } from './trayBalloonLayout';

export function TrayBalloon({
  id,
  title,
  icon,
  anchor,
  taskbar,
  close,
  closeLabel,
  children,
  className = '',
  role = 'status',
}: {
  id?: string;
  title: string;
  icon: LegacyIconName;
  anchor: RefObject<HTMLButtonElement | null>;
  taskbar: RefObject<HTMLElement | null>;
  close: () => void;
  closeLabel: string;
  children: ReactNode;
  className?: string;
  role?: 'status' | 'dialog';
}) {
  const titleId = useId();
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<ReturnType<typeof placeTrayBalloon>>();

  useLayoutEffect(() => {
    const update = () => {
      if (!panel.current || !anchor.current || !taskbar.current) return;
      const trigger = anchor.current.getBoundingClientRect();
      const next = placeTrayBalloon({
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        panelWidth: panel.current.getBoundingClientRect().width,
        anchorCenterX: trigger.left + trigger.width / 2,
        taskbarTop: taskbar.current.getBoundingClientRect().top,
        borderWidth: parseFloat(getComputedStyle(panel.current).borderLeftWidth),
      });
      setPosition((previous) =>
        previous &&
        Object.keys(next).every(
          (key) => previous[key as keyof typeof next] === next[key as keyof typeof next],
        )
          ? previous
          : next,
      );
    };
    update();
    const observer = new ResizeObserver(update);
    if (panel.current) observer.observe(panel.current);
    if (anchor.current) observer.observe(anchor.current);
    if (taskbar.current) observer.observe(taskbar.current);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [anchor, taskbar]);

  useEffect(() => {
    if (role !== 'dialog') return;
    const dismiss = (event: PointerEvent) => {
      const target = event.target;
      if (
        target instanceof Node &&
        !panel.current?.contains(target) &&
        !anchor.current?.contains(target)
      )
        close();
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [anchor, close, role]);

  return (
    <div
      id={id}
      ref={panel}
      className={'tray-balloon ' + className}
      role={role}
      aria-labelledby={titleId}
      aria-live={role === 'status' ? 'polite' : undefined}
      aria-atomic={role === 'status' ? true : undefined}
      style={
        position
          ? ({
              left: position.left,
              right: 'auto',
              bottom: position.bottom,
              maxHeight: position.maxHeight,
              '--balloon-tail-x': position.tailX + 'px',
            } as CSSProperties)
          : undefined
      }
    >
      <header className="tray-balloon-header">
        <LegacyIcon name={icon} size={16} />
        <strong id={titleId}>{title}</strong>
        <button aria-label={closeLabel} onClick={close}>
          <ClassicGlyph name="close" size={12} />
        </button>
      </header>
      <div className="tray-balloon-body">{children}</div>
      <span className="tray-balloon-tail" aria-hidden="true" />
    </div>
  );
}
