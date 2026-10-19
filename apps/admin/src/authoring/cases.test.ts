// 작성 끝내기 result.cases 의 모양 검사 · 실릴 수 있는 자리 · 상세 읽기 (SPEC 도메인/작성 §7 finish)

import { describe, expect, it } from 'vitest';

import {
  끝내기케이스맞나,
  요구번호상한,
  요구수상한,
  케이스건수상한,
  케이스글상한,
  케이스모양검사,
  행케이스,
  확인문장수상한,
} from './cases.js';

const 케이스 = (덮어쓰기: Record<string, unknown> = {}) => ({
  tcId: 'XWC-FN-001',
  name: '로그인한다',
  file: 'tests/xwc/login.spec.ts',
  change: 'NEW',
  verifies: ['로그인된다'],
  reqs: ['XWC-REQ-001'],
  ...덮어쓰기,
});

describe('케이스모양검사', () => {
  it('맞는 모양과 빈 목록을 받는다', () => {
    expect(케이스모양검사([케이스(), 케이스({ tcId: 'XWC-FN-002', change: 'CHANGED', verifies: [], reqs: [] })])).toHaveLength(2);
    expect(케이스모양검사([])).toEqual([]);
  });

  it('목록이 아니거나 건수가 상한을 넘으면 거절한다', () => {
    expect(케이스모양검사(null)).toBeNull();
    expect(케이스모양검사({})).toBeNull();
    const 많음 = Array.from({ length: 케이스건수상한 + 1 }, (_, i) => 케이스({ tcId: `XWC-FN-${String(i).padStart(3, '0')}` }));
    expect(케이스모양검사(많음)).toBeNull();
  });

  it('tests/ 밖 파일은 거절한다', () => {
    expect(케이스모양검사([케이스({ file: 'docs/cases/XWC.md' })])).toBeNull();
  });

  it('change 가 NEW · CHANGED 가 아니면 거절한다', () => {
    expect(케이스모양검사([케이스({ change: 'DELETED' })])).toBeNull();
    expect(케이스모양검사([케이스({ change: undefined })])).toBeNull();
  });

  it('tcId 가 꼴에 안 맞거나 같은 tcId 두 줄이면 거절한다', () => {
    expect(케이스모양검사([케이스({ tcId: 'xwc-1' })])).toBeNull();
    expect(케이스모양검사([케이스(), 케이스()])).toBeNull();
  });

  it('모르는 키 · 빈 글 · 글 상한 초과를 거절한다', () => {
    expect(케이스모양검사([케이스({ extra: 1 })])).toBeNull();
    expect(케이스모양검사([케이스({ name: '' })])).toBeNull();
    expect(케이스모양검사([케이스({ name: '가'.repeat(케이스글상한 + 1) })])).toBeNull();
    expect(케이스모양검사([케이스({ file: '가'.repeat(케이스글상한 + 1) })])).toBeNull();
    expect(케이스모양검사([케이스({ name: '가'.repeat(케이스글상한) })])).not.toBeNull();
  });

  it('verifies 는 개수와 각 글자 수 상한이 있다', () => {
    expect(케이스모양검사([케이스({ verifies: Array.from({ length: 확인문장수상한 }, () => '확인') })])).not.toBeNull();
    expect(케이스모양검사([케이스({ verifies: Array.from({ length: 확인문장수상한 + 1 }, () => '확인') })])).toBeNull();
    expect(케이스모양검사([케이스({ verifies: ['가'.repeat(케이스글상한 + 1)] })])).toBeNull();
    expect(케이스모양검사([케이스({ verifies: [''] })])).toBeNull();
    expect(케이스모양검사([케이스({ verifies: '확인' })])).toBeNull();
  });

  it('reqs 는 개수 · 번호 길이 상한이 있고 중복을 거절한다', () => {
    expect(케이스모양검사([케이스({ reqs: Array.from({ length: 요구수상한 }, (_, i) => `R${String(i)}`) })])).not.toBeNull();
    expect(케이스모양검사([케이스({ reqs: Array.from({ length: 요구수상한 + 1 }, (_, i) => `R${String(i)}`) })])).toBeNull();
    expect(케이스모양검사([케이스({ reqs: ['R'.repeat(요구번호상한 + 1)] })])).toBeNull();
    expect(케이스모양검사([케이스({ reqs: ['R'.repeat(요구번호상한)] })])).not.toBeNull();
    expect(케이스모양검사([케이스({ reqs: ['A', 'A'] })])).toBeNull();
  });
});

describe('끝내기케이스맞나 — 어디에 실릴 수 있나', () => {
  const 목록 = [케이스()];

  it('싣지 않았으면 어디서나 맞다', () => {
    for (const [종류, status] of [['AUTHOR', 'DONE'], ['MERGE', 'DONE'], ['EDIT', 'DONE'], ['AUTHOR', 'FAILED'], ['AUTHOR', 'STOPPED']] as const) {
      expect(끝내기케이스맞나(종류, status, {}, undefined)).toBe(true);
    }
  });

  it('작성 · 재작성의 DONE 에만 실린다', () => {
    expect(끝내기케이스맞나('AUTHOR', 'DONE', {}, 목록)).toBe(true);
    expect(끝내기케이스맞나('RERUN', 'DONE', {}, 목록)).toBe(true);
    expect(끝내기케이스맞나('MERGE', 'DONE', {}, 목록)).toBe(false);
    expect(끝내기케이스맞나('EDIT', 'DONE', {}, 목록)).toBe(false);
    expect(끝내기케이스맞나('AUTHOR', 'FAILED', {}, 목록)).toBe(false);
    expect(끝내기케이스맞나('AUTHOR', 'STOPPED', {}, 목록)).toBe(false);
  });

  it('케이스 고치기를 다시 적용한 RERUN(params.edits 가 배열)도 고치기로 쳐서 거절한다', () => {
    expect(끝내기케이스맞나('RERUN', 'DONE', { edits: [] }, 목록)).toBe(false);
    expect(끝내기케이스맞나('RERUN', 'DONE', { edits: 'x' }, 목록)).toBe(true);
  });

  it('실려도 모양이 틀리면 거절한다', () => {
    expect(끝내기케이스맞나('AUTHOR', 'DONE', {}, [케이스({ change: 'X' })])).toBe(false);
    expect(끝내기케이스맞나('AUTHOR', 'DONE', {}, 'x')).toBe(false);
  });
});

describe('행케이스', () => {
  it('저장된 result 의 cases 를 그대로 낸다', () => {
    expect(행케이스({ cases: [케이스()] })).toEqual([케이스()]);
  });

  it('없거나 모양이 틀린 옛 행은 null 이다', () => {
    expect(행케이스(null)).toBeNull();
    expect(행케이스({})).toBeNull();
    expect(행케이스({ cases: [{ tcId: 'x' }] })).toBeNull();
  });
});

describe('끝내기케이스맞나 — 서비스 접두사', () => {
  it('접두사를 주면 그 서비스 번호만 받는다', () => {
    expect(끝내기케이스맞나('AUTHOR', 'DONE', null, [케이스()], 'XWC')).toBe(true);
    expect(끝내기케이스맞나('AUTHOR', 'DONE', null, [케이스({ tcId: 'MKT-FN-001' })], 'XWC')).toBe(false);
  });
});
