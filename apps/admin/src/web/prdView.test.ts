import type { PrdItem } from '@platform/kit';
import { describe, expect, it } from 'vitest';

import { 직접근거, 로그인역할 } from '../prd/rules.js';
import { 고친판, 고치기검사, 묶음들, 묶음이름문제, 판차이 } from './prdView.js';

const 항목 = (reqId: string, feature: string, 덮을것: Partial<PrdItem> = {}): PrdItem => ({
  reqId,
  feature,
  text: `${reqId} 요구`,
  basis: [{ from: '기획서.docx', ref: 'REQ-1', quote: '원문' }],
  status: 'CONFIRMED',
  ...덮을것,
});

describe('기능 묶음', () => {
  it('판에 처음 나온 차례로 묶는다', () => {
    const 판 = [항목('MKT-REQ-001', '회원가입'), 항목('MKT-REQ-002', '로그인'), 항목('MKT-REQ-003', '회원가입')];
    expect(묶음들(판).map((g) => [g.feature, g.items.map((x) => x.reqId)])).toEqual([
      ['회원가입', ['MKT-REQ-001', 'MKT-REQ-003']],
      ['로그인', ['MKT-REQ-002']],
    ]);
  });
});

describe('목차 정리 필요', () => {
  const 화면만 = { basis: [{ from: '화면', ref: '/write', quote: '제목 50자' }] };
  const 이슈 = { basis: [{ from: 'DMQ-3', quote: 'DMQ-3 설명' }], fromIssues: ['DMQ-3'] };

  it('기획서 제목 꼴이면 문제 없다', () => {
    const 판 = [항목('MKT-REQ-001', '회원가입')];
    expect(묶음이름문제('회원가입', 판, 판)).toBeNull();
  });

  it('30자 넘는 이름 · 문장 꼴 이름을 잡는다', () => {
    const 긴 = '가'.repeat(31);
    expect(묶음이름문제(긴, [항목('MKT-REQ-001', 긴)], [])).toBe('long');
    const 문장 = '운영툴 쿠폰 안내를 「보냈습니다」로 바꾼다';
    expect(묶음이름문제(문장, [항목('MKT-REQ-001', 문장, 이슈)], [])).toBe('sentence');
    expect(묶음이름문제('쿠폰 안내를 바꾼다', [항목('MKT-REQ-001', '쿠폰 안내를 바꾼다', 이슈)], [])).toBe('sentence');
  });

  it('기획서에서 온 항목이 있는 판에서 화면 · 이슈만 근거인 묶음은 제목에 없는 이름이다', () => {
    const 판 = [항목('MKT-REQ-001', '글쓰기 · 수정'), 항목('MKT-REQ-002', '글쓰기', 화면만), 항목('MKT-REQ-003', '알림', 이슈)];
    expect(묶음이름문제('글쓰기', [판[1]!], 판)).toBe('noHeading');
    expect(묶음이름문제('알림', [판[2]!], 판)).toBe('noHeading');
    expect(묶음이름문제('글쓰기 · 수정', [판[0]!], 판)).toBeNull();
  });

  it('기획서 없이 화면만 · 직접 쓴 판은 제목을 견주지 않는다', () => {
    const 판 = [항목('MKT-REQ-001', '글쓰기', 화면만), 항목('MKT-REQ-002', '공지', { basis: 직접근거('공지') })];
    expect(묶음이름문제('글쓰기', [판[0]!], 판)).toBeNull();
    expect(묶음이름문제('공지', [판[1]!], 판)).toBeNull();
  });
});

describe('보낼 판', () => {
  const 판 = [항목('MKT-REQ-001', '가'), 항목('MKT-REQ-002', '나')];
  const 새것 = { feature: '다', text: '새 요구사항', basis: [{ from: '화면', quote: '보인 글' }], status: 'NEEDS_CHECK' as const };

  it('번호가 있으면 그 자리에서 바꾸고 번호는 그대로 둔다', () => {
    expect(고친판(판, 'MKT-REQ-001', 새것)).toEqual([{ ...새것, reqId: 'MKT-REQ-001' }, 판[1]]);
  });

  it('새것이 null 이면 그 항목을 뺀다', () => {
    expect(고친판(판, 'MKT-REQ-001', null)).toEqual([판[1]]);
  });

  it('번호가 없으면 번호 없이 맨 뒤에 더한다 — 번호는 서버가 매긴다', () => {
    expect(고친판(판, null, 새것)).toEqual([...판, 새것]);
  });
});

describe('버전 기록의 바뀐 것', () => {
  const 앞 = [항목('MKT-REQ-001', '가'), 항목('MKT-REQ-002', '가'), 항목('MKT-REQ-003', '가', { status: 'NEEDS_CHECK' }), 항목('MKT-REQ-004', '가')];

  it('바뀜 · 새 항목 · 상태만 · 지움을 가른다 — 같은 것은 안 센다', () => {
    const 뒤 = [
      항목('MKT-REQ-001', '가', { text: '고친 문장' }),
      항목('MKT-REQ-002', '가'),
      항목('MKT-REQ-003', '가'),
      항목('MKT-REQ-005', '나'),
    ];
    expect(판차이(앞, 뒤).map((x) => [x.kind, x.reqId])).toEqual([
      ['changed', 'MKT-REQ-001'],
      ['state', 'MKT-REQ-003'],
      ['added', 'MKT-REQ-005'],
      ['removed', 'MKT-REQ-004'],
    ]);
  });

  it('근거만 달라져도 바뀜이다', () => {
    const 뒤 = [항목('MKT-REQ-001', '가', { basis: [{ from: '화면', quote: '다른 원문' }] })];
    expect(판차이([앞[0]!], 뒤).map((x) => x.kind)).toEqual(['changed']);
  });

  it('똑같으면 차이가 없다', () => {
    expect(판차이(앞, 앞)).toEqual([]);
  });
});

describe('직접 쓴 요구의 근거', () => {
  it('자료 이름은 고정 글자고 원본 문장은 요구 문장이다', () => {
    expect(직접근거('아이디는 4자 이상')).toEqual([{ from: '직접 작성', quote: '아이디는 4자 이상' }]);
  });

  it('원본 문장 상한을 넘기지 않아 서버가 길이로 거절하지 않는다', () => {
    const 근거 = 직접근거('가'.repeat(1000));
    expect(고치기검사({ feature: '가', text: '가'.repeat(1000), basis: 근거, status: 'CONFIRMED' })).toBeNull();
  });
});

describe('화면 기록의 로그인 상태', () => {
  it('「로그인:역할」에서 역할만 뽑고 그 밖의 상태는 null', () => {
    expect(로그인역할('로그인:일반 회원')).toBe('일반 회원');
    expect(로그인역할('로그아웃')).toBeNull();
  });
});

describe('고치기 칸 검사', () => {
  const 바른것 = { feature: '회원가입', text: '아이디는 4~12자다', basis: [{ from: '화면', ref: '/signup', quote: '4~12자' }], status: 'CONFIRMED' as const };

  it('다 찼으면 통과', () => {
    expect(고치기검사(바른것)).toBeNull();
  });

  it('공백만인 칸 · 빈 근거를 칸 이름으로 짚는다', () => {
    expect(고치기검사({ ...바른것, feature: '  ' })).toBe('feature');
    expect(고치기검사({ ...바른것, text: '' })).toBe('text');
    expect(고치기검사({ ...바른것, basis: [] })).toBe('basis');
    expect(고치기검사({ ...바른것, basis: [{ from: '', quote: '글' }] })).toBe('from');
    expect(고치기검사({ ...바른것, basis: [{ from: '화면', quote: ' ' }] })).toBe('quote');
  });

  it('서버 상한을 넘으면 long', () => {
    expect(고치기검사({ ...바른것, text: '가'.repeat(1001) })).toBe('long');
    expect(고치기검사({ ...바른것, basis: Array.from({ length: 11 }, () => 바른것.basis[0]!) })).toBe('long');
  });
});
