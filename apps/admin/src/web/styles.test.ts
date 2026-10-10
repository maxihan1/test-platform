// styles.css 가 DESIGN.md 의 약속을 지키는지 기계가 본다 — 사람이 훑어서는 되돌아오는 것을 못 막는다

import { readdirSync, readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const css = readFileSync(new URL('./styles.css', import.meta.url), 'utf8');

/** `:root` 블록의 토큰만 뽑는다. 다른 규칙 안의 색은 세지 않는다 */
function 토큰들(): Record<string, string> {
  const 블록 = /:root\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
  const 표: Record<string, string> = {};
  for (const m of 블록.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) 표[m[1]!] = m[2]!.trim();
  return 표;
}

/** 화면 폴더의 CSS · 화면 코드 원본(검사 파일 제외). 인라인 style 의 var() 도 같은 토큰을 부른다 */
function 화면원본들(): (readonly [string, string])[] {
  const 폴더 = new URL('.', import.meta.url);
  return readdirSync(폴더)
    .filter((이름) => /\.(css|ts|tsx)$/.test(이름) && !/\.test\.tsx?$/.test(이름))
    .map((이름) => [이름, readFileSync(new URL(이름, 폴더), 'utf8')] as const);
}

describe('화면 토큰 (DESIGN.md)', () => {
  it('방안지 격자를 페이지 바탕에 깔지 않는다', () => {
    const body = /\bbody\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    // 격자는 미완성 목업처럼 읽혀 2026-09-21 에 걷어냈다. 되돌아오면 여기서 걸린다
    expect(body).not.toMatch(/background-image/);
    expect(body).not.toMatch(/background-size/);
  });

  it('쓰는 토큰이 전부 :root 에 정의돼 있다 — 다른 CSS 파일과 화면 코드의 인라인 style 까지', () => {
    // 없는 토큰을 var() 로 부르면 그 속성이 통째로 무효가 된다 — 오류도 안 나고 조용히 사라진다.
    // 2026-09-21 에 --lift 가 실제로 그랬다. 면이 바탕에서 떠 보이지 않는데 아무도 안 죽는다.
    // 2026-10-07 토큰 교체 때 이 검사가 styles.css 만 읽어서 authoringStatus.css 와 인라인 `var(--rule)` 이 빠져나갔다
    const 있는것 = new Set(Object.keys(토큰들()));
    const 없는것 = 화면원본들().flatMap(([이름, 글]) =>
      [...new Set([...글.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!))]
        .filter((토큰) => !있는것.has(토큰))
        .map((토큰) => `${이름}: ${토큰}`),
    );
    expect(없는것, `:root 에 없는 토큰을 부른다 — ${없는것.join(', ')}`).toEqual([]);
  });

  it('대표색을 토큰 하나로 두고, 옛 껍데기 색은 부르지 않는다', () => {
    // 대표색이 앉는 자리의 정본은 화면공통 §8 이다. 자리마다 값을 적으면 한쪽만 바뀐다.
    // 껍데기 색은 2026-10-07 개편에서 대표색 자리로 합쳤다 — 되살아나면 「지금 자리」 색이 두 벌이 된다
    const 표 = 토큰들();
    for (const 이름 of ['--accent', '--accent-edge', '--on-accent', '--link']) {
      expect(표[이름], 이름).toMatch(/^#[0-9a-f]{6}$/i);
    }
    expect(css).not.toMatch(/var\(--chrome\b/);
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

  it('면은 판 8px 이고, 위에 뜨는 상자만 그림자를 갖고, 행에는 그림자가 없다', () => {
    // 원칙 2 (2026-10-07 새 토큰). 판 모서리는 8px 한 가지다.
    // 어두운 바탕에서는 그림자가 면을 가르지 못해 목록 면은 테두리로 가른다 — 그림자는 다른 화면 위에 뜨는 상자만 쓴다.
    // 두께 있는 판(--slab)은 그래프 · 요약 칸에만 둔다 (DESIGN.md 원칙 2)
    const 첫정의 = (면: string) =>
      // 줄 맨 앞에 선 것이 첫 정의다. 좁은 화면 재정의는 들여쓴 채로 뒤에 또 나온다 —
      // 그것을 잡으면 「없다」고 거짓 실패한다 (2026-09-21 실제로 그랬다)
      new RegExp(`^\\${면}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? '';
    for (const 면 of ['.screen', '.modal', '.login-box']) {
      expect(첫정의(면), `${면} 에 radius 8px 이 없다`).toMatch(/border-radius:\s*8px/);
    }
    expect(첫정의('.screen'), '.screen 이 테두리로 갈리지 않는다').toMatch(/border:\s*1px solid var\(--line\)/);
    for (const 면 of ['.modal', '.login-box']) {
      expect(첫정의(면), `${면} 에 그림자가 없다`).toMatch(/box-shadow:/);
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
    // 컨트롤 모서리는 4px 한 가지다 (DESIGN.md 「새 토큰」 크기 단계)
    expect(블록, '줄의 입력칸 규칙이 없다').toMatch(/border-radius:\s*4px/);
  });

  it('펼침 패널이 줄과 다른 바탕을 쓴다', () => {
    // 같은 바탕이면 어디까지가 그 줄의 상세인지 눈으로 못 가른다. 판 안의 우묵한 자리라 --well 이다
    const 블록 = /^\.detail\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(블록, '.detail 에 바탕이 없다').toMatch(/background:\s*var\(--well\)/);
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
    expect(블록, '.head 에 바탕이 없다').toMatch(/background:\s*var\(--head\)/);
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

  it('로그인 상자가 가장 짙은 바탕 위에 판으로 서고 테두리로 갈린다', () => {
    // 들어가는 자리임을 분명히 한다. 2026-09-22 에는 짙은 바탕에 밝은 상자라 밝기 차(15.40)가 갈랐다.
    // 개편 뒤에는 둘 다 어두워 밝기로는 못 가른다(1.1 남짓) — 테두리와 그림자가 가른다 (2026-10-07)
    const 바깥 = /^\.login\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(바깥, '.login 바탕이 메뉴와 같은 가장 짙은 면이 아니다').toMatch(/background:\s*var\(--rail\)/);
    const 상자 = /^\.login-box\s*\{([^}]*)\}/m.exec(css)?.[1] ?? '';
    expect(상자, '.login-box 가 판이 아니다').toMatch(/background:\s*var\(--panel\)/);
    expect(상자, '.login-box 가 테두리로 갈리지 않는다').toMatch(/border:\s*1px solid var\(--line-2\)/);
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

  // 같은 특정도 규칙이 뒤에서 글자 크기를 다시 정해 접힘이 안 먹은 일이 두 번 났다(2026-09-21 · 2026-10-02) — 기계가 막는다
  it('사이드바 링크에 글자 크기를 정하는 규칙마다 접힌 쪽이 같은 링크를 글자 0 으로 누른다', () => {
    const 바깥 = css.replace(/@media[^{]*\{[\s\S]*?\n\}/g, '');
    const 정한것 = [...바깥.matchAll(/^\.side \.side-nav a([^\s{,:]*)\s*\{([^}]*)\}/gm)]
      .filter((m) => /font-size:\s*(?!0)/.test(m[2]!))
      .map((m) => m[1]!);
    for (const 꼬리 of 정한것) {
      const 접힌 = new RegExp(`\\.folded \\.side \\.side-nav a${꼬리.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{([^}]*)\\}`).exec(바깥)?.[1] ?? '';
      expect(접힌, `.side .side-nav a${꼬리} 에 맞는 접힌 규칙이 글자를 0 으로 누르지 않는다`).toMatch(/font-size:\s*0/);
    }
  });

  it('접어도 하위 메뉴를 지우지 않고 글자만 누른다 — 뒤의 하위 글자 크기에 지지 않는다 (PR #132)', () => {
    const 하위 = /\.folded \.side \.side-nav a\.side-sub\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(하위).toMatch(/font-size:\s*0/);
    expect(하위).not.toMatch(/display:\s*none/);
  });

  it('접혀 높이가 0 인 하위 메뉴도 키보드로 닿으면 높이를 되살려 포커스 링이 보인다 (2026-10-07)', () => {
    const 포커스 = /\.folded \.side \.side-nav a\.side-sub:focus-visible\s*\{([^}]*)\}/.exec(css)?.[1] ?? '';
    expect(포커스).toMatch(/padding:\s*[1-9]/);
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

  it('판정 도형 색(--pass · --fail · --na)을 글자색으로 쓰지 않는다 — 글자는 밝은 판(-text)이다', () => {
    // 어두운 바탕에서 도형 색을 글자에 쓰면 줄 hover 바탕 위에서 4.5 를 못 넘는다(--fail 4.10 · --na 4.32).
    // 2026-10-07 토큰 교체 때 CSS 는 옮겼는데 화면 코드의 인라인 style 아홉 자리가 그대로 남았다
    const 걸린것 = 화면원본들().flatMap(([이름, 글]) =>
      [...글.matchAll(/(?<![\w-])color:\s*'?var\(--(?:pass|fail|na)\)/g)].map((m) => `${이름}: ${m[0]}`),
    );
    expect(걸린것).toEqual([]);
  });

  it('판정 세 색과 그 글자 · 옅은 바탕이 전부 있다', () => {
    // 어두운 바탕에서는 도형(점 · 막대)과 글자가 같은 색이면 한쪽이 모자란다 — 둘을 따로 둔다 (DESIGN.md 「새 토큰」)
    const 표 = 토큰들();
    for (const 이름 of ['--pass', '--fail', '--na', '--pass-text', '--fail-text', '--na-text', '--fail-badge']) {
      expect(표[이름], 이름).toMatch(/^#[0-9a-f]{6}$/i);
    }
    for (const 이름 of ['--pass-soft', '--fail-soft', '--na-soft']) {
      expect(표[이름], 이름).toMatch(/^rgba\(/);
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

/** 반투명 바탕(`rgba(...)`)을 아래 면 위에 겹친 실제 색. 옅은 판정 바탕은 판 위에서 섞여 보인다 */
function 겹친색(rgba: string, 아래: string): string {
  const [r, g, b, a] = (/rgba\(([^)]*)\)/.exec(rgba)?.[1] ?? '').split(',').map((v) => Number(v.trim()));
  const 밑 = [1, 3, 5].map((i) => parseInt(아래.slice(i, i + 2), 16));
  return `#${[r!, g!, b!]
    .map((c, i) => Math.round(c * a! + 밑[i]! * (1 - a!)))
    .map((v) => v.toString(16).padStart(2, '0'))
    .join('')}`;
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

  // 글자가 실제로 앉는 면마다 잰다. 표에 없는 짝을 새로 만들면 여기에 더한다 (2026-10-07 새 토큰)
  const 글자 = ['--ink', '--ink-muted', '--ink-faint'];
  const 면 = ['--bg', '--head', '--panel', '--well', '--rail-active'];
  it.each([
    ...글자.flatMap((앞) => 면.map((뒤) => [앞, 뒤, 본문] as const)),
    // 메뉴 — 지금 자리가 아닌 줄은 희미한 잉크, 지금 자리는 본문 잉크
    ['--ink-faint', '--rail', 본문],
    ['--ink', '--rail', 본문],
    ['--link', '--panel', 본문],
    ['--link', '--bg', 본문],
    ['--on-accent', '--accent', 본문],
    ['--pass-text', '--panel', 본문],
    ['--fail-text', '--panel', 본문],
    ['--na-text', '--panel', 본문],
    // 도형 (점 · 막대 · 지금 자리 막대) — UI 요소 기준
    ['--pass', '--panel', 요소],
    ['--fail', '--panel', 요소],
    ['--na', '--panel', 요소],
    ['--na-chart', '--panel', 요소],
    ['--accent', '--rail', 요소],
  ] as const)('%s 가 %s 위에서 기준 %s 를 넘는다', (앞, 뒤, 기준) => {
    const 표 = 토큰들();
    expect(짝명암비(표[앞]!, 표[뒤]!)).toBeGreaterThanOrEqual(기준);
  });

  it.each([
    ['--pass-text', '--pass-soft'],
    ['--fail-text', '--fail-soft'],
    ['--na-text', '--na-soft'],
  ])('판정 배지 %s 가 판 위에 겹친 %s 에서 읽힌다', (앞, 뒤) => {
    const 표 = 토큰들();
    expect(짝명암비(표[앞]!, 겹친색(표[뒤]!, 표['--panel']!))).toBeGreaterThanOrEqual(본문);
  });

  it('꽉 찬 실패 배지의 흰 글자가 읽힌다. 흰 글자 반전은 여기 하나뿐이다', () => {
    // 실패 색(--fail) 위 흰 글자는 3.83 이라 모자란다 — 배지는 한 단계 짙은 --fail-badge 를 쓴다
    expect(짝명암비('#ffffff', 토큰들()['--fail-badge']!)).toBeGreaterThanOrEqual(본문);
  });

  it('괘선은 기준 밖이다. 행 구분은 간격과 배치가 이미 하고 있다', () => {
    // DESIGN.md 가 적어 둔 예외다. 그 사실을 여기에도 남겨 다음 사람이 「빠뜨렸나」 묻지 않게 한다
    const 표 = 토큰들();
    expect(짝명암비(표['--line']!, 표['--panel']!)).toBeLessThan(요소);
  });
});

/**
 * 증적 문서는 종이용 밝은 색을 따로 쓴다 (DESIGN.md 「컨셉」, 2026-10-07).
 *
 * 2026-09-21 부터 2026-10-07 까지는 「화면과 같은 값이다」를 봤다 — `reporting/html.ts` 가 화면 CSS 를 읽지 않고
 * 값을 복사해 두어 한쪽만 고치기 쉬웠기 때문이다. 화면이 어두운 그래파이트로 바뀌면서
 * **같은 배치를 종이용 밝은 색으로 찍는다**로 갈렸다. 같은 값을 볼 이유가 사라졌고,
 * 그 대조가 대신 지켜 주던 명암비를 이제 문서 쪽 값으로 직접 잰다.
 */
describe('증적 문서는 종이용 밝은 색으로 읽힌다', () => {
  const 문서 = readFileSync(new URL('../reporting/html.ts', import.meta.url), 'utf8');
  const 값 = (이름: string) => new RegExp(`${이름}\\s*:\\s*(#[0-9a-fA-F]{6})`).exec(문서)?.[1] ?? '';

  it('바탕이 밝다 — 종이에 찍는다', () => {
    expect(밝기(값('--paper'))).toBeGreaterThan(0.7);
    expect(밝기(값('--sheet'))).toBeGreaterThan(0.7);
  });

  it.each([
    ['--ink', '--sheet'],
    ['--ink', '--paper'],
    ['--ink-muted', '--sheet'],
    ['--ink-faint', '--sheet'],
    ['--pass', '--pass-bg'],
    ['--fail', '--fail-bg'],
    ['--na', '--na-bg'],
    ['--pass', '--sheet'],
    ['--fail', '--sheet'],
  ])('%s 가 %s 위에서 4.5 를 넘는다', (앞, 뒤) => {
    expect(짝명암비(값(앞), 값(뒤))).toBeGreaterThanOrEqual(4.5);
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

  it('눌린 칩의 포커스 테두리가 칩 밖에 선다. 안쪽이면 잉크 바탕에 잉크 선이라 안 보인다', () => {
    expect(규칙(".chip[aria-pressed='true']:focus-visible")).toMatch(/outline-offset:\s*2px/);
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
    // 실행 기록 줄은 창이 좁으면 열을 비율로 바꾼다
    const 좁은구간 = /@media \(max-width: (\d+)px\) \{\s*:root \{([\s\S]*?)\}/.exec(css);
    expect(좁은구간, '고정 폭이 안 들어가는 창을 위한 :root 재정의가 없다').not.toBeNull();
    expect(좁은구간![2], '좁은 구간 값이 여전히 고정 폭이다 — 비율(fr)이어야 넘치지 않는다').toMatch(
      /--run-cols:[^;]*fr/,
    );
    // 케이스 목록은 비율로 줄이지 않고 목록 폭이 고정 열보다 좁으면 줄을 쌓는다 — 비율 열은 입력 칸을 88px 까지 줄였다 (PR #159)
    expect(좁은구간![2], '케이스 목록 열을 비율로 줄이면 입력 칸이 쪼그라든다 — 쌓기(`.case-rows`)가 맡는다').not.toMatch(/--list-cols/);
  });

  // 케이스 목록은 아래 「케이스 목록이 좁으면 줄을 쌓는다」가 전체 선택 줄을 되살린다 (PR #159)
  it('창 620px 미만에서는 실행 기록 · 작성 목록 표머리를 감춘다 — 줄이 3단으로 접혀 칸이 세로로 눕는다', () => {
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

describe('줄 칸 이름 · 판정 묶음 · 실행할 케이스 창 (2026-09-30)', () => {
  it('줄의 라벨은 한 줄로 줄이고 폭이 84px 이다', () => {
    const 블록 = 규칙('.pcell .field label');
    expect(블록).toMatch(/text-overflow:\s*ellipsis/);
    expect(블록).toMatch(/white-space:\s*nowrap/);
    expect(규칙('.pcell .field')).toMatch(/grid-template-columns:\s*84px minmax\(0,\s*1fr\)/);
  });

  it('줄 안의 숫자·예/아니오 칸이 남은 자리에 맞춰 줄어들어 마지막 결과 칸을 안 덮는다', () => {
    expect(규칙('.pcell .field select.narrow')).toMatch(/width:\s*100%/);
    expect(규칙('.pcell .field > div')).toMatch(/min-width:\s*0/);
  });

  it('판정 칸이 고정 폭이라 「실행 이력 없음」이 폭을 못 민다', () => {
    expect(규칙('.device')).toMatch(/(?:^|\s)width:\s*\d+px/);
    expect(규칙('.device')).toMatch(/flex:\s*none/);
    expect(규칙('.device-none')).not.toMatch(/white-space:\s*nowrap/);
    expect(규칙('.device-none')).toMatch(/word-break:\s*keep-all/);
  });

  it('판정 묶음이 두 칸 폭을 늘 차지해 버튼이 같은 자리에 선다', () => {
    expect(규칙('.right .devices')).toMatch(/min-width:\s*\d+px/);
  });

  it('실행 기록의 판정 칸은 줄을 넘기지 않는다', () => {
    expect(규칙('.right.runright')).toMatch(/flex-wrap:\s*nowrap/);
  });

  it('화면 머리는 제목 칸이 모자라면 버튼 묶음을 아랫줄로 보낸다 — 고르면 버튼이 늘어 제목이 세로로 섰다 (WEB-F2-10)', () => {
    expect(규칙('.head')).toMatch(/flex-wrap:\s*wrap/);
    // 제목에 기준 폭이 있어야 버튼 묶음이 그보다 먼저 줄을 넘는다. 기준 폭 없이 1 이면 제목이 0 까지 줄어든다
    expect(규칙('.head-title')).toMatch(/flex:\s*1 1 \d+px/);
    expect(규칙('.head-acts')).not.toMatch(/flex:\s*0 0 auto/);
  });
});

// 창 621~900px(사이드바를 편 상태)에서 열을 비율로 줄여 입력 칸 · 판정 · 버튼이 겹쳤다. 목록 폭이 고정 열 최소 합보다
// 좁으면 줄을 번호 → 케이스명 → 입력값 → 마지막 결과 · 버튼으로 쌓는다(PR #159 시안 A). 배치는 jsdom 이 못 잰다 — 규칙만 본다
describe('케이스 목록이 좁으면 줄을 쌓는다 (PR #159)', () => {
  const 쌓기 = /@container caselist \(max-width: (\d+)px\) \{([\s\S]*?)\n\}/.exec(css);
  const 블록 = 쌓기?.[2] ?? '';

  it('케이스 목록 상자에만 크기 기준을 건다 — 실행 기록 · 테스트 작성은 안 바뀐다', () => {
    expect(규칙('.case-rows')).toMatch(/container:\s*caselist\s*\/\s*inline-size/);
    expect(블록, '쌓기 규칙이 실행 기록 표머리를 건드린다').not.toContain('runhead');
  });

  it('기준 폭은 고정 열 최소 합 + 칸 사이 간격이다 — 열 폭을 바꾸면 같이 움직인다', () => {
    const 열 = 토큰들()['--list-cols'] ?? '';
    const 합 = [...열.matchAll(/(\d+)px/g)].reduce((n, m) => n + Number(m[1]), 0);
    const 칸수 = 열.replace(/minmax\([^)]*\)/g, 'x').trim().split(/\s+/).length;
    const 간격 = Number(/gap:\s*0 (\d+)px/.exec(규칙('.rowhead'))?.[1] ?? 0);
    expect(Number(쌓기?.[1])).toBe(합 + 간격 * (칸수 - 1));
  });

  it('줄을 네 행으로 쌓고 거터 · 고르는 칸이 끝까지 덮는다', () => {
    expect(블록).toMatch(/\.row\.pickable\s*\{[^}]*grid-template-rows:\s*auto auto auto auto/);
    for (const [칸, 행] of [['tcid', 1], ['title', 2], ['params', 3], ['right', 4]] as const) {
      expect(블록, `${칸} 이 ${행}행이 아니다`).toMatch(new RegExp(`\\.row\\.pickable \\.${칸}\\s*\\{[^}]*grid-row:\\s*${행};`));
    }
    expect(블록).toMatch(/\.row\.pickable \.gutter,\s*\.row\.pickable \.pick\s*\{[^}]*grid-row:\s*1 \/ -1/);
  });

  it('칸 이름만 감추고 「이 쪽 전체 선택」 줄은 남긴다', () => {
    expect(블록).toMatch(/\.case-rows \.rowhead\s*\{[^}]*display:\s*grid/);
    expect(블록).toMatch(/\.case-rows \.rowhead \[role='columnheader'\]\s*\{[^}]*display:\s*none/);
    expect(블록).toMatch(/\.case-rows \.pick-all\s*\{[^}]*display:\s*block/);
    expect(규칙('.pick-all'), '넓은 표에서는 전체 선택 글을 감춘다').toMatch(/display:\s*none/);
  });

  it('판정 집계 글자는 판정마다 한 줄이다 — 한 줄로 이으면 60px 디바이스 칸을 넘어 옆 글자와 겹쳤다', () => {
    expect(규칙('.sparktext b')).toMatch(/display:\s*block/);
    expect(규칙('.sparktext'), '집계 묶음 전체를 한 줄로 묶으면 다시 겹친다').not.toMatch(/white-space:\s*nowrap/);
  });

  it('창 620px 규칙에는 케이스 줄 규칙이 남지 않는다 — 쌓기는 목록 폭 한 곳이 정한다', () => {
    const 좁은화면 = /@media \(max-width: 620px\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(좁은화면).not.toContain('.row.pickable');
  });
});

/** 줄 맨 앞에 선 첫 정의의 몸. 좁은 화면 재정의(들여쓴 것)는 잡지 않는다 */
function 첫규칙(선택자: string): string {
  const 이스케이프 = 선택자.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^${이스케이프}\\s*\\{([^}]*)\\}`, 'm').exec(css)?.[1] ?? '';
}

describe('움직임 (DESIGN.md 원칙 4, 2026-10-07)', () => {
  const 초 = (값: string) => (값.endsWith('ms') ? Number.parseFloat(값) / 1000 : Number.parseFloat(값));

  it('시간 토큰이 상한 안이다 — 요소 0.3초 · 처음 등장 전체 0.5초 · 숫자 올라가기 0.4초', () => {
    const 표 = 토큰들();
    expect(초(표['--dur']!)).toBeLessThanOrEqual(0.3);
    expect(초(표['--dur-intro']!)).toBeLessThanOrEqual(0.5);
    expect(초(표['--dur-count']!)).toBeLessThanOrEqual(0.4);
    expect(표['--ease']).toMatch(/^cubic-bezier\(/);
  });

  it('움직임의 시간은 토큰으로만 쓴다 — 숫자로 두는 것은 마우스를 올렸을 때 색이 바뀌는 0.15초 이하 전환뿐이다', () => {
    // 숫자를 자리마다 적으면 상한(0.3초)을 넘는 값이 조용히 들어온다. 토큰은 위 검사가 본다
    const 선언들 = [...css.matchAll(/(?:animation|transition)(?:-duration|-delay)?\s*:\s*([^;]+);/g)];
    expect(선언들.length, '움직임이 하나도 없다').toBeGreaterThan(0);
    for (const 선언 of 선언들) {
      for (const 시간 of 선언[1]!.matchAll(/(?<![\w-])(\d*\.?\d+)(ms|s)\b/g)) {
        expect(초(시간[0]), `${선언[0]} — 0.15초를 넘는 시간은 토큰(--dur …)을 쓴다`).toBeLessThanOrEqual(0.15);
      }
    }
  });

  it('되풀이 움직임은 실행 중 맥박 하나뿐이다', () => {
    const 되풀이 = [...css.matchAll(/animation[\w-]*\s*:\s*([^;]*\binfinite\b[^;]*);/g)].map((m) => m[1]!);
    expect(되풀이.length, '맥박이 없다').toBeGreaterThan(0);
    for (const 값 of 되풀이) expect(값, `${값} — 되풀이는 맥박(--dur-pulse)만 쓴다`).toMatch(/var\(--dur-pulse\)/);
  });

  it('목록 판(.screen)은 투명도로만 나타난다 — transform 이 걸린 동안 포털 없는 모달이 판에 붙어 잘렸다', () => {
    // 2026-10-07 화면 QA 가 움직임을 20초로 늘려 재현했다. 떠오름(translateY)은 모달을 그리지 않는 머리에만 쓴다
    const 판 = [...css.matchAll(/^\.screen\s*\{([^}]*)\}/gm)].map((m) => m[1]!).filter((몸) => /animation:/.test(몸));
    expect(판.length, '.screen 등장 움직임이 없다').toBeGreaterThan(0);
    for (const 몸 of 판) expect(몸).not.toMatch(/떠오름/);
    const 떠오름 = /@keyframes 떠오름\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    const 나타남 = /@keyframes 나타남\s*\{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(떠오름).toMatch(/transform/);
    expect(나타남, '나타남에 transform 을 넣으면 같은 일이 다시 난다').not.toMatch(/transform/);
  });

  it('「움직임 줄이기」를 켠 사람에게는 움직임을 끄고 바뀐 상태를 바로 보인다', () => {
    const 블록 = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css)?.[1] ?? '';
    expect(블록, '움직임 줄이기 규칙이 없다').toMatch(/animation:\s*none\s*!important/);
    expect(블록).toMatch(/transition:\s*none\s*!important/);
  });
});

describe('대표색 자리 (화면공통 §8 「대표색」, 2026-10-07)', () => {
  it('사이드바의 지금 있는 자리가 대표색 막대를 받는다', () => {
    // `.side-nav a[aria-current]` 만 보면 가로 탭 밑줄 규칙을 잡는다 — 사이드바 막대가 빠져도 통과했다 (2026-10-07 코드 검토)
    expect(첫규칙(".side .side-nav a[aria-current='page']")).toMatch(/border-left-color:\s*var\(--accent\)/);
  });

  it('주 버튼은 대표색 위 짙은 글자이고, 나머지 버튼은 테두리만 쓴다', () => {
    const 주 = 첫규칙('.btn');
    expect(주).toMatch(/background:\s*var\(--accent\)/);
    expect(주).toMatch(/color:\s*var\(--on-accent\)/);
    expect(첫규칙('.btn.ghost')).toMatch(/background:\s*transparent/);
  });

  it('링크는 링크 색을 쓴다 — 규칙이 없으면 어두운 바탕에 브라우저 기본 파랑이 앉아 안 읽힌다', () => {
    expect(첫규칙('a')).toMatch(/color:\s*var\(--link\)/);
  });

  it('되돌릴 수 없는 일을 확인하는 버튼은 테두리 버튼이어도 마우스를 올려도 빨간 테두리를 지킨다', () => {
    // `.btn.ghost` · `.btn.ghost:hover` 가 같거나 높은 특정도로 앞에 있어 테두리를 덮었다 (2026-10-07 코드 검토 둘)
    expect(css).toMatch(/^\.btn\.set-warn,\n\.set-warn\s*\{[^}]*border-color:\s*var\(--fail\)/m);
    expect(첫규칙('.btn.set-warn:hover:not(:disabled)')).toMatch(/border-color:\s*var\(--fail\)/);
  });

  it('실행 중 맥박 점은 대표색이다', () => {
    expect(첫규칙('.pulse')).toMatch(/var\(--accent\)/);
  });
});

describe('메뉴 아이콘 (DESIGN.md 원칙 5, 2026-10-07)', () => {
  it('메뉴 아이콘 상자는 20px 이고 줄어들지 않는다', () => {
    const 블록 = 첫규칙('.side-ico');
    expect(블록).toMatch(/width:\s*20px/);
    expect(블록).toMatch(/height:\s*20px/);
    expect(블록).toMatch(/flex:\s*none/);
  });
});

describe('대시보드 그래프 (DESIGN.md 원칙 1 · 2, 2026-10-07)', () => {
  const 규칙들 = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ 선택자: m[1]!.trim(), 몸: m[2]! }));
  const 그래프 = /\.dash-(daily|heat|cov|gauge|trend|day|key|days|weekend|fail-top)\b/;

  it('그래프 규칙에 대표색 · 링크 색이 없다 — 그래프는 판정 색과 회색 단계만 쓴다', () => {
    const 걸린것 = 규칙들.filter((r) => 그래프.test(r.선택자) && /var\(--(accent|link)\b/.test(r.몸)).map((r) => r.선택자);
    expect(걸린것).toEqual([]);
    expect(규칙들.filter((r) => 그래프.test(r.선택자)).length, '그래프 규칙이 없다').toBeGreaterThan(10);
  });

  it('누를 수 없는 그래프 판은 마우스를 올려도 들리지 않는다', () => {
    const 들림 = 규칙들.filter(
      (r) => /\.dash-(slab|daily|heat|cov|rate)\b[^,]*:hover/.test(r.선택자) && /transform|box-shadow|translate/.test(r.몸),
    );
    expect(들림.map((r) => r.선택자)).toEqual([]);
    expect(첫규칙('.dash-slab')).not.toMatch(/cursor:\s*pointer/);
  });

  it('히트맵 칸 색은 토큰 셋(0 · 2 · 3 단계)이고 일별 막대는 판정 색이다', () => {
    const 칸 = (이름: string) => 규칙들.find((r) => r.선택자 === `.dash-heat-row i.${이름}`)?.몸 ?? '';
    expect(칸('h0')).toMatch(/var\(--heat-0\)/);
    expect(칸('h1')).toMatch(/var\(--heat-2\)/);
    expect(칸('h2')).toMatch(/var\(--heat-3\)/);
    const 막대 = (이름: string) => 규칙들.find((r) => r.선택자 === `.dash-day rect.${이름}`)?.몸 ?? '';
    expect(막대('p')).toMatch(/var\(--pass-chart\)/);
    expect(막대('n')).toMatch(/var\(--na-chart\)/);
    expect(막대('f')).toMatch(/var\(--fail\)/);
  });
});

describe('대시보드 좁은 화면 · 표 · 포커스 (PR #173 독립 검사)', () => {
  const 글 = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const 모든규칙 = [...글.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    자리: m.index!,
    선택자들: m[1]!.split(',').map((s) => s.trim()),
    몸: m[2]!,
  }));

  /** `@container` 덩어리의 시작 · 끝 자리 */
  function 컨테이너덩어리들(): { 시작: number; 끝: number }[] {
    return [...글.matchAll(/@container[^{]*\{/g)].map((m) => {
      let 깊이 = 1;
      let 끝 = m.index! + m[0].length;
      while (깊이 > 0) {
        if (글[끝] === '{') 깊이 += 1;
        if (글[끝] === '}') 깊이 -= 1;
        끝 += 1;
      }
      return { 시작: m.index!, 끝 };
    });
  }

  const 몸들 = (선택자: string): string =>
    모든규칙
      .filter((r) => r.선택자들.includes(선택자))
      .map((r) => r.몸)
      .join('\n');

  it('대시보드 좁은 화면 컨테이너 쿼리가 그 선택자의 기본 규칙보다 뒤에 있다 — 같은 우선순위는 뒤 규칙이 이긴다', () => {
    const 덩어리들 = 컨테이너덩어리들();
    expect(덩어리들.length, '컨테이너 쿼리가 없다').toBeGreaterThan(0);
    const 늦은기본: string[] = [];
    for (const 덩어리 of 덩어리들) {
      const 안 = 모든규칙.filter((r) => r.자리 > 덩어리.시작 && r.자리 < 덩어리.끝);
      for (const 선택자 of 안.flatMap((r) => r.선택자들).filter((s) => s.startsWith('.dash'))) {
        for (const 기본 of 모든규칙) {
          const 밖 = !덩어리들.some((d) => 기본.자리 > d.시작 && 기본.자리 < d.끝);
          if (밖 && 기본.선택자들.includes(선택자) && 기본.자리 > 덩어리.시작) 늦은기본.push(선택자);
        }
      }
    }
    expect([...new Set(늦은기본)]).toEqual([]);
  });

  it('서비스별 표의 이름 칸은 최소 폭이 있고 통과율은 한 줄이다 — 긴 머리글이 폭을 가져가 이름이 한 글자씩 꺾였다', () => {
    expect(몸들('.dash-svc .dash-table td:first-child')).toMatch(/min-width:\s*(1[2-9]\d|[2-9]\d\d)px/);
    expect(몸들('.dash-rate20')).toMatch(/white-space:\s*nowrap/);
  });

  it('신규 실패 표의 TC 아래 서비스 이름은 말줄임이다 — 길면 디바이스 · 실행 열이 스크롤 뒤로 밀렸다', () => {
    const 몸 = 몸들('.dash-sub');
    expect(몸).toMatch(/max-width:\s*\d+px/);
    expect(몸).toMatch(/overflow:\s*hidden/);
    expect(몸).toMatch(/text-overflow:\s*ellipsis/);
  });

  it('통과율 칸의 「직전 14일」 글자는 줄이 꺾이지 않는다', () => {
    expect(몸들('.dash-prev span')).toMatch(/white-space:\s*nowrap/);
  });

  it('「직전 14일」 줄은 비어 있는 퍼센트 칸을 빼서 글자가 숫자 위로 안 겹친다 — 줄이 꺾이지 않게 한 뒤 1440 에서 겹쳤다', () => {
    expect(몸들('.dash-lines li.dash-prev')).toMatch(/grid-template-columns:\s*12px minmax\(0, 1fr\) auto;/);
  });

  it('신규 실패 링크와 커버리지 링크의 포커스 고리는 잉크 2px 다 — 브라우저 기본 파랑을 안 쓴다', () => {
    for (const 선택자 of ['.dash-test a.ink:focus-visible', '.dash-cov-name a:focus-visible']) {
      expect(몸들(선택자), 선택자).toMatch(/outline:\s*2px solid var\(--ink\)/);
    }
  });

  it('포커스를 못 받는 「외 N건」에는 포커스 규칙이 없다', () => {
    expect(글).not.toMatch(/\.dash-live-more:focus-visible/);
  });
});
