// 작성 목록 summary 를 사람 말로 옮기는 판단 검사 (도메인/작성 §3.6 「작성 목록 줄」 · WEB-F6-06)

import { describe, expect, it } from 'vitest';

import { 결과글, 무슨테스트, 시작글, 올릴테스트수 } from './authoringSummary.js';
import { 요약 } from './authoringSummary.fixture.js';

const 행 = { requestedByName: '맥시', createdAt: '2026-10-26T01:00:00Z' };

describe('무슨 테스트', () => {
  it('기획서에 없는 화면은 화면 이름 · 결정 진행은 바뀐 요구와 화면이 맞음 · 0 인 조각은 뺀다', () => {
    expect(무슨테스트(요약({ kind: 'UNCOVERED', what: { screens: ['이용약관', '개인정보처리방침'] } }), 'ko')).toBe('이용약관 · 개인정보처리방침 화면 테스트');
    expect(무슨테스트(요약({ kind: 'DECISION', what: { reqs: 3, screenRight: 1 } }), 'ko')).toBe('바뀐 요구 3건 · 화면이 맞음 1건 테스트 고치기');
    expect(무슨테스트(요약({ kind: 'DECISION', what: { screenRight: 2 } }), 'ko')).toBe('화면이 맞음 2건 테스트 고치기');
  });

  it('케이스 고치기는 첫 번호와 나머지 수 · 고친 것', () => {
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['DMW-FN-120', 'DMW-FN-121', 'DMW-FN-122'], tcMore: 0, fix: 'EXPECTED' } }), 'ko')).toBe('DMW-FN-120 외 2건 기대값 고치기');
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['DMW-FN-009'], fix: 'DELETE' } }), 'ko')).toBe('DMW-FN-009 삭제');
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['A-FN-001', 'A-FN-002', 'A-FN-003'], tcMore: 4 } }), 'ko')).toBe('A-FN-001 외 6건 고치기');
  });

  it('끝나기 전이라 모르면 처음 자료 이름(피그마는 「Figma 디자인」), 자료도 없으면 종류', () => {
    expect(무슨테스트(요약({ from: { assets: [{ name: 'https://www.figma.com/design/x', figma: true }, { name: 'a.pdf', figma: false }], assetsMore: 1 } }), 'ko')).toBe('Figma 디자인 외 2개');
    expect(무슨테스트(요약({ kind: 'PRD_APPLY' }), 'ko')).toBe('바뀐 요구 다시 작성');
  });
});

describe('결과 · 시작한 곳', () => {
  it('고치기는 고친 수 · 결과가 다 0 이면 없다(상태 글이 대신한다) · 고치기 멈춤은 단계를 말하지 않는다', () => {
    expect(결과글(요약({ kind: 'EDIT', result: { casesFixed: 3 } }), 'ko')).toEqual({ 글: '케이스 3건 고침', 실패: false });
    expect(결과글(요약({ result: { casesMade: 0, reqsTotal: 0, reqsCovered: 0, held: 0 } }), 'ko')).toBeNull();
    expect(결과글(요약({ kind: 'EDIT', result: { stoppedAt: '케이스를 고치는 중' } }), 'ko')).toEqual({ 글: '고치는 중에 멈춤', 실패: true });
    // 칸 표에 없는 단계 글은 첫 칸(준비)으로 옮기지 않는다
    expect(결과글(요약({ result: { stoppedAt: '채운 케이스를 3회 돌리는 중' } }), 'ko')).toEqual({ 글: '중간에 멈춤 · 만든 케이스 없음', 실패: true });
    expect(결과글(요약({ result: { stoppedAt: '준비' } }), 'ko')?.글).toBe('준비 단계에서 멈춤 · 만든 케이스 없음');
    expect(결과글(요약({ result: { stoppedAt: '' } }), 'ko')?.글).toBe('시작 전에 멈춤');
  });

  it('서버가 세운 요청은 앞 뿌리를 적고 요청한 사람을 안 적는다 · 이어 작성 · 결정 · 케이스 목록', () => {
    expect(시작글(요약({ kind: 'UNCOVERED', from: { by: 'AUTO', after: 14675 } }), 행, 'ko')).toMatch(/^#14675 다음 · 서버가 자동으로 시작 · [^요]+$/);
    expect(시작글(요약({ kind: 'CONTINUE', from: { after: 6120, assets: [{ name: '기획서.docx', figma: false }] } }), 행, 'ko')).toMatch(/^#6120의 남은 요구 · 자료 기획서\.docx · 요청한 사람 맥시 · /);
    expect(시작글(요약({ kind: 'DECISION', from: { by: 'DECISION', decisions: 4 } }), 행, 'ko')).toMatch(/^결정 4건 · 요청한 사람 맥시/);
    expect(시작글(요약({ kind: 'EDIT', from: { by: 'CASES' } }), 행, 'ko')).toMatch(/^케이스 목록에서 시작 · 요청한 사람 맥시/);
  });

  it('결정 목록 ① 의 N 은 만든 케이스와 고친 케이스 — 모르거나 0 이거나 고치기면 null', () => {
    expect(올릴테스트수(요약({ result: { casesMade: 410, casesFixed: 2 } }))).toBe(412);
    expect(올릴테스트수(요약({ result: { held: 1 } }))).toBeNull();
    expect(올릴테스트수(요약())).toBeNull();
    expect(올릴테스트수(요약({ result: { casesMade: 0, casesFixed: 0 } }))).toBeNull();
    expect(올릴테스트수(요약({ kind: 'EDIT', result: { casesFixed: 3 } }))).toBeNull();
  });
});
