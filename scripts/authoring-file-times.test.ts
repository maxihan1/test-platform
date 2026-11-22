// 내용때 검사 — 내용이 그대로면 처음 본 때 · 바뀌면 수정 시각 · 표가 깨지거나 폴더가 없으면 수정 시각 · 남의 줄은 남긴다 (도메인/작성 §7 「이어하기」)
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 내용때, 내용때표 } from './authoring-file-times.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
});

function 폴더(): string {
  const d = mkdtempSync(join(tmpdir(), 'file-times-'));
  자리들.push(d);
  return d;
}

describe('내용때 — 고친 때는 내용이 바뀐 때다', () => {
  it('내용이 그대로면 수정 시각이 올라도 처음 본 때를 주고, 내용이 바뀌면 그때의 수정 시각을 준다', () => {
    const d = 폴더();
    expect(내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'a', 때: 100 }]).get('g/A.spec.ts')).toBe(100);
    expect(내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'a', 때: 300 }]).get('g/A.spec.ts')).toBe(100);
    expect(내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'b', 때: 400 }]).get('g/A.spec.ts')).toBe(400);
    expect(readdirSync(d)).toEqual([내용때표]);
  });

  it('깨진 표는 빈 표로 보고 수정 시각을 주며, 이번에 안 본 남의 줄은 남긴다', () => {
    const d = 폴더();
    writeFileSync(join(d, 내용때표), '{깨짐');
    expect(내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'a', 때: 100 }]).get('g/A.spec.ts')).toBe(100);
    writeFileSync(join(d, 내용때표), JSON.stringify({ 'g/B.spec.ts': ['해시', 50], 'g/C.spec.ts': '꼴 아님' }));
    내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'a', 때: 200 }]);
    const 표 = JSON.parse(readFileSync(join(d, 내용때표), 'utf8')) as Record<string, unknown>;
    expect(표['g/B.spec.ts']).toEqual(['해시', 50]);
    expect(표['g/A.spec.ts']).toEqual([expect.any(String), 200]);
    expect(표['g/C.spec.ts']).toBeUndefined();
  });

  it('결과 폴더가 없으면 던지지 않고 수정 시각을 준다', () => {
    const d = join(폴더(), '없음');
    expect(내용때(d, [{ 경로: 'g/A.spec.ts', 글: 'a', 때: 100 }]).get('g/A.spec.ts')).toBe(100);
    mkdirSync(d);
    expect(readdirSync(d)).toEqual([]);
  });
});
