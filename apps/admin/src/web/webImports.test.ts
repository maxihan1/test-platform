// 화면 묶음이 kit 전체(Playwright · node 모듈)를 끌어들이지 않는지 import 를 따라가며 본다 — 끌려 들어가면 vite build 가 kerberos 를 못 찾아 멈춘다(GAME-F4-02 의 pcPlatform.ts)

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const 화면 = resolve(process.cwd(), 'apps/admin/src/web');
// 아무것도 import 하지 않는 낱 파일 입구(types · accounts · protocol)만 브라우저에서 돈다. 다른 입구는 runtime 이 따라온다
const 금지입구 = /^@platform\/kit(?:\/(?!(?:types|accounts|protocol)$).*)?$/;
const import문 = /^\s*(?:import|export)\s+([^'";]*?)\s+from\s+'([^']+)'/gm;

// 타입만 가져오는 import 는 묶을 때 지워진다 — `import type {…}` 와 이름이 전부 `type` 인 `{ type A, type B }`
function 타입만(앞: string): boolean {
  if (/^type\b/.test(앞)) return true;
  const 이름들 = /^\{([^}]*)\}$/.exec(앞.trim())?.[1]?.split(',').map((s) => s.trim()).filter(Boolean);
  return 이름들 !== undefined && 이름들.length > 0 && 이름들.every((s) => s.startsWith('type '));
}

function 값import(소스: string): string[] {
  return [...소스.matchAll(import문)].filter((m) => !타입만(m[1]!)).map((m) => m[2]!);
}

function 시작파일(): string[] {
  return readdirSync(화면).filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f)).map((f) => resolve(화면, f));
}

// .js 로 적은 import 를 실제 .ts · .tsx 로 찾는다
function 실제파일(from: string, 경로: string): string | null {
  const 바탕 = resolve(dirname(from), 경로).replace(/\.js$/, '');
  return ['.ts', '.tsx'].map((끝) => 바탕 + 끝).find((p) => existsSync(p)) ?? null;
}

function 따라간파일(): Set<string> {
  const 본 = new Set<string>();
  const 할것 = 시작파일();
  while (할것.length > 0) {
    const 파일 = 할것.pop()!;
    if (본.has(파일)) continue;
    본.add(파일);
    for (const 경로 of 값import(readFileSync(파일, 'utf8'))) {
      if (!경로.startsWith('.')) continue;
      const 다음 = 실제파일(파일, 경로);
      if (다음 !== null && !본.has(다음)) 할것.push(다음);
    }
  }
  return 본;
}

describe('화면 묶음의 kit import', () => {
  it('화면이 닿는 파일은 kit 값을 타입 입구에서만 가져온다', () => {
    const 파일들 = 따라간파일();
    expect(파일들.size).toBeGreaterThan(100);
    const 걸린것 = [...파일들].filter((p) => 값import(readFileSync(p, 'utf8')).some((경로) => 금지입구.test(경로))).map((p) => relative(process.cwd(), p));
    expect(걸린것).toEqual([]);
  });
});
