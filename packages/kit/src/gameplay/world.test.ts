// 게임 세계 코드 — 본보기 세계 · 게임별 세계가 결과를 바꾼다 · 못 쓰는 이름 · 객체를 타고 나가기와 문자열로 코드 만들기 막기 · 함수가 빠진 세계 · 돌려준 배열의 메서드로 나가기 막기 · 던진 때 · 내장 얼리기
import { describe, expect, it } from 'vitest';

import { 돌리기 } from './sim.js';
import { 입력읽기 } from './simInput.js';
import { 기본세계글, 세계만들기, 세계틀읽기 } from './world.js';

const 기본 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
  곳: 'stage:시험',
  지킬것: { 체력: 10, 자리: [10, 0] },
  길: { 가: [[0, 0], [10, 0]] },
  적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }],
  웨이브: [{ 이름: '1웨이브', 출현: [{ 종류: '슬라임', 수: 3, 간격: 3, 길: '가' }] }],
  설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }],
  설치물둘레: { 반경: 0.5, 근거: 'rule:둘레' },
  자리후보: [[5, 1]],
  캐릭터: { 자리: [5, 1], 걷기속도: 1 },
  재화: { 시작: 0 },
  볼값연결: { 웨이브: '웨이브', 지킬것: '세계수', 재화: '고기' },
  정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
  ...덧,
});
const 한판 = (덧: Record<string, unknown> = {}) => {
  const m = 입력읽기(기본(덧));
  if ('틀림' in m) throw new Error(m.틀림);
  return 돌리기(m, m.정책들[0]!);
};
/** 본보기 세계의 한 줄을 바꾼 게임별 세계 */
const 고친세계 = (앞: string, 뒤: string): string => {
  expect(기본세계글).toContain(앞);
  return 기본세계글.replace(앞, 뒤);
};

describe('게임 세계 코드', () => {
  it('세계글이 없으면 본보기 세계로 돌고, 본보기 글을 그대로 넣어도 같은 판이다', () => {
    expect(한판().웨이브[0]).toMatchObject({ 처치: 3, 끝재화: 3 });
    expect(한판({ 세계글: 기본세계글 })).toEqual(한판());
  });

  it('게임별 세계가 규칙을 바꾸면 시뮬 결과가 그만큼 바뀐다 — 엔진에 칸을 더하지 않고 게임 규칙을 코드로 넣는다', () => {
    const 두배 = 고친세계('else 재화 += 보상;', 'else 재화 += 보상 * 2;');
    expect(한판({ 세계글: 두배 }).웨이브[0]).toMatchObject({ 처치: 3, 끝재화: 6 });
  });

  it('가져오기 · 시각 · 무작위 · 객체를 타고 나가는 이름은 글에서 막는다 — 주석에 쓴 것은 괜찮다', () => {
    for (const 나쁜 of ['require("fs")', 'Date.now()', 'Math.random()', '({}).constructor', 'process.exit()', 'globalThis.x']) {
      expect(세계틀읽기(`(function () { const x = ${나쁜}; return {}; })`)).toMatchObject({ 틀림: expect.stringContaining('쓸 수 없다') });
    }
    expect(세계틀읽기('// Date 는 주석이라 괜찮다\n(function () { return {}; })')).toBeTypeOf('function');
    expect(세계틀읽기('({ a: 1 })')).toMatchObject({ 틀림: expect.stringContaining('함수 하나다') });
    expect(세계틀읽기('(function (')).toMatchObject({ 틀림: expect.stringContaining('못 읽었다') });
  });

  it('글자를 이어 붙여 검사를 지나도 문자열로 코드를 못 만들고, 함수가 빠진 세계는 받지 않는다', () => {
    const 숨김 = 고친세계('읽기() {', "읽기() { ({})['con' + 'structor']['con' + 'structor']('return 1')();");
    expect(입력읽기(기본({ 세계글: 숨김 }))).toMatchObject({ 틀림: expect.stringContaining('게임 세계 코드') });
    const 빠짐 = 고친세계('    결과() {', '    결과없음() {');
    const m = 입력읽기(기본());
    if ('틀림' in m) throw new Error(m.틀림);
    expect(() => 세계만들기({ ...m, 세계글: 빠짐 })).toThrow('결과 가 없다');
    expect(입력읽기(기본({ 세계글: 빠짐 }))).toMatchObject({ 틀림: expect.stringContaining('결과 가 없다') });
  });

  it('세계가 돌려준 배열에 자기 filter 를 달아도 플랫폼 함수를 못 받아 밖으로 못 나간다 — 돌려받은 값은 플랫폼이 복사해 쓴다', () => {
    const 나가기 = "const 나가기 = (cb) => { try { Object.getPrototypeOf(cb)['con' + 'structor']('this.세계탈출 = 1')(); } catch (e) { } };";
    const 자기filter = 고친세계('    적들() { return 산적().map(', `    적들() { ${나가기} const 원래 = [].filter; const a = 산적().map((e) => ({ 번호: e.번호, x: 0, z: 0, 남은: 1 })); Object.defineProperty(a, 'filter', { value: function (cb) { 나가기(cb); return 원래.call(this, cb); } }); return a; },\n    옛적들() { return 산적().map(`);
    한판({ 세계글: 자기filter, 정책: [{ 조건: [{ 값: '캐릭터둘레적수', 반경: 99, 비교: '>=', 기준: 0 }], 행동: { 무엇: '놓기', 대상: '탑' } }] });
    expect((globalThis as Record<string, unknown>).세계탈출).toBeUndefined();
  });

  it('세계가 돌다 던지면 어느 함수가 몇 초에 던졌는지 붙여 던진다', () => {
    const 던짐 = 고친세계('    흘리기(t, 캐x, 캐z) {', "    흘리기(t, 캐x, 캐z) { if (t >= 5) throw new Error('5초 넘음');");
    expect(() => 한판({ 세계글: 던짐 })).toThrow('게임 세계 코드 흘리기 가 5초에 던졌다 — 5초 넘음');
  });

  it('내장을 바꾸거나 this 로 전역에 닿는 세계는 받지 않아 한 판이 바꾼 것이 다음 판으로 안 넘어가고, 이어 붙인 이름으로도 무작위 · 시각을 못 쓴다', () => {
    for (const 나쁜 of ['Math.판수 = 1', "[]['con' + 'cat'].x = 1", "Object.getPrototypeOf([]).filter = 1", '(function () { return this; })().판수 = 1', "Math['ran' + 'dom']()", "(function () { return this; })()['Da' + 'te'].now()"]) {
      expect(입력읽기(기본({ 세계글: 고친세계('    읽기() {', `    읽기() { ${나쁜};`) }))).toMatchObject({ 틀림: expect.stringContaining('게임 세계 코드') });
    }
  });
});
