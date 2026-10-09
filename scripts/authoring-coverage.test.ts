// 끝내기 result.coverage 를 원장 대조에서 계산하고 싣는 검사 (도메인/작성 §3.6 「★ 원장」)
import { describe, expect, it } from 'vitest';

import { 커버리지모양검사 } from '../apps/admin/src/authoring/coverage.js';
import { 커버리지만들기, 커버리지실은몸, 커버리지싣는손 } from './authoring-coverage.js';
import type { 보고손 } from './authoring-io.js';
import { type 원장, 원장뽑기 } from './authoring-ledger.js';
import { 원장대조 } from './authoring-ledger-check.js';

const 표 = (요구줄: string[], 제외줄: string[] = []) =>
  [
    '## 요구사항',
    '',
    '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |',
    '|---|---|---|---|---|---|---|---|',
    ...요구줄,
    '',
    '## 제외',
    '',
    '| 요구 | 종류 | 사유 |',
    '|---|---|---|',
    ...제외줄,
    '',
  ].join('\n');
const 줄 = (출처: string, tcId: string) => `| 1 | 정상 | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-09-30 |`;

const 원장값: 원장 = {
  항목: ['REQ-A-1', 'REQ-A-2', 'REQ-A-3', 'REQ-A-4', 'REQ-A-5', 'REQ-A-6'].map((번호) => ({ 번호, 자료: '기획.docx', 지문: '0000000000000000' })),
  가족: { 'REQ-A': 6 },
  모드: { '기획.docx': '번호' },
  경고: [],
  빠진자료: [],
  꼴: {},
};
const 대조 = 원장대조(
  원장값.항목,
  표(
    [줄('REQ-A-1', 'X-001'), 줄('REQ-A-2', 'X-002'), 줄('REQ-A-2 REQ-A-3', 'X-003')],
    ['| REQ-A-4 | 다음 요청 | 이번 범위 밖 |', '| REQ-A-5 | 요구 아님 | 개요 |'],
  ),
  { 있는케이스: new Set(['X-001', 'X-002', 'X-003']), 에이전트: true, 다음요청: new Set(['REQ-A-4']) },
);
const 재료 = { 대조, 원장: 원장값 };

describe('커버리지만들기', () => {
  it('보류 케이스로만 덮인 번호가 보류다 — 보통 케이스와 같이 덮으면 아니다', () => {
    expect(커버리지만들기(재료, new Set(['X-001', 'X-003']))).toEqual({
      total: 6,
      cased: 3,
      held: 2,
      excluded: { '다음 요청': 1, '요구 아님': 1 },
      missing: ['REQ-A-6'],
      later: ['REQ-A-4'],
      casedFn: 3,
      casedUi: 0,
    });
  });

  it('갈래 두 수를 대조에서 그대로 싣는다 — 같이 덮은 요구는 둘 다에 든다', () => {
    expect(커버리지만들기({ 대조: { ...대조, 갈래: { 기능: 2, UI: 2 } }, 원장: 원장값 }, new Set())).toMatchObject({ casedFn: 2, casedUi: 2 });
  });

  it('보류를 모르면 null · 보류가 없으면 0', () => {
    expect(커버리지만들기(재료, null)).toMatchObject({ held: null });
    expect(커버리지만들기(재료, new Set())).toMatchObject({ held: 0 });
  });

  it('원장에 못 넣은 자료를 싣는다', () => {
    const 섞임 = { 대조, 원장: { ...원장값, 빠진자료: ['화면.pdf'] } };
    expect(커버리지만들기(섞임, new Set())).toMatchObject({ unread: ['화면.pdf'] });
  });

  it('원장 없음 까닭 · 자료 이름은 서버 상한으로 자르되 이모지 짝을 가르지 않는다 — 셈이 통째로 빠지지 않게', () => {
    const 긴까닭 = `${'가'.repeat(499)}😀끝`;
    const 셈 = 커버리지만들기({ 없음: 긴까닭 }, null);
    expect(커버리지모양검사(셈)).not.toBeNull();
    expect('none' in 셈 && 셈.none).toBe('가'.repeat(499));
    const 긴이름 = `${'a'.repeat(199)}😀.pdf`;
    const 섞임 = 커버리지만들기({ 대조, 원장: { ...원장값, 빠진자료: [긴이름] } }, new Set());
    expect('unread' in 섞임 && 섞임.unread).toEqual(['a'.repeat(199)]);
  });

  it('UI 케이스로만 덮인 번호를 uiOnly 로 싣는다 — 없으면 키를 안 싣는다', () => {
    expect(커버리지만들기({ 대조: { ...대조, UI만: ['REQ-A-2'] }, 원장: 원장값 }, new Set())).toMatchObject({ uiOnly: ['REQ-A-2'] });
    expect(커버리지만들기({ 대조: { ...대조, UI만: [] }, 원장: 원장값 }, new Set())).not.toHaveProperty('uiOnly');
  });

  it('원장이 없으면 까닭만 싣는다', () => {
    expect(커버리지만들기({ 없음: '글자본이 없는 자료(PDF · 피그마)' }, null)).toEqual({ none: '글자본이 없는 자료(PDF · 피그마)' });
  });

  it('만든 셈은 서버의 모양 검사를 넘는다 — 넘지 못하면 끝내기가 400 이다', () => {
    const 뽑은 = 원장뽑기('REQ-B-001 REQ-B-002 REQ-B-003 REQ-B-004', 'a');
    const 데모: 원장 = { 항목: 뽑은.항목, 가족: 뽑은.가족, 모드: { a: 뽑은.모드 }, 경고: [], 빠진자료: [], 꼴: {} };
    const 큰대조 = 원장대조(데모.항목, 표([줄('REQ-B-001', 'Y-001')], ['| REQ-B-002 | 다음 요청 | 뒤로 |']), {
      있는케이스: new Set(['Y-001']),
      에이전트: true,
      다음요청: new Set(['REQ-B-002']),
    });
    for (const 보류 of [null, new Set<string>(), new Set(['Y-001'])]) {
      expect(커버리지모양검사(커버리지만들기({ 대조: 큰대조, 원장: 데모 }, 보류))).not.toBeNull();
    }
    expect(커버리지모양검사(커버리지만들기(재료, new Set(['X-002'])))).not.toBeNull();
  });
});

describe('커버리지실은몸', () => {
  it('DONE 은 result.held 의 tcId 로 보류를 센다 · 있던 result 는 그대로', () => {
    const 몸 = { status: 'DONE', prUrl: 'p', result: { diffs: [1], held: [{ tcId: 'X-003' }] } };
    const 실은 = 커버리지실은몸(몸, 재료);
    expect(실은.result).toMatchObject({ diffs: [1], held: [{ tcId: 'X-003' }], coverage: { held: 1 } });
  });

  it('DONE 인데 held 키가 없으면 보류 0 — 보류가 없으면 몸을 안 바꾼다', () => {
    expect(커버리지실은몸({ status: 'DONE' }, 재료).result).toMatchObject({ coverage: { held: 0 } });
  });

  it('보류를 못 읽었으면(heldUnknown) 보류 null', () => {
    expect(커버리지실은몸({ status: 'DONE', result: { heldUnknown: true } }, 재료).result).toMatchObject({ coverage: { held: null } });
  });

  it('대조 뒤 올리기 거절에도 싣는다 — 보류는 모른다', () => {
    const 실은 = 커버리지실은몸({ status: 'STOPPED', stopReason: 'REJECTED', error: 'push 실패' }, 재료);
    expect(실은.result).toMatchObject({ coverage: { held: null, missing: ['REQ-A-6'] } });
  });

  it('실패 · 다른 중단 · 재료 없음에는 싣지 않는다', () => {
    expect(커버리지실은몸({ status: 'FAILED', error: 'x' }, 재료)).toEqual({ status: 'FAILED', error: 'x' });
    expect(커버리지실은몸({ status: 'STOPPED', stopReason: 'USER' }, 재료)).toEqual({ status: 'STOPPED', stopReason: 'USER' });
    expect(커버리지실은몸({ status: 'DONE' }, null)).toEqual({ status: 'DONE' });
  });

  it('셈이 너무 크면 싣지 않는다 — 본문 상한(1MiB)을 넘으면 서버가 400 이 아니라 413 을 내 셈만 빼고 다시 보내는 길을 못 탄다', () => {
    const 많이 = Array.from({ length: 60000 }, (_, i) => `REQ-LONGFAMILY-${String(i + 1)}`);
    const 큰재료 = { 대조: { ...대조, 빠짐: 많이, 셈: { ...대조.셈, 총: 대조.셈.총 + 많이.length - 1, 빠짐: 많이.length } }, 원장: 원장값 };
    expect(커버리지실은몸({ status: 'DONE' }, 큰재료)).toEqual({ status: 'DONE' });
  });

  it('서버 모양 검사에 걸릴 셈은 싣지 않는다 — 셈 하나로 끝내기가 400 이 되지 않게', () => {
    const 긴번호 = { 대조: { ...대조, 빠짐: ['R'.repeat(201)] }, 원장: 원장값 };
    expect(커버리지실은몸({ status: 'DONE' }, 긴번호)).toEqual({ status: 'DONE' });
  });
});

describe('커버리지싣는손', () => {
  it('끝낼 때의 재료를 읽는다 — 대조 전 끝내기에는 싣지 않는다', async () => {
    const 보낸: Record<string, unknown>[] = [];
    const 손: 보고손 = { 단계: async () => null, 끝내기: async (몸) => void 보낸.push(몸) };
    let 지금: typeof 재료 | null = null;
    const 싼손 = 커버리지싣는손(손, () => 지금);
    await 싼손.끝내기({ status: 'STOPPED', stopReason: 'REJECTED', error: '테스트 밖 파일' });
    지금 = 재료;
    await 싼손.끝내기({ status: 'DONE' });
    expect(보낸[0]).not.toHaveProperty('result');
    expect(보낸[1]?.result).toMatchObject({ coverage: { total: 6 } });
  });
});
