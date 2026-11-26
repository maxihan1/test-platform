// 앱 보류 · 진행 불가 확인(장치 ②) — 케이스 시작 뒤 해 본 기록 · 환경 까닭 · 진행 불가 기록 셋
import { mkdirSync, mkdtempSync, rmSync, utimesSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 앱맞대기자리 } from './authoring-app-compare.js';
import { 안해본진행불가, 앱안해본보류 } from './authoring-check-app-held.js';

let 자료 = '';
const 기록 = (이름: string, 해봄: boolean, 시각: number) => {
  mkdirSync(join(자료, 'app-try'), { recursive: true });
  writeFileSync(join(자료, 'app-try', 이름), JSON.stringify({ 해봄 }));
  utimesSync(join(자료, 'app-try', 이름), 시각, 시각);
};
const 표 = (...출처: string[]) => ['## 요구사항', '', '| 요구 | tcId | 출처 |', '|---|---|---|', ...출처.map((x, i) => `| MTA-REQ-00${String(i + 1)} | \`TC-MTA-00${String(i + 1)}\` | ${x} |`)].join('\n');
beforeEach(() => {
  자료 = mkdtempSync(join(tmpdir(), 'app-held-'));
  writeFileSync(join(자료, 앱맞대기자리.케이스시작), '{}');
  utimesSync(join(자료, 앱맞대기자리.케이스시작), 1000, 1000);
  기록('20261126000000000-앞.json', true, 500);
  기록('20261126000000001-봄.json', false, 2000);
  기록('20261126000000002-눌러봄.json', true, 2000);
});
afterEach(() => rmSync(자료, { recursive: true, force: true }));

describe('앱안해본보류', () => {
  it('케이스 시작 뒤의 해 본 기록을 댄 보류 · 환경 까닭 보류는 지나고, 앞 기록 · 본 기록 · 기록 없는 보류는 짚는다', () => {
    const r = 앱안해본보류(표(
      '보류 — 글 지우기가 안 보인다(해 본 것: 20261126000000002-눌러봄.json · 세 번)',
      '보류 — 두 번째 계정 없음',
      '보류 — 글이 안 뜬다(해 본 것: 20261126000000000-앞.json)',
      '보류 — 알림이 안 온다(해 본 것: 20261126000000001-봄.json)',
      '보류 — 결제 화면을 모른다',
      '기획서',
    ), 자료);
    expect(r).toEqual([expect.stringMatching(/^요구 MTA-REQ-003\(TC-MTA-003\)/), expect.stringMatching(/^요구 MTA-REQ-004/), expect.stringMatching(/^요구 MTA-REQ-005/)]);
  });

  it('이번에 안 바뀐 줄은 해 본 것을 이미 적었으면 넘어간다', () => {
    expect(앱안해본보류(표('보류 — 글이 안 뜬다(해 본 것: 20261126000000000-앞.json)'), 자료, new Set(['TC-MTA-009']))).toEqual([]);
  });
});

describe('안해본진행불가', () => {
  const 목표 = (까닭: string) => ({ 목표: [{ 기능: '알림 상세', 화면: 'app:.A/알림', 결과: '진행 불가' as const, 까닭 }], 계정비우기: '함' });
  const 이번 = new Set(['20261126000000002-가.json', '20261126000000003-나.json', '20261126000000004-다.json']);

  it('환경 까닭이거나 이번 기록 셋을 대면 지나고, 모자라면 짚는다', () => {
    expect(안해본진행불가(목표('앱 서버에 못 닿음'), 이번)).toEqual([]);
    expect(안해본진행불가(목표('알림이 안 온다(해 본 것: 20261126000000002-가.json · 20261126000000003-나.json · 20261126000000004-다.json)'), 이번)).toEqual([]);
    expect(안해본진행불가(목표('알림이 안 온다(해 본 것: 20261126000000002-가.json · 20261126000000002-가.json)'), 이번)).toEqual([expect.stringMatching(/이번 해 본 기록이 1개다/)]);
  });
});
