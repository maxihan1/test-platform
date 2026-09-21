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

  it('쓰는 토큰이 전부 :root 에 정의돼 있다', () => {
    // 없는 토큰을 var() 로 부르면 그 속성이 통째로 무효가 된다 — 오류도 안 나고 조용히 사라진다.
    // 2026-09-21 에 --lift 가 실제로 그랬다. 면이 바탕에서 떠 보이지 않는데 아무도 안 죽는다
    const 있는것 = new Set(Object.keys(토큰들()));
    const 부르는것 = new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!));
    // --svc 는 서비스마다 화면이 인라인으로 꽂는다. :root 에 둘 수 없다
    부르는것.delete('--svc');
    const 없는것 = [...부르는것].filter((이름) => !있는것.has(이름));
    expect(없는것, `:root 에 없는 토큰을 부른다 — ${없는것.join(', ')}`).toEqual([]);
  });

  it('껍데기 색을 토큰 하나로 둔다', () => {
    // 껍데기(띠·탭 밑줄·표머리)에만 쓰는 색이다. 자리마다 적으면 한쪽만 바뀐다
    expect(토큰들()['--chrome']).toMatch(/^#[0-9a-f]{6}$/i);
  });

  it('싣지 않은 굵기를 부르지 않는다', () => {
    // 본문 글꼴은 400·600 두 벌뿐이다. 700·800 을 부르면 브라우저가 가짜 굵기를 합성해
    // 한글 획이 뭉개진다. 2026-09-21 에 크기표를 600 으로 고치면서 CSS 를 안 맞춰
    // 제목 여덟 곳이 800 인 채로 남아 있었다 — 브라우저로 열어서야 보였다
    const 굵기들 = [...css.matchAll(/font-weight:\s*(\d{3})/g)].map((m) => Number(m[1]));
    expect(굵기들.filter((w) => w > 600)).toEqual([]);
  });

  it('모달은 머리와 바닥이 고정이고 본문만 구른다', () => {
    // 고른 건수가 늘어도 대상 서버 칸과 실행 버튼이 늘 보여야 한다 (SPEC §8.10).
    // 끝까지 내려가야 버튼이 나오면 대상 서버를 안 고른 채로 내려간다.
    // jsdom 에 레이아웃 엔진이 없어 규칙이 있는지만 본다
    expect(/\.modal-title\s*\{[^}]*flex:\s*none/.exec(css)).not.toBeNull();
    expect(/\.modal-foot\s*\{[^}]*flex:\s*none/.exec(css)).not.toBeNull();
    const 본문 = /\.modal-body\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(본문).toMatch(/overflow:\s*auto/);
    // min-height:0 이 없으면 flex 자식이 제 키를 지켜서 본문이 안 줄고 바닥이 밖으로 밀린다
    expect(본문).toMatch(/min-height:\s*0/);
  });

  it('면은 떠 있고 행에는 그림자가 없다', () => {
    // 원칙 2 (2026-09-21 뒤집었다). 면은 radius 14px 에 옅은 그림자,
    // 행마다 카드를 두르지 않는다 — 나열이 객체로 읽힌다
    for (const 면 of ['.screen', '.modal', '.login-box']) {
      // 줄 맨 앞에 선 것이 첫 정의다. 좁은 화면 재정의는 들여쓴 채로 뒤에 또 나온다 —
      // 그것을 잡으면 「없다」고 거짓 실패한다 (2026-09-21 실제로 그랬다)
      const 블록 = new RegExp(`^\\${면}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? '';
      expect(블록, `${면} 에 radius 14px 이 없다`).toMatch(/border-radius:\s*14px/);
      expect(블록, `${면} 에 그림자가 없다`).toMatch(/box-shadow:/);
    }
    const 행 = /\n\.row\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(행, '행에 그림자를 주면 나열이 객체로 읽힌다').not.toMatch(/box-shadow:/);
  });

  it('흐름 막대는 판정마다 높이가 다르다 — 색만으로 말하지 않는다', () => {
    // 색을 못 보는 사람에게 다섯 칸이 전부 같은 높이면 회색 네모 다섯이다 (DESIGN.md 접근성)
    const 높이 = (판정: string) =>
      new RegExp(`\\.spark i\\.${판정}\\s*\\{[^}]*height:\\s*(\\d+)px`).exec(css)?.[1];
    const 값들 = ['p', 'f', 'n'].map(높이);
    expect(값들.every((v) => v !== undefined), '판정마다 높이 규칙이 있어야 한다').toBe(true);
    expect(new Set(값들).size, '판정 셋의 높이가 서로 달라야 한다').toBe(3);
  });

  it('줄의 입력칸이 바탕 위에서 읽힌다', () => {
    // 줄 맨 앞에 선 것이 첫 정의다. 좁은 화면 재정의는 들여쓴 채로 **앞에** 나온다 —
    // 그것을 잡으면 「규칙이 없다」고 거짓 실패한다 (2026-09-21, PR① 과 같은 함정)
    const 블록 = /^\.pcell \.field input,[^{]*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(블록, '줄의 입력칸 규칙이 없다').toMatch(/border-radius:\s*8px/);
  });

  it('펼침 패널이 줄과 다른 바탕을 쓴다', () => {
    // 같은 바탕이면 어디까지가 그 줄의 상세인지 눈으로 못 가른다
    const 블록 = /^\.detail\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(블록, '.detail 에 바탕이 없다').toMatch(/background:\s*var\(--sheet-2\)/);
  });

  it('좁은 화면에서 줄의 입력칸은 라벨이 값 위로 올라간다', () => {
    // DESIGN.md 「반응형」 — 입력 폼은 라벨이 값 위로. 132px 라벨 열을 그대로 두면 375px 에서 넘친다
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(좁은화면).toMatch(/\.pcell \.field\s*\{[^}]*grid-template-columns:\s*1fr/);
  });

  it('좁은 화면에서 줄의 버튼과 입력칸이 44px 이다', () => {
    // 손가락으로 누르는 자리다. 완료 기준이 실행 결과 화면을 휴대폰에서 보게 요구한다
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const 값 = /\.row \.btn\.small\s*\{[^}]*min-height:\s*(\d+)px/.exec(좁은화면)?.[1];
    expect(Number(값 ?? 0)).toBeGreaterThanOrEqual(44);
  });

  it('모달 안의 진행 막대가 줄어들지 않는다', () => {
    // .modal-body 가 세로 flex 라 6px 막대가 flex-shrink 로 0 까지 줄어든다.
    // 2026-09-21 에 실제로 그랬다 — 색도 비율도 맞는데 높이만 0 이라 숫자만 뜨고 막대가 통째로 안 보였다.
    // jsdom 에 레이아웃 엔진이 없어 화면 검사는 이 자리를 원리적으로 못 잡는다. 규칙이 있는지만 본다
    const 블록 = /\.modal-body\s+\.stripe\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(블록).toMatch(/flex-shrink:\s*0/);
  });

  it('한 줄로 자르는 규칙이 다 있다 — 하나만 빠져도 한 글자씩 세로로 흐른다', () => {
    // 지난 PR 에서 「제목이 한 글자씩 세로로 흘렀다」가 2회 났다 (LEARNINGS 2026-09-17 · 09-19).
    // flex 자식은 기본 min-width 가 auto 라 셋 중 그것만 빠져도 ellipsis 가 아예 안 걸린다.
    // jsdom 에 레이아웃 엔진이 없어 `getBoundingClientRect()` 는 늘 0 이다 — 규칙이 있는지만 본다
    const 블록 = /\.one-line\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    for (const 규칙 of [
      /text-overflow:\s*ellipsis/,
      /white-space:\s*nowrap/,
      /overflow:\s*hidden/,
      /min-width:\s*0/,
      /word-break:\s*keep-all/,
    ]) {
      expect(블록, `.one-line 에 ${규칙.source} 가 없다`).toMatch(규칙);
    }
  });

  it('비활성 버튼에 규칙이 있다', () => {
    // 못 누르는 버튼이 눌리는 버튼과 픽셀 단위로 같으면 사람이 눌러 보고서야 안다.
    // 2026-09-20 에 실제로 그랬다 — 규칙은 그때 들어갔고 여기서 되돌아오는 것을 막는다
    expect(css).toMatch(/\.btn:disabled\s*\{/);
  });

  it('사이드바를 접으면 본문이 실제로 넓어진다', () => {
    // 사이드바만 줄이고 `max-width` 를 그대로 두면 상한이 남은 자리를 막아
    // 접은 보람이 없다. 상한을 풀어야 창을 채운다 (2026-09-21 실측 — 960 → 1160 밖에 안 늘었다)
    const 접힘 = /\.wrap\.folded\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(접힘).toMatch(/max-width:\s*none/);
    expect(접힘).toMatch(/grid-template-columns:\s*44px/);
  });

  it('접어도 자리 넷을 화면에서 지우지 않는다', () => {
    // `display: none` 을 쓰면 키보드 탭 대상에서 빠져 키보드로만 쓰는 사람이 이동을 통째로 잃는다.
    // 글자만 0 으로 눌러 화면에서는 사라지되 탭 순서에는 남긴다 (SPEC §8)
    const 자리 = /\.folded \.side \.nav a\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(자리).toMatch(/font-size:\s*0/);
    expect(자리).not.toMatch(/display:\s*none/);
    expect(자리).not.toMatch(/visibility:\s*hidden/);
  });

  it('좁은 화면에서 거터가 쌓인 줄 전체를 덮는다', () => {
    // `grid-row: 1 / -1` 만으로는 안 된다. -1 은 **명시적으로 선언한** 줄의 끝을 가리켜서
    // 내용이 암시적 행으로 쌓이면 거터가 첫 줄만 덮는다 (WORKSTREAMS ⑪, 2026-09-19 실측).
    // 행을 명시해야 -1 이 진짜 끝이 된다. jsdom 은 레이아웃이 없어 규칙이 있는지만 본다
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(좁은화면).toMatch(/\.row\s*\{[^}]*grid-template-rows:/);
    expect(좁은화면).toMatch(/\.gutter\s*\{[^}]*grid-row:\s*1\s*\/\s*-1/);
  });

  it('좁은 화면 자리 넷의 손가락 영역이 44px 이상이다', () => {
    // SPEC §8 — 휴대폰으로 하는 일은 「끝났나 보기」 하나라 그 길목이 44px 을 넘어야 한다.
    // 46 으로 둔다. 브라우저 반올림이 소수점만큼 깎아 목업 실측이 43.9986 이었다
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const 값 = /\.side \.nav a\s*\{[^}]*min-height:\s*(\d+)px/.exec(좁은화면)?.[1];
    expect(Number(값)).toBeGreaterThanOrEqual(44);
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
    ['--rail-ink', '--rail', 본문],
    ['--rail-ink', '--rail-2', 본문],
    ['--rail-dim', '--rail', 본문],
    ['--rail-dim', '--rail-2', 본문],
    ['--rail-acc', '--rail', 본문],
    ['--rail-acc', '--rail-2', 본문],
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

/**
 * 화면과 증적 문서가 같은 토큰을 쓰는지 (DESIGN.md 「같은 레이아웃」).
 *
 * **두 벌이 갈리면 화면을 보던 사람이 문서를 받았을 때 다시 배워야 한다.**
 * `reporting/html.ts` 는 화면 CSS 를 읽지 않고 값을 복사해 두므로 사람이 한쪽만 고치기 쉽다.
 * 2026-09-21 스킨 교체가 정확히 그 위험을 두 배로 키웠다 — 그래서 여기서 대조한다.
 */
describe('증적 문서가 화면과 같은 토큰을 쓴다', () => {
  const 문서 = readFileSync(new URL('../reporting/html.ts', import.meta.url), 'utf8');

  it.each([
    '--paper',
    '--sheet',
    '--ink',
    '--ink-muted',
    '--ink-faint',
    '--rule',
    '--rule-soft',
    '--pass',
    '--pass-bg',
    '--fail',
    '--fail-bg',
    '--na',
    '--na-bg',
  ])('%s 가 화면과 같은 값이다', (이름) => {
    const 화면값 = 토큰들()[이름]!.toLowerCase();
    const 문서값 = new RegExp(`${이름}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(문서)?.[1]?.toLowerCase();
    expect(문서값, `${이름} 이 증적 문서에 없거나 값이 다르다`).toBe(화면값);
  });
});
