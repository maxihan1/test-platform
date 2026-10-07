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

describe('요약 띠는 자기 폭으로 한 단 · 두 단을 가른다 (2026-10-08)', () => {
  it('그릇은 .rs 이고 격자는 그 안쪽 .rs-grid 다 — 컨테이너 쿼리가 자기 자신을 못 보기 때문이다', () => {
    expect(몸들('.rs')).toMatch(/container-type:\s*inline-size/);
    expect(몸들('.rs')).not.toMatch(/grid-template-columns/);
    expect(몸들('.rs-grid')).toMatch(/display:\s*grid/);
  });

  it('한 단 전환 규칙이 .rs-grid 를 겨누고 .rs 를 겨누지 않는다', () => {
    expect(안의몸('@container (max-width: 660px)', '.rs-grid')).toMatch(/grid-template-columns:\s*minmax\(0,\s*1fr\)/);
    expect(안의몸('@container (max-width: 660px)', '.rs')).toBe('');
  });

  it('도넛 옆 글 칸은 최소 폭이 있고 판정 글자는 꺾이지 않는다', () => {
    expect(몸들('.rs-lines')).toMatch(/min-width:\s*(1[2-9]\d|[2-9]\d\d)px/);
    for (const 선택자 of ['.rs-fails', '.rs-of', '.rs-k']) expect(몸들(선택자), 선택자).toMatch(/white-space:\s*nowrap/);
  });

  it('판정별 보기 네 칸은 글자 폭 아래로 줄지 않는다', () => {
    expect(몸들('.rs-fbtns')).toMatch(/repeat\(4,\s*minmax\(max-content,\s*1fr\)\)/);
  });
});

describe('결과 줄은 본문 칸 폭으로 한 줄 · 오른쪽 끝이다 (2026-10-08)', () => {
  it('본문 칸이 그릇이다', () => {
    expect(몸들('.rr-main')).toMatch(/container-type:\s*inline-size/);
  });

  it('700px 이상이면 마지막 칸을 고정 폭으로 두고 버튼을 오른쪽 끝에 붙인다', () => {
    const 줄 = 안의몸('@container (min-width: 700px)', '.result-row > .row');
    expect(줄).toMatch(/grid-template-columns:\s*4px 128px minmax\(0,\s*1fr\)\s+\d+px/);
    const 오른쪽 = 안의몸('@container (min-width: 700px)', '.result-row .right');
    expect(오른쪽).toMatch(/flex-wrap:\s*nowrap/);
    expect(오른쪽).toMatch(/justify-content:\s*flex-end/);
  });

  it('창 폭 기준(1165px)으로 결과 줄 칸을 정하던 규칙이 없다', () => {
    expect(안의몸('@media (min-width: 1165px)', '.result-row > .row')).toBe('');
  });
});

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
