// 결정 목록 판단 검사 — 보낼 것 · ③ 켜짐 · 진행 차례 · 단계마다 요청 번호 (도메인/작성 §3.6 「★ 결정 목록」 진행)

import { describe, expect, it } from 'vitest';

import { 상한 } from '../prd/rules.js';
import type { 결정항목 } from './decideApi.js';
import { 요약 } from './authoringSummary.fixture.js';
import { 고름바꾼표, 보낼것, 줄요청, 차례, 켜졌나, type 고른값 } from './decideView.js';

const 반영: 결정항목 = { key: 'apply:10:11', group: 1, kind: 'APPLY', picks: ['APPLY'], blockedBy: null, rootId: 10, runId: 11, summary: 요약(), prUrl: null, requestedByName: '맥시', finishedAt: null };
const 실패: 결정항목 = { key: 'fail:7:DMW-FN-271', group: 2, kind: 'FAIL', picks: ['SCREEN', 'BUG'], blockedBy: null, runId: 7, tcId: 'DMW-FN-271', reqs: [{ reqId: 'DMW-REQ-088', text: '주문 취소' }], verify: null, reason: null, finishedAt: null };
const 화면확인: 결정항목 = { key: 'check:DMW-REQ-349', group: 2, kind: 'CHECK', picks: ['SAME', 'EDIT'], blockedBy: null, reqId: 'DMW-REQ-349', feature: '약관', text: '제목이 보인다', checkSince: null, basis: 'SCREEN', options: [] };
const 문구: 결정항목 = {
  key: 'check:DMW-REQ-021', group: 2, kind: 'CHECK', picks: ['PICK', 'OWN'], blockedBy: null, reqId: 'DMW-REQ-021', feature: '로그인', text: '올바르지 않습니다', checkSince: null, basis: 'DOCS',
  options: [{ asset: '기능정리.docx', quote: '올바르지 않습니다' }, { asset: '화면설명메모.md', quote: '확인해 주세요' }],
};
const 바뀐요구: 결정항목 = { key: 'prd:1:2', group: 3, kind: 'PRD_CHANGED', picks: ['REDO'], blockedBy: null, needsApply: true, changed: null, added: null, removed: null, scenarios: [] };
const 바뀐API: 결정항목 = { key: 'api:1:2', group: 3, kind: 'API_CHANGED', picks: ['REDO'], blockedBy: null, fromVersion: 1, toVersion: 2, operations: [{ method: 'GET', path: '/a', change: 'CHANGED', breaking: false }, { method: 'GET', path: '/b', change: 'REMOVED', breaking: true }] };
const 초안: 결정항목 = {
  key: 'draft:77', group: 2, kind: 'PRD_DRAFT', picks: ['TAKE', 'DROP'], blockedBy: null, requestId: 77, state: 'DONE', reason: null, buildNo: 'a1b2c3d', finishedAt: null,
  issues: [{ key: 'DM-12', title: '쿠폰 중복 적용 막기', url: 'https://bts.test/issues/DM-12' }, { key: 'DM-14', title: null, url: null }],
  rows: [
    { op: 'ADD', text: '쿠폰은 한 번만 쓴다', basis: '이슈 DM-12', issueKeys: ['DM-12'], sure: true, oldText: null, gone: false },
    { op: 'EDIT', reqId: 'DMW-REQ-031', text: '최근 3개월 것을 보여 준다', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: true, oldText: '최근 1개월 것을 보여 준다', gone: false },
    { op: 'DEL', reqId: 'DMW-REQ-033', text: '기간 버튼이 있다', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: false, oldText: '기간 버튼이 있다', gone: false },
    { op: 'ADD', text: '쿠폰을 바꾸면 알림이 뜬다', basis: '화면', issueKeys: ['DM-12'], sure: false, oldText: null, gone: false },
    { op: 'EDIT', reqId: 'DMW-REQ-090', text: '없어진 요구', basis: '이슈 DM-14', issueKeys: ['DM-14'], sure: true, oldText: null, gone: true },
  ],
  e2e: [{ title: '쿠폰 주문이 앱에도 보인다', services: ['DMW', 'DMA'], steps: ['주문'], issueKeys: ['DM-12'] }],
};
const items = [반영, 실패, 화면확인, 문구, 바뀐요구, 바뀐API];
const 표 = (줄: [string, 고른값][]) => new Map(줄);

describe('보낼것', () => {
  it('「나중에」 · 문장이 빈 고치기 · 상한을 넘은 문장 · 대상 서버 없는 API 다시 작성 · 켜지지 않은 ③ 은 안 보낸다', () => {
    const 고른 = 표([
      [실패.key, { pick: 'LATER' }],
      [화면확인.key, { pick: 'EDIT', text: '  ' }],
      [문구.key, { pick: 'OWN', text: '가'.repeat(상한.요구문장 + 1) }],
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
  });

  it('문구 선택이 지금 문장과 같으면 문장이 안 바뀌어 같이 다시 만들지 않는다', () => {
    const 고른 = 표([[문구.key, { pick: 'PICK', option: 0 }]]);
    expect(차례(items, 고른, 1).map((x) => x.종류)).toEqual(['prd']);
    expect(차례(items, 고른, 1).find((x) => x.종류 === 'fix')).toBeUndefined();
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

describe('PRD 초안 카드', () => {
  it('체크한 줄이 없으면 TAKE 를 보내지 않고, 버리기 · 다시 만들기는 고른 줄 없이 보낸다', () => {
    expect(보낼것([초안], 표([[초안.key, { pick: 'TAKE', rows: [] }]]))).toEqual([]);
    expect(보낼것([초안], 표([[초안.key, { pick: 'TAKE', rows: [0, 1] }]]))).toEqual([{ key: 초안.key, pick: 'TAKE', rows: [0, 1] }]);
    expect(보낼것([초안], 표([[초안.key, { pick: 'DROP' }]]))).toEqual([{ key: 초안.key, pick: 'DROP' }]);
    const 실패초안: 결정항목 = { ...초안, state: 'FAILED', picks: ['RETRY', 'DROP'] } as 결정항목;
    expect(보낼것([실패초안], 표([[초안.key, { pick: 'RETRY' }]]))).toEqual([{ key: 초안.key, pick: 'RETRY' }]);
  });

  it('TAKE 는 기획서 새 버전 줄에 초안 셈을 더하고 고쳐 다시 만드는 줄을 세운다 — 확인 필요는 체크 안 한 화면 기준 줄이다', () => {
    const 줄 = 차례([...items, 초안], 표([[초안.key, { pick: 'TAKE', rows: [0, 1] }], [화면확인.key, { pick: 'SAME' }]]), 3);
    expect(줄.map((x) => x.종류)).toEqual(['prd', 'fix']);
    expect(줄[0]).toMatchObject({ version: 4, keys: [화면확인.key, 초안.key], 초안: { 추가: 1, 수정: 1, 삭제: 0, 확인: 2 } });
    expect(줄[1]).toMatchObject({ 초안: 2, keys: [초안.key] });
  });

  it('DROP · RETRY 는 따로 줄이 서고 이슈 키를 단다', () => {
    const 실패초안 = { ...초안, key: 'draft:78', state: 'FAILED', picks: ['RETRY', 'DROP'], issues: [{ key: 'DM-15', title: null, url: null }] } as 결정항목;
    const 줄 = 차례([초안, 실패초안], 표([[초안.key, { pick: 'DROP' }], [실패초안.key, { pick: 'RETRY' }]]), 3);
    expect(줄).toEqual([
      { 곳: 'PRD', 종류: 'draftDrop', keys: [초안.key], 이슈: ['DM-12', 'DM-14'] },
      { 곳: 'PRD', 종류: 'draftRetry', keys: [실패초안.key], 이슈: ['DM-15'] },
    ]);
    const steps = [{ step: 6, key: 실패초안.key, requestId: 900, version: null }];
    expect(줄.map((x) => 줄요청(x, steps))).toEqual([null, 900]);
  });
});
