// 「PRD 관리」 화면 테스트가 같이 쓰는 판 — MKT 요구사항 표의 문장을 빌렸다

import type { PrdItem } from '@platform/kit';

import type { PrdNow } from './prdApi.js';

export const 며칠전 = (일: number) => new Date(Date.now() - 일 * 86_400_000).toISOString();

export const 아이디: PrdItem = {
  reqId: 'MKT-REQ-031',
  feature: '회원가입',
  text: '아이디는 영문 소문자·숫자 4~12자이고, 맞지 않으면 「아이디는 영문 소문자·숫자 4~12자입니다」가 보인다',
  basis: [{ from: '기획서.docx', ref: 'REQ-MEM-001', quote: '아이디: 영문 소문자·숫자 4~12자' }],
  status: 'CONFIRMED',
};
export const 아이디칸: PrdItem = {
  reqId: 'MKT-REQ-032',
  feature: '회원가입',
  text: '아이디 칸에는 12자까지만 들어간다',
  basis: [{ from: '화면', ref: '/signup', quote: '13자를 적으면 오류 문구 없이 12자까지만 들어간다' }],
  status: 'NEEDS_CHECK',
  checkSince: 며칠전(2),
};
export const 로그인실패: PrdItem = {
  reqId: 'MKT-REQ-040',
  feature: '로그인',
  text: '없는 아이디로 로그인하면 「아이디 또는 비밀번호가 맞지 않습니다」가 보인다',
  basis: [
    { from: '화면', ref: '/login', quote: '아이디 또는 비밀번호가 맞지 않습니다' },
    { from: '기획서.docx', ref: 'REQ-MEM-010', quote: '로그인 실패 시 「회원 정보가 없습니다」 안내' },
  ],
  status: 'NEEDS_CHECK',
  checkSince: 며칠전(9),
};
export const 잠금: PrdItem = {
  reqId: 'MKT-REQ-041',
  feature: '로그인',
  text: '비밀번호를 5번 연속 틀리면 계정이 10분 동안 잠긴다',
  basis: [{ from: '기획서.docx', ref: 'REQ-MEM-011', quote: '5회 연속 실패 시 10분 잠금' }],
  status: 'CONFIRMED',
  byPerson: true,
};

export function 판(덮을것: Partial<PrdNow> = {}): PrdNow {
  return {
    version: 12,
    items: [아이디, 아이디칸, 로그인실패, 잠금],
    unapplied: { changed: [], added: ['MKT-REQ-041'], removed: ['MKT-REQ-012'] },
    needsCheck: { count: 2, oldestSince: 며칠전(9) },
    ...덮을것,
  };
}
