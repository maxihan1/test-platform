// 게임플레이에서 한 곳의 나아감이 세 판 이어 안 늘면 다음 판 전에 물음 트리를 보게 막는 검사 — 곳 단위로 세고 배우기의 안늚과 섞지 않는다 (도메인/게임 §3.10 「게임플레이」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 맵종류 } from './authoring-learn-play.js';
import { 곳막힘, 배움막기, 안늚판상한 } from './authoring-learn-retro.js';

let 자료 = '';
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'learn-stall-'));
  mkdirSync(join(자료, 'game-play'));
  writeFileSync(join(자료, 'game-learning.now'), '1');
  writeFileSync(join(자료, 'game-learn.json'), JSON.stringify({ 쓴ms: 1, 세션: 1, 끝: false, 열쇠: [], 단계: '게임플레이' }));
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

const 줄 = (kind: string, key: string, data: object, belief = 'SEEN') => ({ kind, key, name: key, line: '', learned: { text: 'ㄱ', belief, data } });
const 곳 = 'stage:셋째 맵';
const 회고 = (n: number, 나아감: number, 까닭 = '믿은것', 어느곳 = 곳) => 줄('PLAY', `play:2026112600000000${n}-판`, { 까닭, 나아감, 곳: 어느곳, 계획: 'trial:셋째' });
const 나아감들 = (...v: number[]) => v.map((x, i) => 회고(i, x));

describe('곳막힘', () => {
  it(`곳의 가장 새 회고 ${안늚판상한}개가 앞의 가장 먼 나아감을 못 넘으면 막고, 넘었거나 앞이 없으면 안 막는다`, () => {
    expect(곳막힘(나아감들(3, 3, 2, 3) as never)).toMatchObject({ 곳, 계획들: ['trial:셋째', 'trial:셋째', 'trial:셋째'] });
    expect(곳막힘(나아감들(3, 4, 3, 3, 2) as never)).not.toBeNull();
    expect(곳막힘(나아감들(3, 3, 4, 3) as never)).toBeNull();
    expect(곳막힘(나아감들(3, 3, 3) as never)).toBeNull();
    expect(곳막힘([] as never)).toBeNull();
  });

  it('다른 곳의 회고는 세지 않고, 목표에 닿은 회고(됨)로 끝났으면 안 막는다', () => {
    expect(곳막힘([회고(0, 3), 회고(1, 3, '믿은것', 'stage:첫 맵'), 회고(2, 1), 회고(3, 2), 회고(4, 1)] as never)).not.toBeNull();
    expect(곳막힘([회고(0, 3), 회고(1, 3, '믿은것', 'stage:첫 맵'), 회고(2, 1, '믿은것', 'stage:첫 맵'), 회고(3, 2), 회고(4, 1)] as never)).toBeNull();
    expect(곳막힘([...나아감들(3, 3, 2, 3), 회고(4, 3, '됨')] as never)).toBeNull();
  });
});

describe('게임플레이 다음 판 막기', () => {
  const 볼값 = [{ 이름: '웨이브', 주소: 'WaveText' }];
  const 다맵 = Object.fromEntries(맵종류.map((k) => [k, { 없음: '이 맵에는 없다' }]));
  const 계획 = (key: string, 어디서?: string, 어느곳 = 곳) => 줄('TRIAL', key, { 볼값, 기대: [{ 값: '웨이브', 비교: '>=', 기준: 6 }], 목표: { 값: '웨이브', 기준: 6 }, 곳: 어느곳, 쓸것: [`calc:${어느곳.slice('stage:'.length)}`, `${어느곳}#걷기`], ...(어디서 === undefined ? {} : { 어디서 }) });
  const 깰곳 = (어느곳: string) => 줄('STAGE', 어느곳, { 상태: '가봄', 장면: 'BossRoom3', 맵: { ...다맵, 걷기: { 주소: '/NavMesh', 값: [[0, 0]], 본때: 'x' } }, 결과: { 주소: 'ResultText', 깸: '승 리', 짐: '패 배' } });
  const 바탕 = (...더: object[]) => [
    깰곳(곳),
    줄('GOAL', 'goal:나아감', { 주소: 'WaveText' }),
    줄('CALC', 'calc:셋째 맵', { 곳 }),
    ...나아감들(3, 3, 2, 3),
    ...더,
  ];

  it('물음 트리를 보고 열린 물음을 푸는 계획이 아니면 막는다 — 앞 세 계획을 되풀이해도 막는다', () => {
    const 들 = 바탕(계획('trial:다음'), 줄('ASK', 'ask:보스', {}, 'GUESS'));
    const 막음 = (배움막기(자료, 300, 'trial:다음', 들 as never, []) as { 막음: string }).막음;
    expect(막음).toContain(`${곳} 에서 ${안늚판상한}판 이어 나아감이 안 늘었다`);
    expect(막음).toContain(`authoring-game-tree.ts ${자료}`);
    const 되풀이 = 바탕(계획('trial:셋째', 'ask:보스'), 줄('ASK', 'ask:보스', {}, 'GUESS'));
    expect(배움막기(자료, 300, 'trial:셋째', 되풀이 as never, [])).toMatchObject({ 막음: expect.stringContaining('안 늘었다') });
  });

  it('열린 물음 하나를 풀겠다는 새 계획(data.어디서)이면 받고, 열린 물음이 없으면 막지 않는다', () => {
    const 풀기 = 바탕(계획('trial:다음', 'ask:보스'), 줄('ASK', 'ask:보스', {}, 'GUESS'));
    expect(배움막기(자료, 300, 'trial:다음', 풀기 as never, [])).toMatchObject({ 계획: 'trial:다음' });
    expect(배움막기(자료, 300, 'trial:다음', 바탕(계획('trial:다음')) as never, [])).toMatchObject({ 계획: 'trial:다음' });
  });

  it('게임플레이를 다시 시작했으면 그 앞 회고는 세 판 안 늚에 안 센다 — 판 함수를 고쳐 다시 깨 볼 때', () => {
    const 들 = 바탕(계획('trial:다음'), 줄('ASK', 'ask:보스', {}, 'GUESS'));
    expect(배움막기(자료, 300, 'trial:다음', 들 as never, [])).toMatchObject({ 막음: expect.stringContaining('안 늘었다') });
    writeFileSync(join(자료, 'game-learn.json'), JSON.stringify({ 쓴ms: 1, 세션: 1, 끝: false, 열쇠: [], 단계: '게임플레이', 놀이시작: '20261127000000000' }));
    expect(배움막기(자료, 300, 'trial:다음', 들 as never, [])).toMatchObject({ 계획: 'trial:다음' });
  });

  it('새 계획이 다른 곳이면 앞 곳의 안 늚으로 막지 않는다 — 16094 넷째 맵 5판 뒤 다섯째 맵 첫 계획이 막혀 상관없는 물음을 어디서에 달았다', () => {
    const 다섯째 = 'stage:다섯째 맵';
    const 들 = 바탕(깰곳(다섯째), 줄('CALC', 'calc:다섯째 맵', { 곳: 다섯째 }), 계획('trial:다섯째', undefined, 다섯째), 줄('ASK', 'ask:보스', {}, 'GUESS'));
    expect(배움막기(자료, 300, 'trial:다섯째', 들 as never, [])).toMatchObject({ 계획: 'trial:다섯째' });
    const 다른곳한판 = 바탕(계획('trial:다음'), 줄('ASK', 'ask:보스', {}, 'GUESS'), 회고(9, 1, '믿은것', 다섯째));
    expect(배움막기(자료, 300, 'trial:다음', 다른곳한판 as never, [])).toMatchObject({ 막음: expect.stringContaining(`${곳} 에서 ${안늚판상한}판 이어 나아감이 안 늘었다`) });
  });
});
