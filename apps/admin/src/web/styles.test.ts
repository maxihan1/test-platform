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

/** 상대 밝기 (WCAG 2.1). settingsView 의 `명암비` 는 흰색 한쪽만 재서 짝을 못 본다 */
function 밝기(hex: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

function 짝명암비(a: string, b: string): number {
  const [x, y] = [밝기(a), 밝기(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/**
 * DESIGN.md 의 명암비 표를 기계가 다시 잰다.
 *
 * **왜 여기 있나** — 2026-09-19 에 「기준이 문서에만 있으면 지켜지지 않는다」를 배웠다
 * (LEARNINGS · 서비스 색 기본값이 미달인 채로 들어가 있었다). 그때는 서비스 색만 재는 장치를 만들었다.
 * 토큰은 여전히 사람이 손으로 쟀고, 실제로 시안 값 하나(`#64727c`)가 미달인 채 올 뻔했다.
 * 이제 토큰을 바꾸면 여기가 먼저 빨개진다.
 */
describe('토큰 명암비 (DESIGN.md)', () => {
  const 본문 = 4.5;
  const 요소 = 3;

  it.each([
    ['--ink', '--sheet', 본문],
    ['--ink', '--paper', 본문],
    ['--ink-muted', '--sheet', 본문],
    ['--ink-muted', '--sheet-2', 본문],
    ['--ink-faint', '--sheet', 본문],
    ['--ink-faint', '--sheet-2', 본문],
    ['--ink-faint', '--paper', 본문],
    ['--ink-faint', '--chip', 본문],
    ['--chrome', '--sheet', 본문],
    ['--chrome', '--paper', 본문],
    ['--pass', '--pass-bg', 본문],
    ['--fail', '--fail-bg', 본문],
    ['--na', '--na-bg', 본문],
    ['--pass', '--sheet', 본문],
    ['--fail', '--sheet', 본문],
  ])('%s 가 %s 위에서 기준 %s 를 넘는다', (앞, 뒤, 기준) => {
    const 표 = 토큰들();
    expect(짝명암비(표[앞]!, 표[뒤]!)).toBeGreaterThanOrEqual(기준);
  });

  it('띠의 흰 글자가 껍데기 색 위에서 읽힌다', () => {
    expect(짝명암비('#ffffff', 토큰들()['--chrome']!)).toBeGreaterThanOrEqual(본문);
  });

  it('실패 배지의 흰 글자가 읽힌다. 반전은 여기 하나뿐이다', () => {
    expect(짝명암비('#ffffff', 토큰들()['--fail']!)).toBeGreaterThanOrEqual(본문);
  });

  it('괘선은 기준 밖이다. 행 구분은 간격과 배치가 이미 하고 있다', () => {
    // DESIGN.md 가 적어 둔 예외다. 그 사실을 여기에도 남겨 다음 사람이 「빠뜨렸나」 묻지 않게 한다
    const 표 = 토큰들();
    expect(짝명암비(표['--rule']!, 표['--sheet']!)).toBeLessThan(요소);
  });
});
