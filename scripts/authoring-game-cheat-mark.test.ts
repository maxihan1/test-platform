// 정보 모으기의 치트 표시 파일 — 같은 판에서 이어 부른 기록에 치트를 달고 판을 떠나면 지우며, 치트 기록은 곳셈이 판으로 안 센다 (게임 정보 먼저 쌓기)
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 판에치트달기, 치트표시쓰기 } from './authoring-game-cheat-mark.js';
import { 판기록들 } from './authoring-learn-check.js';
import { 곳셈 } from './authoring-learn-play.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
});
const 새자료 = (): string => {
  const d = mkdtempSync(join(tmpdir(), 'game-cheat-'));
  자리들.push(d);
  return d;
};

describe('치트 표시', () => {
  it('표시가 없으면 아무것도 안 단다', () => {
    const r: { 장면들?: string[]; 치트?: true } = { 장면들: ['S'] };
    판에치트달기(새자료(), r);
    판에치트달기(undefined, r);
    expect(r.치트).toBeUndefined();
  });

  it('표시가 있으면 같은 장면 기록마다 치트를 달고 표시는 남긴다', () => {
    const 자료 = 새자료();
    expect(치트표시쓰기(자료, 'B3_2', new Date('2026-11-27T00:00:00Z'))).toBeNull();
    expect(JSON.parse(readFileSync(join(자료, 'game-cheat.json'), 'utf8'))).toEqual({ 장면: 'B3_2', 때: '2026-11-27T00:00:00.000Z' });
    for (const 장면들 of [['B3_2'], ['B3_2'], undefined]) {
      const r: { 장면들?: string[]; 치트?: true } = { ...(장면들 === undefined ? {} : { 장면들 }) };
      판에치트달기(자료, r);
      expect(r.치트).toBe(true);
    }
    expect(existsSync(join(자료, 'game-cheat.json'))).toBe(true);
  });

  it('장면이 표시와 다른 기록이 나오면 그 기록까지 치트로 달고 표시를 지운다', () => {
    const 자료 = 새자료();
    치트표시쓰기(자료, 'B3_2');
    const 떠남: { 장면들?: string[]; 치트?: true } = { 장면들: ['B3_2', 'Menu'] };
    판에치트달기(자료, 떠남);
    expect(떠남.치트).toBe(true);
    expect(existsSync(join(자료, 'game-cheat.json'))).toBe(false);
    const 다음: { 장면들?: string[]; 치트?: true } = { 장면들: ['Menu'] };
    판에치트달기(자료, 다음);
    expect(다음.치트).toBeUndefined();
  });

  it('표시에 장면이 없으면 장면으로는 안 지운다', () => {
    const 자료 = 새자료();
    치트표시쓰기(자료, null);
    const r: { 장면들?: string[]; 치트?: true } = { 장면들: ['Menu'] };
    판에치트달기(자료, r);
    expect(r.치트).toBe(true);
    expect(existsSync(join(자료, 'game-cheat.json'))).toBe(true);
  });

  it('치트 판 기록은 판 기록으로 읽을 때 치트 표시가 붙고 곳셈이 판으로 안 센다', () => {
    const 자료 = 새자료();
    mkdirSync(join(자료, 'game-play'));
    const 값기록 = { 계획: 'trial:둘째', 볼값: [], 간격ms: 2000, 때: [], 어긋남: null, 화면다름: [] };
    const 끝글 = [{ 주소: 'ResultText', 경로: '/C/ResultText', 글: '승 리' }];
    writeFileSync(join(자료, 'game-play', '20261127000000000-보통.json'), JSON.stringify({ 값기록, 끝글 }));
    writeFileSync(join(자료, 'game-play', '20261127000100000-치트.json'), JSON.stringify({ 값기록, 끝글, 치트: true }));
    const 기록들 = 판기록들(자료);
    expect(기록들.map((x) => x.치트)).toEqual([undefined, true]);
    const 줄들 = [
      { kind: 'STAGE', key: 'stage:둘째', learned: { text: '', belief: 'SEEN', data: { 결과: { 주소: 'ResultText', 깸: '승 리', 짐: '패 배' } } } },
      { kind: 'TRIAL', key: 'trial:둘째', learned: { text: '', belief: 'SEEN', data: { 곳: 'stage:둘째' } } },
    ] as never;
    expect(곳셈(줄들, 기록들)).toEqual([{ 열쇠: 'stage:둘째', 판: 1, 깸: 1 }]);
    expect(곳셈(줄들, [기록들[1]!])).toEqual([{ 열쇠: 'stage:둘째', 판: 0, 깸: 0 }]);
  });
});
