export const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));
export const mean = (values: number[]) =>
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
export const round = (value: number, digits = 1) => Number(value.toFixed(digits));

export function hashSeed(seed: string): number {
  let hash = 2166136261;
  for (const char of seed) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0 || 1;
}

// 随机状态保存在游戏里；任何模拟随机调用都必须使用此对象。
export class Random {
  constructor(public state: number) {}
  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number) {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(values: readonly T[]): T {
    return values[this.int(0, values.length - 1)];
  }
  bell() {
    return (this.next() + this.next() + this.next()) / 3;
  }
  weighted<T>(items: { value: T; weight: number }[]): T {
    let roll = this.range(
      0,
      items.reduce((sum, item) => sum + Math.max(0, item.weight), 0),
    );
    for (const item of items) {
      roll -= Math.max(0, item.weight);
      if (roll <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }
}
