// 값 파일이 있는 종류의 막기 · 곳마다 정보 끝 검사 — 이름만 적은 줄은 막고 값 칸이 있으면 통과, 치트 값은 치트 표시가 있어야 통과 (게임 정보 먼저 쌓기)
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import { 막힘글 } from './authoring-game-play-gate.js';
import { 곳정보남음, 값줄들, 값파일들, 빠짐, 이름글 } from './authoring-game-values.js';
import { 끝조건남은것 } from './authoring-learn-left.js';

let 자리들: string[] = [];
afterEach(() => {
  for (const d of 자리들) rmSync(d, { recursive: true, force: true });
  자리들 = [];
});

type 적음 = { kind: string; key: string; name: string; learned: Record<string, unknown> | null };
const 값 = { 출처: '실행 중', MaxHP: 162, speed: 5 };
const 줄 = (kind: string, key: string, name: string, data?: unknown, marks?: string[]): 적음 => ({ kind, key, name, learned: { text: '유령', belief: 'SEEN', ...(data === undefined ? {} : { data }), ...(marks === undefined ? {} : { marks }) } });

/** 자료 폴더 — 학습 세션이고, 값 파일 종류들과 안 올린 배운 줄을 놓는다 */
function 자료(파일들: { 종류: string; 장면?: string; 치트?: true }[], 줄들: 적음[]): string {
  const d = mkdtempSync(join(tmpdir(), 'values-'));
  자리들.push(d);
  mkdirSync(join(d, 'game-props'));
  파일들.forEach((f, i) => writeFileSync(join(d, 'game-props', `f${String(i).padStart(2, '0')}.json`), JSON.stringify({ 종류: f.종류, 장면: f.장면 ?? null, 읽은때: 'x', 출처: '실행 중', 칸: {}, 목록칸: [], ...(f.치트 === undefined ? {} : { 치트: true, call: ['a|b'] }) })));
  writeFileSync(join(d, 'game-map.txt'), '');
  writeFileSync(join(d, 'game-learned.json'), JSON.stringify({ elements: 줄들 }));
  writeFileSync(join(d, 'game-learning.now'), '1');
  return d;
}

describe('값 줄 판정', () => {
  it('종류 이름이 키 · 이름 · 글에 낱말로 든 줄 가운데 값 칸(출처 · 장면 빼고)이 있는 것만 값 줄이다', () => {
    const 줄들 = [줄('DATA', 'monster:Ghost', '유령', 값), 줄('DATA', 'monster:Ghost2', '유령2', { 출처: '실행 중' }), 줄('STAGE', 'stage:Ghost', '곳', 값), 줄('DATA', 'monster:Spawner', 'BotSpawner', 값)] as never;
    expect(값줄들(줄들, 'Ghost').map((x) => x.key)).toEqual(['monster:Ghost']);
    expect(값줄들(줄들, 'Bot')).toEqual([]);
    expect(빠짐({ 종류: 'Ghost', 장면: null, 치트: false }, 줄들)).toBeNull();
    expect(빠짐({ 종류: 'Ghost2', 장면: null, 치트: false }, 줄들)).toBe('줄없음');
    expect(빠짐({ 종류: 'Ghost', 장면: null, 치트: true }, 줄들)).toBe('치트없음');
  });

  it('PROBE 줄은 값 칸이 있어도 값 줄이 아니다', () => {
    const 줄들 = [줄('PROBE', 'probe:Ghost', '유령 탐색', 값), 줄('DATA', 'monster:Ghost', '유령', 값)] as never;
    expect(값줄들(줄들, 'Ghost').map((x) => x.key)).toEqual(['monster:Ghost']);
    expect(빠짐({ 종류: 'Ghost', 장면: null, 치트: false }, [줄('PROBE', 'probe:Ghost', '유령 탐색', 값)] as never)).toBe('줄없음');
  });

  it('종류 이름은 처음 열 개 뒤에 「외 N개」', () => {
    expect(이름글(Array.from({ length: 12 }, (_, i) => `K${i}`))).toBe('K0 · K1 · K2 · K3 · K4 · K5 · K6 · K7 · K8 · K9 외 2개');
    expect(이름글(['A'])).toBe('A');
  });
});

describe('다음 판 막기', () => {
  it('값 파일이 있는데 이름만 적은 줄이면 막고, 값 칸이 있으면 통과한다', () => {
    const d = 자료([{ 종류: 'Ghost' }], [줄('PROBE', 'probe:Ghost', 'Ghost 가 나온다')]);
    expect(막힘글(d)).toContain('값 줄이 없는 종류 1개 — Ghost');
    writeFileSync(join(d, 'game-learned.json'), JSON.stringify({ elements: [줄('DATA', 'monster:Ghost', '유령', 값)] }));
    expect(막힘글(d)).toBeNull();
  });

  it('치트 값 파일인데 줄에 치트 표시가 없으면 막고, 있으면 통과한다', () => {
    const d = 자료([{ 종류: 'Boss', 치트: true }], [줄('DATA', 'monster:Boss', '보스', 값)]);
    expect(막힘글(d)).toContain('치트 표시(marks CHEAT)가 없는 종류 1개 — Boss');
    writeFileSync(join(d, 'game-learned.json'), JSON.stringify({ elements: [줄('DATA', 'monster:Boss', '보스', 값, ['CHEAT'])] }));
    expect(막힘글(d)).toBeNull();
  });

  it('빠진 종류가 많으면 처음 열 개만 적는다', () => {
    const d = 자료(Array.from({ length: 13 }, (_, i) => ({ 종류: `Mob${String(i).padStart(2, '0')}` })), []);
    const 글 = 막힘글(d)!;
    expect(글).toContain('13개 — Mob00 · Mob01');
    expect(글).toContain('Mob09 외 3개');
    expect(글).not.toContain('Mob10');
  });

  it('값 파일이 없는 종류는 지금처럼 이름만 보고, 학습 세션이 아니면 안 막는다', () => {
    const d = 자료([], []);
    expect(막힘글(d)).toBeNull();
    const e = 자료([{ 종류: 'Ghost' }], []);
    rmSync(join(e, 'game-learning.now'));
    expect(막힘글(e)).toBeNull();
    expect(막힘글(undefined)).toBeNull();
  });
});

describe('곳마다 정보 끝', () => {
  const 곳 = (장면: string): 적음 => 줄('STAGE', 'stage:둘째 맵', '둘째 맵', { 장면, 결과: { 주소: 'x' } });

  it('곳의 장면에서 나온 종류마다 값 줄이 있어야 끝이고, 다른 장면의 값 파일은 보지 않는다', () => {
    const d = 자료([{ 종류: 'Ghost', 장면: 'B3_2' }, { 종류: 'Slime', 장면: 'B3_1' }], [곳('B3_2')]);
    const 줄들 = [곳('B3_2')] as never;
    expect(값파일들(d).map((x) => x.종류)).toEqual(['Ghost', 'Slime']);
    expect(곳정보남음(줄들, d)).toEqual(['stage:둘째 맵 의 정보가 안 끝났다 — 값 줄 없는 종류 1(Ghost)']);
    expect(곳정보남음([곳('B3_2'), 줄('DATA', 'monster:Ghost', '유령', 값)] as never, d)).toEqual([]);
  });

  it('게임플레이 끝 조건에 값 줄 없는 종류와 열린 물음이 남은 것으로 나온다', () => {
    const d = 자료([{ 종류: 'Ghost', 장면: 'B3_2' }], []);
    const 지도 = { 줄들: [{ ...곳('B3_2'), learned: { ...곳('B3_2').learned, data: { 장면: 'B3_2', 상태: '못깸', 까닭: '못 깸', 결과: { 주소: 'x', 깸: '승', 짐: '패' } } } }, 줄('ASK', 'ask:보스', '보스는 무엇에 약한가')], 이름: new Map() } as never;
    const 남은 = 끝조건남은것(d, true, 지도, Date.parse('2026-11-27T00:00:00Z'));
    expect(남은).toEqual(['stage:둘째 맵 의 정보가 안 끝났다 — 값 줄 없는 종류 1(Ghost)', '열린 물음 1']);
  });

  it('배우기 단계 끝 조건에도 값 줄 없는 종류가 남은 것으로 나오고, 줄을 적으면 빠진다', () => {
    const d = 자료([{ 종류: 'Ghost' }, { 종류: 'Boss', 치트: true }], []);
    const 지도 = (줄들: 적음[]) => ({ 줄들, 이름: new Map() }) as never;
    const 지금 = Date.parse('2026-11-27T00:00:00Z');
    expect(끝조건남은것(d, false, 지도([]), 지금)).toContain('값 줄 없는 종류 2(Ghost · Boss)');
    const 남음 = 끝조건남은것(d, false, 지도([줄('DATA', 'monster:Ghost', '유령', 값), 줄('DATA', 'monster:Boss', '보스', 값)]), 지금);
    expect(남음.join('\n')).toContain('치트 표시 없는 종류 1(Boss)');
    expect(남음.join('\n')).not.toContain('값 줄 없는 종류');
    const 끝 = 끝조건남은것(d, false, 지도([줄('DATA', 'monster:Ghost', '유령', 값), 줄('DATA', 'monster:Boss', '보스', 값, ['CHEAT'])]), 지금);
    expect(끝.join('\n')).not.toContain('종류');
  });
});
