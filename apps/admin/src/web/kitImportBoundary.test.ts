// 화면 묶음이 kit 맨 앞 입구에서 값을 읽지 않는지 본다 — 그 입구는 runtime(Playwright)까지 다시 내보내 vite build 가 깨진다
import { describe, expect, it } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const 화면폴더 = dirname(fileURLToPath(import.meta.url));
const 구문 = /^\s*(import|export)\s+(type\s+)?([^;]*?)\s+from\s+'([^']+)'/gm;

function 파일로(출발: string, 경로: string): string | null {
  const 맨 = resolve(dirname(출발), 경로).replace(/\.js$/, '');
  for (const 끝 of ['.ts', '.tsx', '/index.ts']) if (existsSync(맨 + 끝)) return 맨 + 끝;
  return null;
}

// 값을 하나라도 읽으면 true — `import type` 과 `{ type A, type B }` 처럼 전부 type 인 것은 빌드에서 지워진다
function 값을읽나(type머리: string | undefined, 몸: string): boolean {
  if (type머리 !== undefined) return false;
  const 묶음 = 몸.match(/\{([\s\S]*)\}/);
  if (묶음 === null) return true;
  const 이름들 = 묶음[1].split(',').map((s) => s.trim()).filter(Boolean);
  return 이름들.some((n) => !n.startsWith('type '));
}

function 화면에서닿는파일(): string[] {
  const 시작 = readdirSync(화면폴더)
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f))
    .map((f) => join(화면폴더, f));
  const 본것 = new Set<string>();
  const 할것 = [...시작];
  while (할것.length > 0) {
    const f = 할것.pop()!;
    if (본것.has(f)) continue;
    본것.add(f);
    for (const m of readFileSync(f, 'utf8').matchAll(구문)) {
      if (m[2] !== undefined || !m[4].startsWith('.')) continue;
      const 다음 = 파일로(f, m[4]);
      if (다음 !== null && !본것.has(다음)) 할것.push(다음);
    }
  }
  return [...본것];
}

describe('화면 묶음의 kit import', () => {
  it('화면에서 닿는 파일은 @platform/kit 맨 앞 입구에서 값을 읽지 않는다 — 값은 @platform/kit/types 처럼 브라우저용 입구에서 읽는다', () => {
    const 어긴곳 = 화면에서닿는파일().flatMap((f) =>
      [...readFileSync(f, 'utf8').matchAll(구문)]
        .filter((m) => m[4] === '@platform/kit' && 값을읽나(m[2], m[3]))
        .map(() => f.slice(f.indexOf('apps/'))),
    );
    expect(어긴곳).toEqual([]);
  });
});
