// 곳(STAGE 줄) — 맵 일곱 종류 검사 · 다 안 채운 곳이 있으면 배우기가 안 끝남 (도메인/게임 §3.10 「맵 파악」)
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 지도읽기 } from './authoring-game-find.js';
import { type 판기록, 계획읽기 } from './authoring-learn-check.js';
import { 합치기 } from './authoring-learn-note.js';
import { 결과읽기, 곳글, 곳맵줄, 곳셈, 남은깰곳, 놀이막기, 맵검사, 맵빈곳, 맵종류, 판결과, 판상한 } from './authoring-learn-play.js';
import { 남은배울것, 늚셈, 늚재기, 배움막기, 손막힘, 회고채우기 } from './authoring-learn-retro.js';

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-play-'));
  mkdirSync(join(자료, 'game-play'));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

const 줄 = (kind: string, key: string, data: object, belief = 'SEEN') => ({ kind, key, name: key, line: '', learned: { text: 'ㄱ', belief, data } });
const 판 = (이름: string, 장면들: string[]): 판기록 => ({ 이름, 장면들 });
const 본판 = '20261126050000000-둘러보기';
const 기록들 = [판(본판, ['BossRoom3']), 판('20261126040000000-메뉴', ['Lobby'])];
const 바닥 = { 주소: '/NavMesh Surface', 칸: 'NavMeshSurface.bounds', 값: [[0, 0], [40, 30]], 본때: 본판 };
const 다맵 = Object.fromEntries(맵종류.map((k) => [k, k === '걷기' ? 바닥 : { 없음: '이 맵에는 없다' }]));

describe('맵 파악', () => {
  it('맵은 장면 이름이 있어야 하고, 그 장면에서 부른 판 기록이 있어야 하고, 종류마다 본때가 그 장면 판이어야 받는다', () => {
    expect(맵검사({ 상태: '가봄' }, 기록들)).toBeNull();
    expect(맵검사({ 맵: {} }, 기록들)).toContain('data.장면');
    expect(맵검사({ 장면: 'BossRoom9', 맵: {} }, 기록들)).toContain('판 기록이 없다');
    expect(맵검사({ 장면: 'BossRoom3', 맵: { 바닥: 바닥 } }, 기록들)).toContain('모르는 종류 바닥');
    expect(맵검사({ 장면: 'BossRoom3', 맵: { 걷기: { 주소: '/NavMesh Surface', 값: [] } } }, 기록들)).toContain('data.맵.걷기 가 틀렸다');
    expect(맵검사({ 장면: 'BossRoom3', 맵: { 걷기: { ...바닥, 본때: '20261126040000000-메뉴' } } }, 기록들)).toContain('장면 BossRoom3 에서 부른 판 기록이 아니다');
    expect(맵검사({ 장면: 'BossRoom3', 맵: { 걷기: 바닥 } }, 기록들)).toBeNull();
    expect(맵검사({ 장면: 'BossRoom3', 맵: 다맵 }, 기록들)).toBeNull();
  });

  it('적는 명령이 틀린 맵을 안 받는다', () => {
    const 지도 = 지도읽기('');
    expect(합치기(지도, [], [줄('STAGE', 'stage:셋째 맵', { 상태: '가봄', 장면: 'BossRoom3', 맵: { 걷기: { ...바닥, 본때: '없는 판' } } })], 기록들)).toContain('stage:셋째 맵 — data.맵.걷기.본때');
    expect(합치기(지도, [], [줄('STAGE', 'stage:셋째 맵', { 상태: '가봄', 장면: 'BossRoom3', 맵: 다맵 })], 기록들)).toMatchObject({ 수: 1 });
  });

  it('가 본 곳의 맵 일곱 종류를 다 안 채웠거나 지도에 안 적은 오브젝트가 있으면 다 배운 것이 아니다', () => {
    const 나아감줄 = 줄('GOAL', 'goal:나아감', { 주소: 'ClearCount' });
    const 반맵 = 줄('STAGE', 'stage:셋째 맵', { 상태: '가봄', 장면: 'BossRoom3', 맵: { 걷기: 바닥 } });
    const 지도 = (들: object[]) => ({ 줄들: 들 as never, 이름: new Map() });
    expect(맵빈곳([반맵, 줄('STAGE', 'stage:넷째 맵', { 상태: '못감', 까닭: '잠김' })] as never)).toEqual(['stage:셋째 맵']);
    expect(남은배울것(지도([반맵, 나아감줄]), '2026-11-26')).toEqual([`맵 ${맵종류.length}종류를 다 안 채운 곳 1`]);
    expect(남은배울것(지도([줄('STAGE', 'stage:셋째 맵', { 상태: '가봄', 장면: 'BossRoom3', 맵: 다맵 }), 나아감줄]), '2026-11-26', undefined, ['NavMesh Surface'])).toEqual(['지도에 안 적은 오브젝트 1(NavMesh Surface)']);
  });

  it('다섯 번 안 늘어도 맵을 다 안 채운 곳이 있으면 배우기를 안 끝내고 그 곳을 채우라고 막는다', () => {
    writeFileSync(join(자료, 'game-learning.now'), '1');
    writeFileSync(join(자료, 'game-learn-grow.json'), JSON.stringify({ 셈: { 확인: 0, 가봄: 1, 나아감: null }, 안늚: 5, 기록: null }));
    const 계획 = 줄('TRIAL', 'trial:첫 맵', { 볼값: [{ 이름: '웨이브', 주소: 'WaveText' }], 기대: [{ 값: '웨이브', 비교: '>=', 기준: 1 }], 목표: { 값: '웨이브', 기준: 6 } });
    const 들 = [계획, 줄('GOAL', 'goal:나아감', { 주소: 'ClearCount' }), 줄('STAGE', 'stage:셋째 맵', { 상태: '가봄', 장면: 'BossRoom3', 맵: { 걷기: 바닥 } })];
    expect(배움막기(자료, 300, 'trial:첫 맵', 들 as never, [{ 이름: '20261126060000000-판' }])).toMatchObject({ 막음: expect.stringContaining('맵을 다 안 채운 곳이 있어 배우기를 못 끝낸다: stage:셋째 맵') });
  });
});

describe('게임플레이 — 곳마다 깰 때까지', () => {
  const 볼값 = [{ 이름: '웨이브', 주소: 'WaveText' }];
  const 계획 = (key: string, 곳: string, 쓸것 = [`${곳}#걷기`]) => 줄('TRIAL', key, { 볼값, 기대: [{ 값: '웨이브', 비교: '>=', 기준: 1 }], 목표: { 값: '웨이브', 기준: 6 }, 곳, 쓸것 });
  const 깰곳 = (key: string, x: object = {}) => 줄('STAGE', key, { 상태: '가봄', 장면: 'BossRoom3', 맵: 다맵, 결과: { 주소: 'ResultText', 깸: '승 리', 짐: '패 배' }, ...x });
  const 판끝 = (이름: string, 계획열쇠: string, 결과글?: string): 판기록 => ({
    이름,
    값기록: { 계획: 계획열쇠, 볼값, 간격ms: 2000, 때: [], 어긋남: null, 화면다름: [] },
    ...(결과글 === undefined ? {} : { 끝글: [{ 주소: 'ResultText', 경로: '/Canvas/ResultText', 글: 결과글 }] }),
  });
  const 지도줄 = [깰곳('stage:셋째 맵'), 깰곳('stage:넷째 맵'), 줄('STAGE', 'stage:랭킹 창', { 상태: '가봄' }), 계획('trial:셋째', 'stage:셋째 맵'), 계획('trial:넷째', 'stage:넷째 맵')];

  it('판은 그 곳을 적은 계획으로 해 본 기록 가운데 끝에 결과가 깸이나 짐으로 읽힌 것만 센다 — 멈춰 쪼개진 조각 · 결과 없는 곳은 안 센다', () => {
    const 기록들 = [판끝('20261126060000001-a', 'trial:셋째', '패 배'), 판끝('20261126060000002-b', 'trial:셋째'), 판끝('20261126060000003-c', 'trial:셋째', '<b>승 리</b>'), 판끝('20261126060000004-d', 'trial:넷째', '패 배')];
    expect(결과읽기({ 결과: { 주소: 'HP', 칸: 'Tree.HP', 깸: { 이상: 1 }, 짐: { 이하: 0 } } })).toEqual({ 주소: 'HP', 칸: 'Tree.HP', 깸: { 이상: 1 }, 짐: { 이하: 0 } });
    expect(결과읽기({ 결과: { 주소: 'HP', 깸: { 넘음: 1 }, 짐: '패 배' } })).toContain('data.결과');
    expect(판결과({ 이름: 'x', 값기록: { 계획: 't', 볼값: [{ 이름: '결과', 주소: 'HP', 칸: 'Tree.HP' }], 간격ms: 2000, 때: [{ 초: 0, 값: { 결과: 0 } }], 어긋남: null, 화면다름: [] } }, { 주소: 'HP', 칸: 'Tree.HP', 깸: { 이상: 1 }, 짐: { 이하: 0 } })).toBe('짐');
    expect(곳셈(지도줄 as never, 기록들)).toEqual([{ 열쇠: 'stage:셋째 맵', 판: 2, 깸: 1 }, { 열쇠: 'stage:넷째 맵', 판: 1, 깸: 0 }]);
    expect(곳셈(지도줄 as never, [...기록들, { ...판끝('20261126060000005-e', 'trial:넷째', '패 배'), 멈춤: { 초: 30, 값: {} } }])[1]).toMatchObject({ 판: 1 });
    expect(남은깰곳(지도줄 as never, 기록들)).toEqual(['아직 못 깬 곳 1(stage:넷째 맵 1판)']);
    expect(남은깰곳(지도줄.slice(2) as never, 기록들)).toEqual(['깰 곳(data.결과 가 있는 STAGE)이 없다']);
    expect(곳셈(지도줄 as never, 기록들).map(곳글)).toEqual(['stage:셋째 맵 깸(2판 중 1)', 'stage:넷째 맵 아직(1판)']);
  });

  it(`계획은 깰 곳을 적어야 하고, 못깸으로 적은 곳 · ${판상한}판 해 보고도 못 깬 곳은 다시 안 한다`, () => {
    const 오십 = Array.from({ length: 판상한 }, (_, i) => 판끝(`2026112606${String(i).padStart(9, '0')}-판`, 'trial:넷째', '패 배'));
    expect(놀이막기({}, 지도줄 as never, [])).toContain('data.곳');
    expect(놀이막기({ 곳: 'stage:랭킹 창' }, 지도줄 as never, [])).toContain('깰 곳이 아니다');
    const 넷째 = { 곳: 'stage:넷째 맵', 쓸것: ['stage:넷째 맵#걷기'] };
    expect(놀이막기(넷째, 지도줄 as never, 오십.slice(1))).toBeNull();
    expect(놀이막기(넷째, 지도줄 as never, 오십)).toContain(`${판상한}판 해 보고도 못 깼다`);
    expect(놀이막기(넷째, [깰곳('stage:넷째 맵', { 상태: '못깸', 까닭: '3웨이브 보스를 못 막음' })] as never, [])).toContain('못깸으로 적었다');
  });

  it('게임플레이 계획은 그 곳 맵 정보를 하나 이상 쓸것으로 적어야 받고, 멈춤 보고에 그 곳 맵 정보를 붙인다', () => {
    const 길목 = 줄('RULE', 'rule:넷째 맵 길목', { 곳: 'stage:넷째 맵', 자리: [12, 8] });
    const 들 = [...지도줄, 길목, 줄('RULE', 'rule:고양이 오라', {})];
    expect(놀이막기({ 곳: 'stage:넷째 맵' }, 들 as never, [])).toContain('stage:넷째 맵 의 맵 정보를 하나 이상 적는다(stage:넷째 맵#걷기 · rule:넷째 맵 길목)');
    expect(놀이막기({ 곳: 'stage:넷째 맵', 쓸것: ['rule:고양이 오라'] }, 들 as never, [])).toContain('맵 정보를 하나 이상');
    expect(놀이막기({ 곳: 'stage:넷째 맵', 쓸것: ['stage:넷째 맵#막힘'] }, 들 as never, [])).toContain('stage:넷째 맵#막힘 가 지도에 없다');
    expect(놀이막기({ 곳: 'stage:넷째 맵', 쓸것: ['rule:고양이 오라', 'rule:넷째 맵 길목'] }, 들 as never, [])).toBeNull();
    const 빈맵 = [깰곳('stage:메뉴판', { 맵: Object.fromEntries(맵종류.map((k) => [k, { 없음: '메뉴만 있다' }])) })];
    expect(놀이막기({ 곳: 'stage:메뉴판' }, 빈맵 as never, [])).toBeNull();
    expect(계획읽기({ ...계획('trial:x', 'stage:넷째 맵').learned.data, 쓸것: 'rule:x' })).toContain('data.쓸것');
    expect(곳맵줄(들 as never, 'stage:넷째 맵')).toEqual([
      '그 곳(stage:넷째 맵)의 맵 정보 2 — 새 계획의 data.쓸것 에 믿고 쓸 것을 적는다',
      `  stage:넷째 맵#걷기: ${JSON.stringify(바닥).slice(0, 100)}`,
      '  rule:넷째 맵 길목: ㄱ',
    ]);
  });

  it(`못깸은 ${판상한}판을 해 봐야 적는다 — 못 깨면 넘어가는 길로 쓰지 않는다`, () => {
    const 오십 = Array.from({ length: 판상한 }, (_, i) => 판끝(`2026112606${String(i).padStart(9, '0')}-판`, 'trial:넷째', '패 배'));
    const 못깸 = [줄('STAGE', 'stage:넷째 맵', { 상태: '못깸', 까닭: '3웨이브 보스', 장면: 'BossRoom3', 결과: { 주소: 'ResultText', 깸: '승 리', 짐: '패 배' } })];
    const 앞 = 지도줄.slice(3).map((x) => ({ kind: x.kind, key: x.key, name: x.name, learned: x.learned }));
    const 기록 = [...오십, 판('20261126050000000-둘러보기', ['BossRoom3'])];
    expect(합치기(지도읽기(''), 앞, 못깸, 기록.slice(1))).toContain(`못깸은 data.결과 가 있는 곳을 ${판상한}판 해 보고도 못 깼을 때만 적는다(지금 ${판상한 - 1}판 · 깸 0)`);
    expect(합치기(지도읽기(''), 앞, 못깸, 기록)).toMatchObject({ 수: 1 });
  });

  it('게임플레이 단계는 다섯 번 안 늘어도 안 끝내고, 결과를 칸으로 읽는 곳이면 그 값을 같이 읽는다', () => {
    writeFileSync(join(자료, 'game-learning.now'), '1');
    writeFileSync(join(자료, 'game-learn.json'), JSON.stringify({ 쓴ms: 1, 세션: 1, 끝: false, 열쇠: [], 단계: '게임플레이' }));
    writeFileSync(join(자료, 'game-learn-grow.json'), JSON.stringify({ 셈: { 확인: 0, 가봄: 9, 나아감: {} }, 안늚: 9, 기록: null }));
    const 칸결과 = 깰곳('stage:셋째 맵', { 결과: { 주소: '/Lumikantle', 칸: 'Lumikantle.HP', 깸: { 이상: 1 }, 짐: { 이하: 0 } } });
    const 들 = [칸결과, 계획('trial:셋째', 'stage:셋째 맵'), 줄('GOAL', 'goal:나아감', { 주소: 'WaveText' })];
    expect(배움막기(자료, 300, 'trial:셋째', 들 as never, [])).toMatchObject({ 볼값: [{ 이름: '웨이브' }, { 이름: '나아감' }, { 이름: '결과', 주소: '/Lumikantle', 칸: 'Lumikantle.HP' }] });
    expect(existsSync(join(자료, 'game-learn.done'))).toBe(false);
  });

  it('나아감은 곳 안에서만 견준다 — 둘째 맵 3웨이브가 첫 맵 6웨이브보다 작아도 「안 늚」이 아니다(#16053)', () => {
    const 회고 = (n: number, 곳: string, 나아감: number, 까닭 = '손') => 줄('PLAY', `play:2026112600000000${n}-판`, { 까닭, 나아감, 곳, 계획: 'trial:셋째' });
    const 찾기 = (k: string) => [계획('trial:셋째', 'stage:둘째 맵')].find((x) => x.key === k) as never;
    expect(회고채우기('play:20261126000000009-판', { text: 'ㄱ', belief: 'SEEN', data: { 까닭: '됨' } }, 찾기, [판끝('20261126000000009-판', 'trial:셋째')])).toMatchObject({ data: { 곳: 'stage:둘째 맵' } });
    expect(늚셈([회고(0, 'stage:첫 맵', 6), 회고(1, 'stage:둘째 맵', 3)] as never).나아감).toEqual({ 'stage:첫 맵': 6, 'stage:둘째 맵': 3 });
    늚재기(자료, [회고(0, 'stage:첫 맵', 6)] as never, 'a');
    expect(늚재기(자료, [회고(0, 'stage:첫 맵', 6), 회고(1, 'stage:둘째 맵', 3)] as never, 'b')).toBe(0);
    expect(늚재기(자료, [회고(0, 'stage:첫 맵', 6), 회고(1, 'stage:둘째 맵', 3), 회고(2, 'stage:둘째 맵', 2)] as never, 'c')).toBe(1);
    const 섞임 = [계획('trial:셋째', 'stage:둘째 맵'), 회고(0, 'stage:첫 맵', 1), 회고(1, 'stage:첫 맵', 1), 회고(2, 'stage:둘째 맵', 1), 회고(3, 'stage:둘째 맵', 1)];
    expect(손막힘(섞임 as never)).toBeNull();
    expect(손막힘([...섞임, 회고(4, 'stage:둘째 맵', 1)] as never)).toBeNull();
    expect(손막힘([...섞임, 회고(4, 'stage:둘째 맵', 1), 회고(5, 'stage:둘째 맵', 1)] as never)).toMatchObject({ 계획들: ['trial:셋째', 'trial:셋째', 'trial:셋째'] });
  });
});
