import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const root = fileURLToPath(new URL('../src/assets/xp-icons/', import.meta.url));
const manifest = JSON.parse(
  (await fs.readFile(path.join(root, 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''),
);
const files = new Set();
let frames = 0;
// 桌面Office图标必须具有真正的32像素帧，不能退回16像素后放大。
for (const app of ['word', 'excel']) {
  for (const size of [16, 32, 48]) {
    assert.ok(
      manifest.icons[app].frames.some((frame) => frame.width === size && frame.height === size),
      app + '缺少' + size + '像素原始帧',
    );
  }
}
for (const [name, icon] of Object.entries(manifest.icons)) {
  assert.ok(icon.frames.length, name + '没有原始图像帧');
  for (const frame of icon.frames) {
    assert.equal(path.basename(frame.file), frame.file, '资源路径必须位于图标目录');
    const bytes = await fs.readFile(path.join(root, frame.file));
    assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', frame.file + '不是PNG');
    assert.equal(bytes.readUInt32BE(16), frame.width, frame.file + '宽度不符');
    assert.equal(bytes.readUInt32BE(20), frame.height, frame.file + '高度不符');
    assert.equal(
      createHash('sha256').update(bytes).digest('hex'),
      frame.sha256,
      frame.file + '内容与资源清单不符',
    );
    assert.ok(frame.source.startsWith('https://'), frame.file + '缺少来源');
    files.add(frame.file);
    frames++;
  }
}
for (const file of await fs.readdir(root)) {
  if (file.endsWith('.png')) assert.ok(files.has(file), file + '未登记到资源清单');
}
console.log(
  '原始图标校验通过：' +
    Object.keys(manifest.icons).length +
    '类，' +
    frames +
    '个图像帧，PNG尺寸与SHA-256全部匹配。',
);
