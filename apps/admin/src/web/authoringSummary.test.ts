// 작성 목록 summary 를 사람 말로 옮기는 판단 검사 (도메인/작성 §3.6 「작성 목록 줄」 · WEB-F6-06)

import { describe, expect, it } from 'vitest';

import { 구분글, 단계꼬리, 대상글, 무슨테스트, 소요시간글, 소요초, 올릴테스트수, 작성자글, 작성일글, 케이스수 } from './authoringSummary.js';
import { 요약 } from './authoringSummary.fixture.js';

describe('무슨 테스트', () => {
  it('기획서에 없는 화면은 화면 이름 · 결정 진행은 바뀐 요구와 화면이 맞음 · 0 인 조각은 뺀다', () => {
    expect(무슨테스트(요약({ kind: 'UNCOVERED', what: { screens: ['이용약관', '개인정보처리방침'] } }), 'ko')).toBe('이용약관 · 개인정보처리방침 화면 테스트');
    expect(무슨테스트(요약({ kind: 'DECISION', what: { reqs: 3, screenRight: 1 } }), 'ko')).toBe('변경된 요구사항 3건 · 화면이 맞음 1건 테스트 수정');
    expect(무슨테스트(요약({ kind: 'DECISION', what: { screenRight: 2 } }), 'ko')).toBe('화면이 맞음 2건 테스트 수정');
  });

  it('케이스 고치기는 첫 번호와 나머지 수 · 고친 것', () => {
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['DMW-FN-120', 'DMW-FN-121', 'DMW-FN-122'], tcMore: 0, fix: 'EXPECTED' } }), 'ko')).toBe('DMW-FN-120 외 2건 기대 결과 수정');
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['DMW-FN-009'], fix: 'DELETE' } }), 'ko')).toBe('DMW-FN-009 삭제');
    expect(무슨테스트(요약({ kind: 'EDIT', what: { tcIds: ['A-FN-001', 'A-FN-002', 'A-FN-003'], tcMore: 4 } }), 'ko')).toBe('A-FN-001 외 6건 수정');
  });

  it('끝나기 전이라 모르면 처음 자료 이름(피그마는 「Figma 디자인」), 자료도 없으면 종류', () => {
    expect(무슨테스트(요약({ from: { assets: [{ name: 'https://www.figma.com/design/x', figma: true }, { name: 'a.pdf', figma: false }], assetsMore: 1 } }), 'ko')).toBe('Figma 디자인 외 2개');
    expect(무슨테스트(요약({ kind: 'PRD_APPLY' }), 'ko')).toBe('변경된 요구사항 다시 작성');
  });
});

describe('목록 표 칸 (2026-11-10 사용자 시안)', () => {
  it('구분은 신규 · 수정 · 추가 셋 — 다시 작성 · 케이스 수정 · 결정 진행은 모두 수정', () => {
    expect(구분글(요약({ kind: 'PRD' }), 'ko')).toBe('신규');
    expect(구분글(요약({ kind: 'SCREEN_ONLY' }), 'ko')).toBe('신규');
    for (const kind of ['PRD_APPLY', 'API_APPLY', 'DECISION', 'EDIT'] as const) expect(구분글(요약({ kind }), 'ko')).toBe('수정');
    expect(구분글(요약({ kind: 'CONTINUE' }), 'ko')).toBe('추가');
    expect(구분글(요약({ kind: 'UNCOVERED' }), 'en')).toBe('Additional');
  });

  it('대상은 기능 이름 셋과 외 N개 — 화면만 다루는 줄은 화면 이름 · 모르면 —', () => {
    expect(대상글(요약({ what: { features: ['회원가입', '로그인', '장바구니'], featuresMore: 3 } }), 'ko')).toBe('회원가입 · 로그인 · 장바구니 외 3개');
    expect(대상글(요약({ kind: 'EDIT', what: { features: ['장바구니'] } }), 'ko')).toBe('장바구니');
    expect(대상글(요약({ kind: 'UNCOVERED', what: { screens: ['쿠폰함', '마이페이지'], features: ['무시'] } }), 'ko')).toBe('쿠폰함 · 마이페이지');
    expect(대상글(요약({ kind: 'PRD_APPLY' }), 'ko')).toBe('—');
  });

  it('케이스 수는 만든 것과 수정한 것의 합 — 0 도 0 이고 끝나기 전이면 null', () => {
    expect(케이스수(요약({ result: { casesMade: 30, casesFixed: 2 } }))).toBe(32);
    expect(케이스수(요약({ kind: 'EDIT', result: { casesFixed: 3 } }))).toBe(3);
    expect(케이스수(요약({ result: { casesMade: 0 } }))).toBe(0);
    expect(케이스수(요약({ result: { held: 1 } }))).toBeNull();
    expect(케이스수(요약())).toBeNull();
  });

  it('소요 시간은 서버가 잰 작성 시간 · 작성 중이면 지금까지 · 반영 실행 · 대기는 모른다', () => {
    const 지금 = Date.parse('2026-11-10T02:18:00Z');
    const 줄 = { kind: 'AUTHOR' as const, status: 'RUNNING' as const, startedAt: '2026-11-10T02:00:00Z' };
    expect(소요초(요약({ result: { tookSec: 4320 } }), { ...줄, kind: 'MERGE' }, 지금)).toBe(4320);
    expect(소요초(요약(), 줄, 지금)).toBe(1080);
    expect(소요초(요약(), { ...줄, kind: 'MERGE' }, 지금)).toBeNull();
    expect(소요초(요약(), { ...줄, status: 'PENDING', startedAt: null }, 지금)).toBeNull();
    expect([45, 1080, 3600, 4320].map((초) => 소요시간글(초, 'ko'))).toEqual(['45초', '18분', '1시간', '1시간 12분']);
  });

  it('작성일은 YYYY-MM-DD HH:mm · 서버가 세운 줄의 작성자는 Agent', () => {
    expect(작성일글('2026-11-10T14:22:00')).toBe('2026-11-10 14:22');
    expect(작성자글(요약({ kind: 'UNCOVERED', from: { by: 'AUTO', after: 1 } }), { requestedByName: '맥시' })).toBe('Agent');
    expect(작성자글(요약(), { requestedByName: '맥시' })).toBe('맥시');
  });

  it('상태 뒤 단계 — 작성 중은 칸과 몇째, 실패 · 중단은 멈춘 칸 · 수정 · 반영 · 모르는 단계 글 · 시작 전은 붙이지 않는다', () => {
    expect(단계꼬리(요약(), { kind: 'AUTHOR', stage: '케이스를 만드는 중' }, 'running', 'ko')).toBe('케이스 작성 3/6');
    expect(단계꼬리(요약(), { kind: 'AUTHOR', stage: null }, 'running', 'ko')).toBe('준비 1/6');
    expect(단계꼬리(요약({ result: { stoppedAt: '자료를 받는 중' } }), { kind: 'AUTHOR', stage: null }, 'failed', 'ko')).toBe('자료 · PRD 읽기');
    expect(단계꼬리(요약({ result: { stoppedAt: '준비' } }), { kind: 'AUTHOR', stage: null }, 'stopped', 'ko')).toBe('준비');
    expect(단계꼬리(요약({ result: { stoppedAt: '' } }), { kind: 'AUTHOR', stage: null }, 'stopped', 'ko')).toBeNull();
    expect(단계꼬리(요약({ result: { stoppedAt: '채운 케이스를 3회 돌리는 중' } }), { kind: 'AUTHOR', stage: null }, 'failed', 'ko')).toBeNull();
    expect(단계꼬리(요약({ kind: 'EDIT' }), { kind: 'AUTHOR', stage: '케이스를 고치는 중' }, 'running', 'ko')).toBeNull();
    expect(단계꼬리(요약(), { kind: 'MERGE', stage: 'CI 기다리는 중' }, 'running', 'ko')).toBeNull();
    expect(단계꼬리(요약(), { kind: 'AUTHOR', stage: null }, 'done', 'ko')).toBeNull();
  });

  it('결정 목록 ① 의 N 은 만든 케이스와 고친 케이스 — 모르거나 0 이거나 고치기면 null', () => {
    expect(올릴테스트수(요약({ result: { casesMade: 410, casesFixed: 2 } }))).toBe(412);
    expect(올릴테스트수(요약({ result: { held: 1 } }))).toBeNull();
    expect(올릴테스트수(요약())).toBeNull();
    expect(올릴테스트수(요약({ result: { casesMade: 0, casesFixed: 0 } }))).toBeNull();
    expect(올릴테스트수(요약({ kind: 'EDIT', result: { casesFixed: 3 } }))).toBeNull();
  });
});
