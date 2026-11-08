// 화면 문구가 docs/WORDS.md §1 「쓰지 않는 말」을 쓰지 않는지 본다
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { 표들 } from './messages.js';

const 정본 = join(dirname(fileURLToPath(import.meta.url)), '../../../../docs/WORDS.md');

// API 가 주는 값이라 바꾸지 않는다(CLAUDE.md §3). 화면에는 「회귀 실패」 · 「기존 실패」로 옮겨 나간다(RunFailDevice.tsx)
// 「러너」는 runState.ts 가 서버 글 속 그 낱말을 찾아 「테스트 실행기」로 바꾸는 데만 쓴다 — 화면에 그대로 나가지 않는다
const 예외 = new Set(['새로깨짐', '계속깨짐', '고쳐짐', '러너']);

interface 낱말줄 {
  쓰는말: string;
  무늬: RegExp;
}

/** §1 표에서 백틱 무늬가 있는 줄만 읽는다. 칸 안의 `\|` 는 정규식의 `|` 다 */
export function 낱말표(글: string): 낱말줄[] {
  const 절 = 글.split(/^## /mu).find((s) => s.startsWith('1. 화면 낱말')) ?? '';
  return 절.split('\n').flatMap((줄) => {
    if (!줄.startsWith('|')) return [];
    const 칸 = 줄.split(/(?<!\\)\|/u).slice(1, -1).map((c) => c.trim().replaceAll('\\|', '|'));
    const 무늬 = /^`(.+)`$/u.exec(칸[3] ?? '');
    return 무늬 ? [{ 쓰는말: 칸[1], 무늬: new RegExp(무늬[1], 'u') }] : [];
  });
}

const 줄들 = 낱말표(readFileSync(정본, 'utf8'));
// 자리표시 이름(`{덮음}`)은 화면에 안 나온다
const 문구들 = [...new Set(표들.flatMap((표) => Object.keys(표)))].filter((k) => !예외.has(k));
const 보이는글 = (k: string) => k.replace(/\{[^}]*\}/gu, '');

describe('화면 낱말 (docs/WORDS.md §1)', () => {
  it('정본 표를 읽는다', () => {
    expect(줄들.length).toBeGreaterThanOrEqual(10);
  });

  it.each(줄들.map((z) => [z.무늬.source, z] as const))('%s 를 화면에 쓰지 않는다', (_무늬, z) => {
    const 어긴것 = 문구들.filter((k) => z.무늬.test(보이는글(k)));
    expect(어긴것, `「${z.쓰는말}」으로 바꾼다 — docs/WORDS.md §1`).toEqual([]);
  });
});
