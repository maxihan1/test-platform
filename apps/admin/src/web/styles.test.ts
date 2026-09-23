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

  it('면이 창보다 길어도 줄어들어 잘리지 않는다 — 넘치면 .main 이 스크롤한다', () => {
    // .main 은 창 높이의 세로 flex 이고 .screen 은 overflow: hidden 이다. flex 항목은
    // overflow 가 hidden 이면 내용보다 작게 줄어들 수 있어서, 긴 설정 화면의 아래가
    // 잘린 채 숨고 .main 에는 넘친 것이 없어 스크롤도 안 생겼다 (2026-09-23 실측)
    const 면 = /^\.screen\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(면).toMatch(/flex-shrink:\s*0/);
    // 목록 화면만은 남는 칸을 받아 안의 표를 스크롤한다 — 위 규칙을 덮어써야 한다
    const 목록 = /^\.screen\.list-screen\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(목록).toMatch(/flex:\s*1/);
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

  it('화면 머리가 본문과 다른 면이고 아래가 괘선으로 닫힌다', () => {
    // 머리와 본문이 같은 바탕이면 「헤드와 메인이 분리 안 돼 있다」로 다시 돌아간다 (2026-09-22)
    const 블록 = /^\.head\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(블록, '.head 에 바탕이 없다').toMatch(/background:\s*var\(--sheet\)/);
    expect(블록, '.head 아래가 안 닫혔다').toMatch(/border-bottom:/);
  });

  it('화면 제목이 큰 글자 기준을 넘는다', () => {
    // DESIGN.md 명암비 — 24px 이상이면 「큰 글자」라 3:1 이 기준이 된다.
    // 제목이 그보다 작으면 4.5 기준으로 다시 재야 한다
    const 값 = /^\.head h1\s*\{[^}]*font-size:\s*(\d+)px/m.exec(css)?.[1];
    expect(Number(값 ?? 0)).toBeGreaterThanOrEqual(24);
  });

  it('좁은 화면에서 머리가 세로로 쌓이고 행동 버튼이 44px 이다', () => {
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(좁은화면).toMatch(/\.head\s*\{[^}]*flex-direction:\s*column/);
    const 값 = /\.head-acts \.btn\s*\{[^}]*min-height:\s*(\d+)px/.exec(좁은화면)?.[1];
    expect(Number(값 ?? 0)).toBeGreaterThanOrEqual(44);
  });

  it('로그인 상자가 짙은 바탕 위에 선다', () => {
    // 들어가는 자리임을 분명히 한다. 밝은 바탕에 밝은 상자를 두면 상자가 안 보인다
    const 바깥 = /^\.login\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(바깥, '.login 바탕이 짙지 않다').toMatch(/background:\s*var\(--rail\)/);
    const 상자 = /^\.login-box\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(상자, '.login-box 가 밝은 면이 아니다').toMatch(/background:\s*var\(--sheet\)/);

    // 상자가 바탕에서 갈려 보여야 한다. UI 요소 기준 3:1 (DESIGN.md 명암비, 2026-09-22 실측 15.40)
    const 표 = 토큰들();
    expect(짝명암비(표['--sheet']!, 표['--rail']!)).toBeGreaterThanOrEqual(3);
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

  it('접어도 자리 목록을 화면에서 지우지 않는다', () => {
    // `display: none` 을 쓰면 키보드 탭 대상에서 빠져 키보드로만 쓰는 사람이 이동을 통째로 잃는다.
    // 글자만 0 으로 눌러 화면에서는 사라지되 탭 순서에는 남긴다 (SPEC §8)
    const 자리 = /\.folded \.side \.side-nav a\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
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

  it('좁은 화면 자리 목록의 손가락 영역이 44px 이상이다', () => {
    // SPEC §8 — 휴대폰으로 하는 일은 「끝났나 보기」 하나라 그 길목이 44px 을 넘어야 한다.
    // 46 으로 둔다. 브라우저 반올림이 소수점만큼 깎아 목업 실측이 43.9986 이었다
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const 값 = /\.side \.side-nav a\s*\{[^}]*min-height:\s*(\d+)px/.exec(좁은화면)?.[1];
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

// 서비스 색을 2026-09-22 에 화면에서 걷었다 (SPEC §8).
// 「지금 없다」만 보면 다음 사람이 무심코 되살려도 아무도 모른다 — CSS 에서 되살아나는 것을 막는다
describe('서비스 색이 되살아나지 않는다 (SPEC §8, 2026-09-22)', () => {
  it('`--svc` 를 부르는 규칙이 하나도 없다', () => {
    expect(css).not.toContain('--svc');
  });

  it('색 네모와 미리보기 규칙이 없다', () => {
    for (const 이름 of ['.side-dot', '.set-swatch', '.set-preview', '.set-hex', '.set-color']) {
      expect(css, 이름 + ' 규칙이 남아 있다').not.toContain(이름);
    }
  });
});

// 「예쁘게」는 잴 수 없다. 숫자로 적어야 검사가 붙는다 (계획 게이트 1 주의 7)
describe('서비스 고르개 (SPEC §8, 2026-09-22)', () => {
  it('누르는 영역이 44px 기준을 넘는다. 브라우저 반올림 때문에 46 으로 건다', () => {
    const 규칙 = css.slice(css.indexOf('.side-pick {'));
    const 높이 = /min-height:\s*(\d+)px/.exec(규칙);
    expect(높이, '.side-pick 에 min-height 가 없다').not.toBeNull();
    expect(Number(높이![1])).toBeGreaterThanOrEqual(46);
  });

  it('포커스 표시가 있다. 키보드로 쓰는 사람이 지금 어디인지 알아야 한다', () => {
    expect(css).toContain('.side-pick:focus-visible');
  });

  it('무엇을 고르는 자리인지 적는 라벨 규칙이 있다', () => {
    expect(css).toContain('.side-cap');
  });
});

/** 선택자 하나의 규칙 블록을 통째로 준다. 주석은 지운다 — 주석 처리한 선언이 통과하면 안 된다 */
function 규칙(선택자: string): string {
  const 자리 = css.indexOf(`\n${선택자} {`);
  if (자리 < 0) return '';
  return css.slice(자리, css.indexOf('}', 자리)).replace(/\/\*[\s\S]*?\*\//g, '');
}

/**
 * 선택자 **조각**이 든 규칙의 **선언 부분만** 준다.
 *
 * `규칙()` 은 줄 처음부터 딱 맞는 선택자를 찾는다. 선택자가 여럿 묶인 규칙
 * (`.right .btn,\n.right a.btn { … }`)은 그것으로 못 찾는데,
 * 못 찾았을 때 파일 나머지를 통째로 돌려주면 **어디에 있든 통과하는 항진명제**가 된다 —
 * 2026-09-22 에 실제로 그렇게 썼고 돌연변이가 안 잡혀서 드러났다 (spec-review G8).
 */
function 선언들(선택자조각: string): string {
  const 자리 = css.indexOf(선택자조각);
  if (자리 < 0) return '';
  const 여는 = css.indexOf('{', 자리);
  if (여는 < 0) return '';
  return css.slice(여는, css.indexOf('}', 여는)).replace(/\/\*[\s\S]*?\*\//g, '');
}

/** 규칙 블록에서 grid-template-columns 값을 뽑는다 */
function 격자(선택자: string): string {
  return /grid-template-columns:\s*([^;]+);/.exec(규칙(선택자))?.[1]?.trim() ?? '';
}

// 표머리와 줄이 각자 격자를 들면 칸이 통째로 어긋난다. 2026-09-22 실측으로
// 「입력값」 머리가 실제 입력칸보다 121px 오른쪽에 있었다 (「마지막 결과」 116 · 「판정」 166)
describe('표머리와 줄이 같은 격자를 쓴다 (SPEC §8.1 · §8.7, 2026-09-22)', () => {
  it('케이스 목록의 표머리와 줄이 같은 격자 한 벌을 쓴다', () => {
    expect(격자('.rowhead'), '표머리에 격자가 없다').not.toBe('');
    expect(격자('.rowhead')).toBe('var(--list-cols)');
    expect(격자('.row.pickable')).toBe('var(--list-cols)');
  });

  it('실행 기록의 표머리와 줄이 같은 격자 한 벌을 쓴다', () => {
    expect(격자('.rowhead.runhead')).toBe('var(--run-cols)');
    expect(격자('.row')).toBe('var(--run-cols)');
  });

  // 값이 같은 글자여도 마지막 칸이 auto 면 안 맞는다 — 머리는 글자 몇 자이고
  // 줄은 판정 배지와 버튼이라 내용 폭이 달라 남는 자리가 다르게 나뉜다.
  // 이 검사가 없으면 두 규칙이 똑같이 `4px 128px 1fr auto` 여도 통과한다
  it('격자의 마지막 칸이 내용을 따라가지 않는다', () => {
    const 표 = 토큰들();
    for (const 이름 of ['--list-cols', '--run-cols']) {
      const 값 = 표[이름];
      expect(값, `${이름} 이 :root 에 없다`).toBeDefined();
      expect(값!.trim().endsWith('auto'), `${이름} 의 마지막 칸이 auto 다`).toBe(false);
      expect(값!.trim()).toMatch(/\d+px$/);
    }
  });

  // 격자를 합치고도 24px 이 어긋나 있었다 — 표머리에만 오른쪽 여백 24px 이 있었다.
  // 격자가 같아도 **내용 상자 폭**이 다르면 남는 자리가 다르게 나뉜다 (2026-09-22 브라우저 실측)
  it('표머리와 줄의 좌우 여백이 같다', () => {
    // `0` 과 `0px` 은 같은 값이다. 글자로 견주므로 맞춰 준다
    const 폭 = (값: string): string => (Number.parseFloat(값) === 0 ? '0px' : 값);
    const 좌우 = (선택자: string): string => {
      const 값 = /(?:^|\n)\s*padding:\s*([^;]+);/.exec(규칙(선택자))?.[1]?.trim().split(/\s+/) ?? [];
      // top right bottom left → 넷이면 [1]·[3], 둘이면 [1]·[1]
      if (값.length === 4) return `${폭(값[1]!)} ${폭(값[3]!)}`;
      if (값.length === 2) return `${폭(값[1]!)} ${폭(값[1]!)}`;
      return '0px 0px';
    };
    expect(좌우('.rowhead')).toBe(좌우('.row'));
  });

  // 마지막 칸이 고정 폭이 되면서 그 안이 넘칠 수 있게 됐다. 넘치면 flex 가 버튼을 줄이는데
  // `body` 의 `overflow-wrap: anywhere` 때문에 낱말 안에서도 끊긴다 — 브라우저 실측에서
  // `Details` 가 35 × 134px 로 한 글자씩 세로로 흘렀다 (2026-09-22).
  // jsdom 은 이 자리를 원리적으로 못 잰다 — 선언이 다 있는지만 본다 (`.one-line` 과 같은 방식)
  it('마지막 칸 안의 버튼과 판정 묶음이 줄어들지 않는다', () => {
    const 버튼 = 선언들('.right .btn');
    expect(버튼, '.right .btn 규칙을 못 찾았다').not.toBe('');
    expect(버튼, '.right 의 버튼에 flex: none 이 없다').toMatch(/flex:\s*none/);
    expect(버튼, '.right 의 버튼에 white-space: nowrap 이 없다').toMatch(/white-space:\s*nowrap/);
    expect(규칙('.right .devices'), '판정 묶음에 flex: none 이 없다').toMatch(/flex:\s*none/);
    // 안 들어가면 글자를 뭉개는 대신 줄을 바꾼다
    expect(규칙('.right')).toMatch(/flex-wrap:\s*wrap/);
  });

  // 고정 폭 트랙을 쓰면 **그 합이 안 들어가는 창**이 생긴다. 2026-09-22 에 1680px 만 재고
  // 「쟀다」고 적었다가 1024px 창에서 표가 139px 넘치는 것을 자기검토가 잡았다.
  // 넓은 창 하나로는 이 자리를 영영 못 본다 — 좁은 구간 대비가 있는지를 기계가 본다
  it('고정 폭이 안 들어가는 창을 위한 대비가 있다', () => {
    const 고정합 = (이름: string): number =>
      [...(토큰들()[이름] ?? '').matchAll(/(?:^|\s)(\d+)px/g)].reduce((합, m) => 합 + Number(m[1]), 0);
    // 넓은 창용 값은 고정 폭을 쓴다 — 그래야 표머리와 줄이 같은 자리에 선다
    expect(고정합('--list-cols'), '--list-cols 에 고정 폭이 없다').toBeGreaterThan(0);
    // 그 값이 안 들어가는 창을 위한 좁은 구간 재정의가 있어야 한다
    const 좁은구간 = /@media \(max-width: (\d+)px\) \{\s*:root \{([\s\S]*?)\}/.exec(css);
    expect(좁은구간, '고정 폭이 안 들어가는 창을 위한 :root 재정의가 없다').not.toBeNull();
    expect(좁은구간![2], '좁은 구간 값이 여전히 고정 폭이다 — 비율(fr)이어야 넘치지 않는다').toMatch(
      /--list-cols:[^;]*fr/,
    );
  });

  it('좁은 화면에서는 표머리를 감춘다 — 줄이 2단으로 접혀 칸이 세로로 눕는다', () => {
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(좁은화면).toMatch(/\.rowhead\s*\{[^}]*display:\s*none/);
  });
});

// 창 1680 × 794 에서 좌우로 222px 씩 버려지고 표가 940px 에 갇혀 있었다.
// 세로는 564px 을 위아래 UI 가 먼저 가져가 표에 206px(1.5줄)만 남았다 (2026-09-22 실측)
describe('표가 창을 쓴다 (2026-09-22)', () => {
  it('본문 상한이 1600px 이다', () => {
    const 값 = /max-width:\s*(\d+)px/.exec(규칙('.wrap'))?.[1];
    expect(값, '.wrap 에 max-width 가 없다').toBeDefined();
    expect(Number(값)).toBe(1600);
  });

  // 「본문 칸은 960px」 은 `styles.css` 주석에만 있었고 그 주석이 `(SPEC §8)` 을 인용하는데
  // **§8 에 그런 문장이 없다.** 인용이 헛돌면 다음 사람이 없는 계약을 지키려고 막힌다
  // 파일 전수로 `960` 을 찾으면 색값(#a96023)이나 다른 폭(1960px)에도 걸려 엉뚱한 곳을 가리킨다.
  // 막으려는 것은 **본문 폭 상한이 960px 로 돌아오는 것** 하나다 (2026-09-22 자기검토)
  it('명세에 없는 폭 상수를 근거로 적지 않는다', () => {
    expect(css, '본문 폭 상한이 960px 으로 돌아왔다 — 명세에 없는 숫자다').not.toMatch(
      /max-width:\s*960px/,
    );
    expect(규칙('.wrap'), '.wrap 주석·선언에 960 이 남아 있다').not.toContain('960');
  });

  it('body 아래 여백이 24px 이다', () => {
    expect(토큰들()['--body-pad-bottom']).toBe('24px');
  });

  // 제목 글자는 안 줄인다 — 24px 이 명암비 기준이 갈리는 경계다 (위 「화면 제목」 검사).
  // 되찾는 세로는 여백에서 뺀다
  it('화면 머리 여백을 줄였다', () => {
    const 값 = /padding:\s*(\d+)px/.exec(규칙('.head'))?.[1];
    expect(값, '.head 에 padding 이 없다').toBeDefined();
    expect(Number(값)).toBeLessThanOrEqual(12);
  });

  // 숫자 아래에 라벨을 쌓으면 띠가 120px 이 된다. 눕히면 한 줄이고 **글자는 하나도 안 잃는다**
  it('집계띠가 한 줄로 눕는다 — 적힌 글자는 그대로다', () => {
    const 블록 = 규칙('.stat');
    expect(블록).toMatch(/display:\s*flex/);
    expect(블록).toMatch(/align-items:\s*baseline/);
  });

  // 목록 화면은 표가 창을 꽉 채운다. 바닥 줄이 있으면 그만큼 표가 잘린다
  it('목록 화면에서 바닥 줄을 숨긴다', () => {
    expect(css).toMatch(/\.main:has\(\.list-screen\)\s*\.foot\s*\{[^}]*display:\s*none/);
  });
});

// 상자가 880 × 80vh 이던 때 실행 결과 상자의 케이스 목록에 32px 만 남았다 — 줄이 101px 이라
// **한 줄도 안 들어갔다.** 정보 UI 가 상자의 95% 를 먹고 있었다 (2026-09-22 실측)
describe('넓은 상자가 표를 담을 만큼 크다 (DESIGN.md, 2026-09-22)', () => {
  it('넓은 상자는 1400px 이다', () => {
    const 값 = /max-width:\s*(\d+)px/.exec(규칙('.modal.wide'))?.[1];
    expect(값, '.modal.wide 에 max-width 가 없다').toBeDefined();
    expect(Number(값)).toBe(1400);
  });

  // `94vh` 로 적으면 창이 533px 보다 낮을 때 덮개 여백 32px 과 합쳐 화면을 넘어
  // 제목과 닫기가 밖으로 나간다 — 덮개에 스크롤이 없어 닿을 길도 없다 (2026-09-22).
  // 빼는 값을 적어야 어느 창 높이에서도 안 넘친다
  it('상자 높이가 덮개 여백을 뺀 만큼이다 — vh 만 적지 않는다', () => {
    const 블록 = 규칙('.modal');
    expect(블록, '.modal 에 max-height 가 없다').toMatch(/max-height:/);
    expect(블록, '창 높이에서 덮개 여백을 안 뺐다').toMatch(/max-height:\s*calc\(100vh\s*-\s*\d+px\)/);
  });

  // 좁은 화면 규칙은 안 건드린다 — 폭은 상한일 뿐이고 상자는 창을 따라간다
  it('상자가 좁은 화면에서는 창을 채운다', () => {
    expect(규칙('.modal')).toMatch(/width:\s*100%/);
  });
});

// 2026-09-21 에 배운 것이 2026-09-22 에 그대로 재발했다 — 언어 고르개에 규칙이 없어
// OS 가 짙은 사이드바 위에 흰 상자를 그렸다. 두 번째라 기계로 옮긴다 (CLAUDE.md §2.5).
// 밝은 면 위의 select 는 OS 모양이어도 읽히므로 사이드바만 본다
describe('사이드바의 select 를 OS 가 그리지 않는다 (LEARNINGS 2026-09-21 재발)', () => {
  const 껍데기 = readFileSync(new URL('./Shell.tsx', import.meta.url), 'utf8');

  /** 사이드바가 그리는 select 하나하나의 자리 이름(class 나 id)을 모은다 */
  function 고르개이름들(): string[] {
    const 이름들: string[] = [];
    for (const m of 껍데기.matchAll(/<select\b([\s\S]*?)>/g)) {
      const 이름 = /(?:className|id)="([\w-]+)"/.exec(m[1] ?? '')?.[1];
      if (이름 !== undefined) 이름들.push(이름);
    }
    return 이름들;
  }

  it('사이드바가 그리는 고르개를 세었다', () => {
    expect(고르개이름들().length).toBeGreaterThanOrEqual(2);
  });

  // 「appearance 라는 글자가 css 어딘가에 있다」로는 안 된다 — 다른 선택자에 걸린 것도 통과한다.
  // 그 고르개를 **겨냥한 규칙 안에서** 껐는지 본다 (spec-review G9)
  it('고르개마다 그것을 겨냥한 규칙이 appearance 를 끈다', () => {
    for (const 이름 of 고르개이름들()) {
      const 겨냥 = css
        .split('\n')
        .filter((줄) => 줄.includes(이름) && 줄.trimEnd().endsWith('{'))
        .map((줄) => 규칙(줄.trim().replace(/\s*\{$/, '')));
      const 끈것 = 겨냥.filter((블록) => /appearance:\s*none/.test(블록));
      expect(끈것.length, `${이름} 를 겨냥한 규칙 중 appearance 를 끈 것이 없다`).toBeGreaterThan(0);
    }
  });
});
