// 게임플레이 진행 조건 — 시뮬 줄 · 이김 · 입력 해시 · 끝 웨이브 · 다시 돌리기 · 정책 인자 · 손 시간 · 행동기록 · 재현 · 기계가 넣는 기대 · 시뮬불가
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 시뮬, 줄초안 } from './authoring-game-calc.js';
import { 곳글, 곳셈, 남은깰곳, 놀이막기 } from './authoring-learn-play.js';
import { 시뮬막기, 시뮬불가검사 } from './authoring-learn-sim.js';

let 자료: string;
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-sim-'));
  mkdirSync(join(자료, 'game-calc'));
  mkdirSync(join(자료, 'game-play'));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

const 곳 = 'stage:시험';
const 웨 = (보스 = false) => ({ ...(보스 ? { 보스: true } : {}), 쉬는초: 1, 출현: [{ 종류: '슬라임', 수: 1, 간격: 0, 길: '가' }] });
const 입력 = (덧: Record<string, unknown> = {}): Record<string, unknown> => ({
  계산: '시뮬', 곳,
  지킬것: { 체력: 5, 자리: [10, 0] },
  길: { 가: [[0, 0], [10, 0]] },
  적종류: [{ 이름: '슬라임', 체력: 10, 속도: 1, 닿으면피해: 5, 보상: 1 }],
  웨이브: [웨(), 웨(), 웨(true)],
  설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 5, 간격: 2 }] }],
  자리후보: [[5, 1]],
  캐릭터: { 자리: [5, 1], 걷기속도: 1 },
  재화: { 시작: 0 },
  볼값연결: { 웨이브: '웨이브', 지킬것: '세계수' },
  정책: [{ 조건: [], 행동: { 무엇: '놓기', 대상: '탑' } }],
  ...덧,
});
type 줄 = { kind: string; key: string; learned: { text: string; belief: string; data: Record<string, unknown> } | null };
const 줄 = (kind: string, key: string, data: Record<string, unknown>): 줄 => ({ kind, key, learned: { text: 'ㄱ', belief: 'GUESS', data } });
const 곳줄 = (data: Record<string, unknown> = {}) => 줄('STAGE', 곳, { 맵: { 적: { 주소: '/s', 값: [[0, 0]], 본때: 'a' } }, ...data });
const 계획줄 = 줄('TRIAL', 'trial:가', { 곳 });

/** 입력 파일을 쓰고 계산기로 돌려 지도에 적을 CALC 줄을 만든다 */
function 계산줄(이름: string, x: Record<string, unknown>): 줄 {
  const 경로 = join(자료, 'game-calc', `${이름}.json`);
  const 글 = JSON.stringify(x);
  writeFileSync(경로, 글);
  const r = 시뮬(x, { 경로, 글 });
  if ('틀림' in r) throw new Error(r.틀림);
  return 줄초안({ ...r, 이름 }, x) as unknown as 줄;
}
const 지도쓰기 = (들: 줄[]): void => {
  writeFileSync(join(자료, 'game-map.txt'), '');
  writeFileSync(join(자료, 'game-learned.json'), JSON.stringify({ elements: 들.map((x) => ({ ...x, name: x.key })) }));
};
const 계획 = { 곳, 쓸것: ['calc:가'], 볼값: [{ 이름: '웨이브', 주소: '/w' }, { 이름: '세계수', 주소: '/t' }] };
const 정책 = (c: 줄): unknown => (c.learned!.data.결과 as { 정책: unknown }).정책;
const 판쓰기 = (이름: string, 행동기록: unknown[], 계산: Record<string, string>, 어긋남: unknown = null, 웨이브 = 3): void =>
  writeFileSync(join(자료, 'game-play', `${이름}.json`), JSON.stringify({ 값: { 이김: false, 행동기록 }, 값기록: { 계획: 'trial:가', 볼값: [], 간격ms: 2000, 때: [{ 초: 0, 값: { 웨이브 } }], 어긋남, 화면다름: [], 계산 } }));
const 막기 = (계: typeof 계획, 들: 줄[], ...남은: [string, Parameters<typeof 시뮬막기>[3], unknown[]]) => 시뮬막기(계, 들 as never, ...남은);
const 기록들 = async () => (await import('./authoring-learn-check.js')).판기록들(자료);

describe('시뮬로 이기는 안이 있어야 판이 돈다', () => {
  it('이긴 시뮬 줄 · 같은 입력 · 정책 인자가 있으면 웨이브마다 기대를 더해 돌리고, 하나라도 빠지면 막는다', async () => {
    const c = 계산줄('가', 입력());
    const 들 = [곳줄(), 계획줄, c];
    expect(막기({ ...계획, 쓸것: [] }, 들, 자료, [], [])).toMatchObject({ 막음: expect.stringContaining('시뮬레이션으로 이기는 안이 있어야') });
    expect(막기(계획, 들, 자료, [], [])).toMatchObject({ 막음: expect.stringContaining('고른 정책이 없다') });
    const r = 막기(계획, 들, 자료, await 기록들(), [{ 정책: 정책(c) }]);
    expect(r).toEqual({ 기대: [1, 2, 3].map((k) => ({ 값: '세계수', 비교: '>=', 기준: 4, 부터: { 값: '웨이브', 기준: k }, 까지: { 값: '웨이브', 기준: k } })) });
    expect(막기(계획, [곳줄({ 맵: { 적: { 없음: '적이 안 온다' } } }), 계획줄], 자료, [], [])).toBeNull();
  });

  it('이기는 안이 없다고 나온 줄 · 입력이 바뀐 줄 · 줄 글자만 이김으로 고친 줄은 막는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    expect(막기(계획, [곳줄(), 계획줄, 짐], 자료, [], [정책(짐)])).toMatchObject({ 막음: expect.stringContaining('이기는 안이 없다') });
    const 고친 = { ...짐, learned: { ...짐.learned!, data: { ...짐.learned!.data, 결과: { ...(짐.learned!.data.결과 as object), 이김: true } } } };
    expect(막기(계획, [곳줄(), 계획줄, 고친], 자료, [], [정책(짐)])).toMatchObject({ 막음: expect.stringContaining('다시 돌리니') });
    const c = 계산줄('가', 입력());
    writeFileSync(join(자료, 'game-calc', '가.json'), JSON.stringify(입력({ 재화: { 시작: 1 } })));
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, [], [정책(c)])).toMatchObject({ 막음: expect.stringContaining('바뀌었다') });
  });

  it('끝 웨이브 · 보스까지 넣어야 한다 — 보스가 없으면 STAGE 끝웨이브 수만큼', () => {
    const 보스없음 = 계산줄('가', 입력({ 웨이브: [웨(), 웨()] }));
    expect(막기(계획, [곳줄(), 계획줄, 보스없음], 자료, [], [정책(보스없음)])).toMatchObject({ 막음: expect.stringContaining('보스 웨이브') });
    expect(막기(계획, [곳줄({ 끝웨이브: { 수: 2, 출처: '빌드 데이터' } }), 계획줄, 보스없음], 자료, [], [정책(보스없음)])).toHaveProperty('기대');
    expect(막기(계획, [곳줄({ 끝웨이브: { 수: 6, 출처: '빌드 데이터' } }), 계획줄, 보스없음], 자료, [], [정책(보스없음)])).toMatchObject({ 막음: expect.stringContaining('끝웨이브 6') });
  });

  it('판을 하나 더 돌면 그 판 손 시간으로 다시 시뮬해야 하고, 판 함수가 행동기록을 안 돌려주면 막는다', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    판쓰기('20261128000000000-판', [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 0, 끝초: 1.5 }], { 'calc:가': JSON.stringify(c.learned!.data) });
    expect(막기(계획, [곳줄(), 계획줄, c], 자료, await 기록들(), [정책(c)])).toMatchObject({ 막음: expect.stringContaining('다시 안 돌렸다') });
    const 다시 = 계산줄('가', 입력());
    expect((다시.learned!.data.결과 as { 손: unknown }).손).toEqual({ 행동초: 1.5, 기록: '20261128000000000-판' });
    expect(막기(계획, [곳줄(), 계획줄, 다시], 자료, await 기록들(), [정책(다시)])).toHaveProperty('기대');
    판쓰기('20261128000100000-판', [], { 'calc:가': JSON.stringify(다시.learned!.data) });
    expect(막기(계획, [곳줄(), 계획줄, 다시], 자료, await 기록들(), [정책(다시)])).toMatchObject({ 막음: expect.stringContaining('행동기록을 안 돌려줬다') });
  });

  it('판이 시뮬과 어긋났으면 그 판 행동기록으로 재현해 같은 웨이브(±1)에서 져야 다음 판이 돈다', async () => {
    const c = 계산줄('가', 입력());
    지도쓰기([곳줄(), 계획줄, c]);
    const 어긋남 = { 초: 12, 값이름: '세계수', 값: 0, 기대: '세계수 >= 4' };
    판쓰기('20261128000000000-판', [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 도착초: 6, 끝초: 7.5 }], { 'calc:가': JSON.stringify(c.learned!.data) }, 어긋남, 1);
    const 안맞춤 = 계산줄('가', 입력());
    expect(막기(계획, [곳줄(), 계획줄, 안맞춤], 자료, await 기록들(), [정책(안맞춤)])).toMatchObject({ 막음: expect.stringContaining('재현: { 기록: "20261128000000000-판" }') });
    const 맞춤 = 계산줄('가', 입력({ 재현: { 기록: '20261128000000000-판' } }));
    expect(맞춤.learned!.data.결과).toMatchObject({ 재현: { 이김: false, 웨이브수: 0 } });
    expect(막기(계획, [곳줄(), 계획줄, 맞춤], 자료, await 기록들(), [정책(맞춤)])).toHaveProperty('기대');
    판쓰기('20261128000100000-판', [{ 초: 0, 행동: '놓기', 대상: '탑', 자리: [5, 1], 끝초: 0.1 }], { 'calc:가': JSON.stringify(맞춤.learned!.data) }, 어긋남, 1);
    const 못맞춤 = 계산줄('가', 입력({ 재현: { 기록: '20261128000100000-판' } }));
    expect(막기(계획, [곳줄(), 계획줄, 못맞춤], 자료, await 기록들(), [정책(못맞춤)])).toMatchObject({ 막음: expect.stringContaining('시뮬이 판 20261128000100000-판 을 못 맞춘다') });
  });
});

describe('시뮬불가 — 판 없이 넘기고 다른 맵을 다 돈 뒤 한 번 다시 본다', () => {
  const 결과 = { 주소: '/결과', 깸: '승리', 짐: '패배' };
  const 불가곳 = (짐: 줄, 다시봄?: true) => 곳줄({ 결과, 시뮬불가: { 계산: 짐.key, 웨이브: '1웨이브', 모자람: '초당 피해 3 모자람', ...(다시봄 ? { 다시봄 } : {}) } });

  it('적는 명령은 그 곳의 진 시뮬 줄을 가리켜야 받는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] }, 설치물종류: [{ 이름: '탑', 레벨: [{ 값: 0, 사거리: 3, 공격력: 1, 간격: 2 }] }] }));
    const 이김 = 계산줄('나', 입력());
    const 찾기 = (k: string) => [짐, 이김].find((x) => x.key === k) as never;
    expect(시뮬불가검사(곳, 불가곳(짐).learned!.data, 찾기)).toBeNull();
    expect(시뮬불가검사(곳, 불가곳(이김).learned!.data, 찾기)).toContain('이기는 안이 있다');
    expect(시뮬불가검사('stage:다른', 불가곳(짐).learned!.data, 찾기)).toContain('시뮬 CALC 줄이 아니다');
    expect(시뮬불가검사(곳, { 시뮬불가: { 계산: 'calc:가' } }, 찾기)).toContain('data.시뮬불가 는');
    expect(시뮬불가검사(곳, { 끝웨이브: { 수: 6 } }, 찾기)).toContain('data.끝웨이브');
  });

  it('다른 깰 곳이 남았으면 넘긴 곳 계획을 막고, 다 돌았으면 다시 시뮬 남은 곳으로 열고, 다시봄이면 닫는다', () => {
    const 짐 = 계산줄('가', 입력({ 지킬것: { 체력: 4, 자리: [10, 0] } }));
    const 다른 = 줄('STAGE', 'stage:다른', { 결과 });
    const 들 = [불가곳(짐), 다른, 계획줄, 짐];
    expect(남은깰곳(들 as never, [])).toEqual(['아직 못 깬 곳 1(stage:다른 0판)']);
    expect(놀이막기({ 곳, 쓸것: ['calc:가'] }, 들 as never, [])).toContain('다른 맵을 다 돈 뒤에');
    const 깬다른 = 줄('STAGE', 'stage:다른', { 결과, 상태: '못깸', 까닭: 'ㄱ' });
    const 다돎 = [불가곳(짐), 깬다른, 계획줄, 짐];
    expect(남은깰곳(다돎 as never, [])).toEqual([expect.stringContaining('다시 시뮬 남은 곳 1(stage:시험)')]);
    expect(놀이막기({ 곳, 쓸것: ['calc:가', `${곳}#적`] }, 다돎 as never, [])).toBeNull();
    const 닫음 = [불가곳(짐, true), 깬다른, 계획줄, 짐];
    expect(남은깰곳(닫음 as never, [])).toEqual([]);
    expect(놀이막기({ 곳, 쓸것: ['calc:가'] }, 닫음 as never, [])).toContain('다시 시뮬해도');
    expect(곳글(곳셈(닫음 as never, []).find((x) => x.열쇠 === 곳)!)).toBe('stage:시험 시뮬레이션상 불가(1웨이브 · 초당 피해 3 모자람 · 다시 봐도 불가)');
  });
});
