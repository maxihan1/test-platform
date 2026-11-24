// 실행 결과 화면 CSS 규칙이 그대로 있는지 본다 — jsdom 은 폭을 못 재서 배치는 브라우저로 쟀고(2026-10-08), 여기서는 그 근거 규칙만 못 박는다

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');

interface 규칙 {
  자리: number;
  선택자들: string[];
  몸: string;
}

const 규칙들: 규칙[] = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
  자리: m.index!,
  선택자들: m[1]!.split(',').map((s) => s.trim()),
  몸: m[2]!,
}));

const 몸들 = (선택자: string): string =>
  규칙들
    .filter((r) => r.선택자들.includes(선택자))
    .map((r) => r.몸)
    .join('\n');

/** `@container` · `@media` 머리글 바로 아래 규칙만 모은다 */
function 안의몸(머리글: string, 선택자: string): string {
  const 시작 = css.indexOf(머리글);
  if (시작 === -1) return '';
  let 깊이 = 0;
  let 끝 = 시작;
  for (let i = css.indexOf('{', 시작); i < css.length; i += 1) {
    if (css[i] === '{') 깊이 += 1;
    if (css[i] === '}') 깊이 -= 1;
    if (깊이 === 0) {
      끝 = i;
      break;
    }
  }
  return 규칙들
    .filter((r) => r.자리 > 시작 && r.자리 < 끝 && r.선택자들.includes(선택자))
    .map((r) => r.몸)
    .join('\n');
}

describe('실행 결과의 누르는 자리와 포커스 링 (DESIGN.md 접근성 기준)', () => {
  it('620px 미만에서 카드 안 버튼 · 상세 링크 · 디바이스 칩이 44px 이다', () => {
    const 머리 = '@media (max-width: 620px) {\n  .fc-card';
    expect(안의몸(머리, '.fc-acts .btn')).toMatch(/min-height:\s*44px/);
    expect(안의몸(머리, '.fc-detail')).toMatch(/min-height:\s*44px/);
    expect(안의몸(머리, '.fc-detail')).toMatch(/min-width:\s*44px/);
  });

  it('결과 화면의 링크와 접힌 줄 포커스는 잉크 2px 이다 — 브라우저 기본 파란 링이 아니다', () => {
    for (const 선택자 of ['.rr a:focus-visible', '.rr summary:focus-visible']) {
      expect(몸들(선택자), 선택자).toMatch(/outline:\s*2px solid var\(--ink\)/);
    }
  });
});
