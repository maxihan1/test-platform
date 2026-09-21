// styles.css 가 DESIGN.md 의 약속을 지키는지 기계가 본다 — 사람이 훑어서는 되돌아오는 것을 못 막는다

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** `:root` 블록의 토큰만 뽑는다. 다른 규칙 안의 색은 세지 않는다 */
function 토큰들(): Record<string, string> {
  const 블록 = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const 표: Record<string, string> = {};
  for (const m of 블록.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) 표[m[1]!] = m[2]!.trim();
  return 표;
}

describe('화면 토큰 (DESIGN.md)', () => {
  it('방안지 격자를 페이지 바탕에 깔지 않는다', () => {
    const body = /\bbody\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    // 격자는 미완성 목업처럼 읽혀 2026-09-21 에 걷어냈다. 되돌아오면 여기서 걸린다
    expect(body).not.toMatch(/background-image/);
    expect(body).not.toMatch(/background-size/);
  });

  it('껍데기 색을 토큰 하나로 둔다', () => {
    // 껍데기(띠·탭 밑줄·표머리)에만 쓰는 색이다. 자리마다 적으면 한쪽만 바뀐다
    expect(토큰들()['--chrome']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('판정 세 색과 그 바탕이 전부 있다', () => {
    const 표 = 토큰들();
    for (const 이름 of ['--pass', '--fail', '--na', '--pass-bg', '--fail-bg', '--na-bg']) {
      expect(표[이름], 이름).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
