// 빠른 검사 게임 갈래 — 지도 열쇠 읽기와 게임 케이스 형식 판정을 본다 (도메인/게임 §3.10 「작성 — 한 바퀴」 6)

import { describe, expect, it } from 'vitest';

import { 게임형식, 스모크틀림, 지도열쇠들 } from './authoring-check-game.js';

const 지도글 = [
  '# 게임 지도 — 요소 3개. 기대값의 근거가 아니다 — 근거는 표준 기획서 항목뿐이다',
  '',
  '## 게임 데이터 (DATA) — 1개',
  '- item:sword_long · 장검 · 기획서 {"공격력":14} · 근거 ASH-REQ-012 · 서버 값 대조 전 · 거친 케이스 없음',
  '## 상태 바뀜 (MOVE) — 1개',
  '- move:성향 선량→보라 · 선량에서 보라로 · 서버 값 대조 전 · 케이스 ASH-FN-003',
  '## 월드 (WORLD) — 1개',
  '- zone:Town · 마을 · 서버 값 대조 전 · 거친 케이스 없음',
].join('\n');

const 케이스 = (머리: string, 몸통 = '{ game, admin }', 안 = '') => `import { defineCase, test, verify } from '@platform/kit';

export const spec = defineCase({
  tcId: 'ASH-FN-012',
  name: '강화하면 장검이 사라진다',
  ${머리}
  params: null,
  expected: null,
});

test(spec, async (${몸통}) => {
  ${안}
  await verify('장검이 가방에서 사라진다', await game.find('sword_long'), null);
});
`;

describe('지도열쇠들', () => {
  it('지도 글의 요소 줄 열쇠(빈칸이 든 것도)와 이번 요소 파일 열쇠를 합치고, 이번에 지우는 열쇠는 뺀다', () => {
    const r = 지도열쇠들(지도글, JSON.stringify({ elements: [{ kind: 'WORLD', key: 'zone:Dungeon', name: '던전' }], remove: ['zone:Town'] }));
    expect([...r.열쇠].sort()).toEqual(['item:sword_long', 'move:성향 선량→보라', 'zone:Dungeon']);
    expect(r.까닭).toBeUndefined();
  });

  it('지도 글 머리 · 묶음 제목은 열쇠가 아니다 · 둘 다 없으면 빈 지도', () => {
    expect(지도열쇠들(null, null).열쇠.size).toBe(0);
    expect([...지도열쇠들(지도글, null).열쇠]).not.toContain('#');
  });

  it('요소 파일이 JSON 이 아니면 지난 지도만 쓰고 까닭을 남긴다', () => {
    const r = 지도열쇠들(지도글, '{');
    expect(r.열쇠.size).toBe(3);
    expect(r.까닭).toMatch(/JSON/);
  });
});

describe('게임형식 — 게임 작성', () => {
  const 지도 = new Set(['item:sword_long', 'zone:Town']);
  const 본다 = (글: string, 경로 = 'tests/ash/ASH-FN-012.spec.ts') => 게임형식([{ 경로, 글 }], 지도);

  it('지도에 있는 요소 · android · 게임 몸통이면 통과', () => {
    expect(본다(케이스("platforms: ['android'],\n  elements: ['item:sword_long', 'zone:Town'],"))).toEqual([]);
  });

  it('빈 열쇠 · 겹친 열쇠는 kit 처럼 버리고 본다', () => {
    expect(본다(케이스("platforms: ['android'],\n  elements: ['zone:Town', '', 'zone:Town'],"))).toEqual([]);
  });

  it('elements 칸이 없어도 통과한다 — 닿는 요소가 없는 케이스', () => {
    expect(본다(케이스("platforms: ['android'],"))).toEqual([]);
  });

  it('지도에 없는 요소를 짚는다', () => {
    expect(본다(케이스("platforms: ['android'],\n  elements: ['item:sword_long', 'item:지어낸칼'],"))).toEqual([
      'tests/ash/ASH-FN-012.spec.ts — 요소 item:지어낸칼 가 게임 지도에 없다. game-elements.json 에 먼저 적거나 game-map.txt 의 열쇠를 쓴다',
    ]);
  });

  it('elements 가 변수 · 축약이면 글자 배열로 적으라고 한다', () => {
    expect(본다(케이스("platforms: ['android'],\n  elements: 요소들,"))[0]).toMatch(/글자 배열 리터럴/);
    expect(본다(케이스("platforms: ['android'],\n  elements,"))[0]).toMatch(/글자 배열 리터럴/);
  });

  it('android 가 아니거나 몸통이 page 를 꺼내면 짚는다', () => {
    expect(본다(케이스("platforms: ['desktop'],"))).toEqual(['tests/ash/ASH-FN-012.spec.ts — 게임 케이스의 platforms 는 [\'android\'] 하나다']);
    expect(본다(케이스("platforms: ['android'],", '{ page, game }'))).toEqual(['tests/ash/ASH-FN-012.spec.ts — 게임 케이스 몸통에는 page 가 없다. game · admin · driver 를 쓴다']);
  });

  it('Appium driver 사슬에 넘긴 { x, y } 좌표를 케이스 · 화면 객체 어디서든 짚는다', () => {
    expect(본다(케이스("platforms: ['android'],", '{ game, driver }', "await driver.action('pointer').move({ x: 120, y: 640 }).down().up().perform();"))).toEqual([
      'tests/ash/ASH-FN-012.spec.ts:12 — 좌표({ x, y })를 쓴다. 오브젝트 이름이나 / 경로로 찾는다',
    ]);
    expect(본다("export class 강화창 {\n  누르기(driver: Browser) {\n    return driver.execute('mobile: clickGesture', { 'x': 1, 'y': 2 });\n  }\n}\n", 'tests/ash/pages/enhance.page.ts')).toEqual([
      'tests/ash/pages/enhance.page.ts:3 — 좌표({ x, y })를 쓴다. 오브젝트 이름이나 / 경로로 찾는다',
    ]);
  });

  it('driver 밖의 { x, y } — 어드민 순간이동 본문 · 위치 기대값 · 한쪽만 든 객체 — 는 좌표가 아니다', () => {
    const 안 = "await admin.post('/admin/teleport', { data: { x: 10, y: 5 } });\n  await verify('마을 광장에 있다', await game.get('/Player', 'position'), { x: 10, y: 5 });\n  await driver.back({ x: 3 });";
    expect(본다(케이스("platforms: ['android'],", '{ game, admin, driver }', 안))).toEqual([]);
  });

  it('platforms 는 따옴표 꼴과 상관없이 android 하나만 받는다', () => {
    expect(본다(케이스('platforms: ["android"],'))).toEqual([]);
    expect(본다(케이스("platforms: ['android',] as const,"))).toEqual([]);
    expect(본다(케이스("platforms: ['android', 'desktop'],"))[0]).toMatch(/platforms/);
  });
});

describe('게임형식 — 게임 아닌 작성', () => {
  it('케이스가 elements 를 적었을 때만 짚는다', () => {
    expect(게임형식([{ 경로: 'tests/mku/MKU-FN-001.spec.ts', 글: 케이스("platforms: ['desktop'],\n  elements: ['item:sword_long'],", '{ page }') }], null)).toEqual([
      'tests/mku/MKU-FN-001.spec.ts — 게임 애플리케이션 작성이 아닌데 elements 를 적었다. 칸을 뺀다',
    ]);
  });

  it('웹 케이스의 page 몸통 · { x, y }(상자 좌표 비교) · 화면 파일은 짚지 않는다', () => {
    const 웹 = 케이스("platforms: ['desktop', 'mobile'],", '{ page }', 'const 상자 = { x: 0, y: 0, width: 10 };');
    expect(게임형식([{ 경로: 'tests/mku/MKU-FN-001.spec.ts', 글: 웹 }, { 경로: 'tests/mku/pages/cart.page.ts', 글: 'export const 주소 = { x: 1, y: 2 };' }], null)).toEqual([]);
  });
});

describe('스모크틀림 — 게임 작성의 폴더 전체', () => {
  it('폴더에 smoke: true 케이스가 하나도 없으면 짚는다', () => {
    const 글들 = [케이스("platforms: ['android'],"), 케이스("platforms: ['android'],\n  smoke: false,")];
    expect(스모크틀림('ash', 글들)).toEqual({
      수: 0,
      틀림: ['tests/ash — 스모크 케이스(smoke: true)가 0건이다. 다 합친 뒤 핵심 경로(로그인 → 캐릭터 → 월드 입장 → 사냥 → 상점)를 게임 화면으로 지나는 정상 기능 케이스 5~10건에 단다(tpx-cases game.md §5)'],
    });
  });

  it('한 건이라도 있으면 통과하고 수를 센다 — 글자 true 만 센다', () => {
    const 글들 = [케이스("platforms: ['android'],\n  smoke: true,"), 케이스("platforms: ['android'],\n  smoke: true,"), 케이스("platforms: ['android'],\n  smoke: 켬,"), 'export const 스모크 = { smoke: true };'];
    expect(스모크틀림('ash', 글들)).toEqual({ 수: 2, 틀림: [] });
  });
});
