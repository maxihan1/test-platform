// 화면 묶음이 kit 의 runtime 쪽 입구에서 값을 읽지 않는지 본다 — 그 입구들은 Playwright 까지 끌어와 vite build 가 깨진다
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const 화면폴더 = dirname(fileURLToPath(import.meta.url));
const 저장소 = resolve(화면폴더, '../../../..');
// 다른 파일을 읽지 않는 입구만 — 맨 앞 입구 · /runtime · /app · /game · /scenario · /parts 는 runtime 을 다시 내보낸다
const 브라우저입구 = new Set(['@platform/kit/types', '@platform/kit/accounts', '@platform/kit/protocol']);
const 묶어읽기 = /^\s*(import|export)\s+(type\s+)?([^;]*?)\s+from\s+(['"])([^'"]+)\4/gm;
const 그냥읽기 = /\bimport\s*\(?\s*(['"])([^'"]+)\1/g;

type 읽기 = { 경로: string; 값: boolean };

// 값을 하나라도 읽으면 true — `import type` 과 `{ type A, type B }` 처럼 전부 type 인 것은 빌드에서 지워진다
function 값을읽나(type머리: string | undefined, 몸: string): boolean {
  if (type머리 !== undefined) return false;
  const 묶음 = 몸.match(/^\s*([^{]*?)\s*,?\s*\{([\s\S]*)\}\s*$/);
  if (묶음 === null) return true;
  if (묶음[1] !== '') return true;
  return 묶음[2].split(',').map((s) => s.trim()).filter(Boolean).some((n) => !n.startsWith('type '));
}

function 읽는것(글: string): 읽기[] {
  return [
    ...[...글.matchAll(묶어읽기)].map((m) => ({ 경로: m[5], 값: 값을읽나(m[2], m[3]) })),
    ...[...글.matchAll(그냥읽기)].map((m) => ({ 경로: m[2], 값: true })),
  ];
}

function 파일로(출발: string, 경로: string): string | null {
  const 맨 = resolve(dirname(출발), 경로).replace(/\.js$/, '');
  for (const 끝 of ['.ts', '.tsx', '/index.ts']) if (existsSync(맨 + 끝)) return 맨 + 끝;
  return null;
}

function 화면에서닿는파일(): string[] {
  const 할것 = readdirSync(화면폴더)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(화면폴더, f));
  const 본것 = new Set<string>();
  while (할것.length > 0) {
    const f = 할것.pop()!;
    if (본것.has(f)) continue;
    본것.add(f);
    for (const r of 읽는것(readFileSync(f, 'utf8'))) {
      if (!r.값 || !r.경로.startsWith('.')) continue;
      const 다음 = 파일로(f, r.경로);
      if (다음 !== null && !본것.has(다음)) 할것.push(다음);
    }
  }
  return [...본것];
}

describe('화면 묶음의 kit import', () => {
  it('화면에서 닿는 파일은 kit 의 runtime 쪽 입구에서 값을 읽지 않는다 — 값은 @platform/kit/types · accounts · protocol 에서 읽는다', () => {
    const 어긴곳 = 화면에서닿는파일().flatMap((f) =>
      읽는것(readFileSync(f, 'utf8'))
        .filter((r) => r.값 && r.경로.startsWith('@platform/kit') && !브라우저입구.has(r.경로))
        .map((r) => `${relative(저장소, f)} ← ${r.경로}`),
    );
    expect(어긴곳).toEqual([]);
  });

  it('값을읽나 — type 만 읽는 꼴은 빼고 기본값 · 섞인 꼴은 값으로 본다', () => {
    expect(값을읽나('type ', '{ Platform }')).toBe(false);
    expect(값을읽나(undefined, '{ type A, type B }')).toBe(false);
    expect(값을읽나(undefined, '{ type A, B }')).toBe(true);
    expect(값을읽나(undefined, 'kit, { type A }')).toBe(true);
    expect(값을읽나(undefined, '* as kit')).toBe(true);
  });
});
