// 곳(STAGE 줄) — 맵 일곱 종류 검사 · 다 안 채운 곳이 있으면 배우기가 안 끝남 (도메인/게임 §3.10 「맵 파악」)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 지도읽기 } from './authoring-game-find.js';
import type { 판기록 } from './authoring-learn-check.js';
import { 합치기 } from './authoring-learn-note.js';
import { 맵검사, 맵빈곳, 맵종류 } from './authoring-learn-play.js';
import { 남은배울것, 배움막기 } from './authoring-learn-retro.js';

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
