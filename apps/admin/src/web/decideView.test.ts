// 결정 목록 판단 검사 — 보낼 것 · ③ 켜짐 · 진행 차례 · 단계마다 요청 번호 (도메인/작성 §3.6 「★ 결정 목록」 진행)

import { describe, expect, it } from 'vitest';

import type { 결정항목 } from './decideApi.js';
import { 같이다시만드나, 고름바꾼표, 보낼것, 줄요청, 차례, 켜졌나, type 고른값 } from './decideView.js';

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY'], blockedBy: null, rootId: 10, runId: 11, summary: null, prUrl: null, requestedByName: '맥시', finishedAt: null };
const 실패: 결정항목 = { key: 'fail:7:DMW-FN-271', group: 2, kind: 'FAIL', picks: ['SCREEN', 'BUG'], blockedBy: null, runId: 7, tcId: 'DMW-FN-271', reqs: [{ reqId: 'DMW-REQ-088', text: '주문 취소' }], verify: null, reason: null, finishedAt: null };
const 화면확인: 결정항목 = { key: 'check:DMW-REQ-349', group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId: 'DMW-REQ-349', feature: '약관', text: '제목이 보인다', checkSince: null, basis: 'SCREEN', options: [] };
const 문구: 결정항목 = {
  key: 'check:DMW-REQ-021', group: 2, kind: 'CHECK', picks: ['PICK', 'OWN'], blockedBy: null, reqId: 'DMW-REQ-021', feature: '로그인', text: '올바르지 않습니다', checkSince: null, basis: 'DOCS',
  options: [{ asset: '기능정리.docx', quote: '올바르지 않습니다' }, { asset: '화면설명메모.md', quote: '확인해 주세요' }],
};
const 바뀐요구: 결정항목 = { key: 'prd:1:2', group: 3, kind: 'PRD_CHANGED', picks: ['REDO'], blockedBy: null, needsApply: true, changed: null, added: null, removed: null, scenarios: [] };
const 바뀐API: 결정항목 = { key: 'api:1:2', group: 3, kind: 'API_CHANGED', picks: ['REDO'], blockedBy: null, fromVersion: 1, toVersion: 2, operations: [{ method: 'GET', path: '/a', change: 'CHANGED', breaking: false }, { method: 'GET', path: '/b', change: 'REMOVED', breaking: true }] };
const items = [반영, 실패, 화면확인, 문구, 바뀐요구, 바뀐API];
const 표 = (줄: [string, 고른값][]) => new Map(줄);

describe('보낼것', () => {
  it('「나중에」 · 문장이 빈 고치기 · 대상 서버 없는 API 다시 작성 · 켜지지 않은 ③ 은 안 보낸다', () => {
    const 고른 = 표([
      [실패.key, { pick: 'LATER' }],
      [화면확인.key, { pick: 'EDIT', text: '  ' }],
      [바뀐API.key, { pick: 'REDO' }],
      [바뀐요구.key, { pick: 'REDO' }],
    ]);
    expect(보낼것(items, 고른)).toEqual([]);
  });

  it('문구 선택은 차례 번호, 고치기는 문장, API 다시 작성은 대상 서버를 싣는다', () => {
    const 고른 = 표([
      [반영.key, { pick: 'APPLY' }],
      [문구.key, { pick: 'PICK', option: 1 }],
      [화면확인.key, { pick: 'EDIT', text: '큰 제목이 보인다' }],
      [바뀐API.key, { pick: 'REDO', env: 'stg' }],
      [바뀐요구.key, { pick: 'REDO' }],
    ]);
    expect(보낼것(items, 고른)).toEqual([
      { key: 반영.key, pick: 'APPLY' },
      { key: 화면확인.key, pick: 'EDIT', text: '큰 제목이 보인다' },
      { key: 문구.key, pick: 'PICK', option: 1 },
      { key: 바뀐요구.key, pick: 'REDO' },
      { key: 바뀐API.key, pick: 'REDO', env: 'stg' },
    ]);
  });
});

describe('③ 켜짐', () => {
  it('반영 대기를 기다리는 ③ 은 ① 을 모두 「올린다」로 골라야 켜지고, ① 을 바꾸면 고른 것이 빠진다', () => {
    const 켬 = 표([[반영.key, { pick: 'APPLY' }]]);
    expect(켜졌나(바뀐요구, items, 켬)).toBe(true);
    const 고름 = 고름바꾼표(items, 켬, 바뀐요구.key, { pick: 'REDO' });
    expect(고름.get(바뀐요구.key)).toEqual({ pick: 'REDO' });
    const 뒤 = 고름바꾼표(items, 고름, 반영.key, { pick: 'LATER' });
    expect(뒤.has(바뀐요구.key)).toBe(false);
  });
});

describe('차례', () => {
  it('서버가 도는 차례 — 버그 → 기획서 새 버전 → 반영 → 고치기 → API', () => {
    const 고른 = 표([
      [바뀐API.key, { pick: 'REDO', env: 'stg' }],
      [반영.key, { pick: 'APPLY' }],
      [화면확인.key, { pick: 'SAME' }],
      [실패.key, { pick: 'BUG' }],
      [바뀐요구.key, { pick: 'REDO' }],
    ]);
    const 줄 = 차례(items, 고른, 3);
    expect(줄.map((x) => x.종류)).toEqual(['bug', 'prd', 'apply', 'fix', 'api']);
    expect(줄[1]).toMatchObject({ version: 4, 바뀜: [{ kind: 'CONFIRM', reqId: 'DMW-REQ-349' }] });
    expect(줄[4]).toMatchObject({ 수: 1 });
  });

  it('같은 문장으로 고치면 확정, 화면이 맞음을 고르면 바뀐 요구를 같이 다시 만든다', () => {
    const 고른 = 표([
      [화면확인.key, { pick: 'EDIT', text: '제목이 보인다' }],
      [실패.key, { pick: 'SCREEN' }],
    ]);
    const 줄 = 차례(items, 고른, 3);
    expect(줄.find((x) => x.종류 === 'prd')).toMatchObject({ 바뀜: [{ kind: 'CONFIRM', reqId: 'DMW-REQ-349' }] });
    expect(줄.find((x) => x.종류 === 'fix')).toMatchObject({ 화면: 1, 문장: 0, 바뀐요구: true, 같이: true, keys: [실패.key] });
    expect(같이다시만드나(items, 고른)).toBe(true);
  });

  it('문구 선택이 지금 문장과 같으면 문장이 안 바뀌어 같이 다시 만들지 않는다', () => {
    const 고른 = 표([[문구.key, { pick: 'PICK', option: 0 }]]);
    expect(차례(items, 고른, 1).map((x) => x.종류)).toEqual(['prd']);
    expect(같이다시만드나(items, 고른)).toBe(false);
  });
});

describe('줄요청', () => {
  it('반영 · 고치기 줄은 서버가 세운 요청 번호를 찾고, 기획서 줄은 없다', () => {
    const 고른 = 표([
      [반영.key, { pick: 'APPLY' }],
      [화면확인.key, { pick: 'EDIT', text: '큰 제목' }],
    ]);
    const 줄 = 차례(items, 고른, 3);
    const steps = [
      { step: 2, key: 화면확인.key, requestId: null, version: 4 },
      { step: 3, key: 반영.key, requestId: 501, version: null },
      { step: 4, key: null, requestId: 502, version: null },
    ];
    expect(줄.map((x) => 줄요청(x, steps))).toEqual([null, 501, 502]);
  });
});
