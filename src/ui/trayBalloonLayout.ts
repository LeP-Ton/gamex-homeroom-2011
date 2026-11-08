export const BALLOON_TAIL_HEIGHT = 12;
export const BALLOON_TASKBAR_GAP = 4;
const SCREEN_MARGIN = 8;

export function placeTrayBalloon({
  viewportWidth,
  viewportHeight,
  panelWidth,
  anchorCenterX,
  taskbarTop,
  borderWidth = 0,
}: {
  viewportWidth: number;
  viewportHeight: number;
  panelWidth: number;
  anchorCenterX: number;
  taskbarTop: number;
  borderWidth?: number;
}) {
  const width = Math.min(panelWidth, Math.max(0, viewportWidth - SCREEN_MARGIN * 2));
  const left = Math.round(
    Math.max(
      SCREEN_MARGIN,
      Math.min(anchorCenterX - width + 32, viewportWidth - width - SCREEN_MARGIN),
    ),
  );
  return {
    left,
    // 把指针本身也计入高度，尖端与任务栏之间固定保留间隙。
    bottom: viewportHeight - taskbarTop + BALLOON_TAIL_HEIGHT + BALLOON_TASKBAR_GAP,
    tailX: Math.max(24, Math.min(anchorCenterX - left - borderWidth, width - 20)),
    maxHeight: Math.max(0, taskbarTop - BALLOON_TAIL_HEIGHT - BALLOON_TASKBAR_GAP - SCREEN_MARGIN),
  };
}
