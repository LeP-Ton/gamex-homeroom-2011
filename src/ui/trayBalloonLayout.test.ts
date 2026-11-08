import { describe, expect, it } from 'vitest';
import { BALLOON_TAIL_HEIGHT, BALLOON_TASKBAR_GAP, placeTrayBalloon } from './trayBalloonLayout';

describe('托盘气泡边界', () => {
  it.each([
    {
      viewportWidth: 1366,
      viewportHeight: 768,
      panelWidth: 330,
      anchorCenterX: 1280,
      taskbarTop: 737,
    },
    {
      viewportWidth: 320,
      viewportHeight: 480,
      panelWidth: 304,
      anchorCenterX: 273,
      taskbarTop: 449,
    },
    {
      viewportWidth: 640,
      viewportHeight: 240,
      panelWidth: 330,
      anchorCenterX: 580,
      taskbarTop: 209,
    },
  ])('宽度$viewportWidth高度$viewportHeight时尖角和气泡不进入任务栏', (input) => {
    const result = placeTrayBalloon(input);
    const bodyBottom = input.viewportHeight - result.bottom;
    expect(bodyBottom + BALLOON_TAIL_HEIGHT).toBeLessThanOrEqual(
      input.taskbarTop - BALLOON_TASKBAR_GAP,
    );
    expect(bodyBottom - result.maxHeight).toBeGreaterThanOrEqual(8);
    expect(result.left).toBeGreaterThanOrEqual(8);
    expect(result.left + input.panelWidth).toBeLessThanOrEqual(input.viewportWidth - 8);
  });

  it('指针精确对齐真实托盘入口中心', () => {
    const result = placeTrayBalloon({
      viewportWidth: 1280,
      viewportHeight: 720,
      panelWidth: 330,
      anchorCenterX: 1190,
      taskbarTop: 689,
    });
    expect(result.left + result.tailX).toBe(1190);
  });

  it('高DPI下的分数坐标和边框不会使指针偏移', () => {
    const anchorCenterX = 1190.4;
    const borderWidth = 0.8;
    const result = placeTrayBalloon({
      viewportWidth: 1280.8,
      viewportHeight: 720.8,
      panelWidth: 330,
      anchorCenterX,
      taskbarTop: 689.6,
      borderWidth,
    });
    expect(result.left + borderWidth + result.tailX).toBeCloseTo(anchorCenterX, 8);
  });
});
