// 케이스 목록 맥락 — 기능 묶음 · 요구 · 화면을 붙이고 접는 차례를 짓는지 본다 (도메인/카탈로그 §8.1 「맥락」)

import { describe, expect, it } from 'vitest';

import { 맥락, 맥락거르기, 맥락조건읽기, 맥락짓기, 요구로찾기, 줄세우기, 프로시저표짓기, type 맥락재료 } from './context.js';

const 판: 맥락재료['prd'] = [
  { reqId: 'XCL-REQ-001', feature: '회원가입', text: '이메일은 한 번만 쓴다' },
  { reqId: 'XCL-REQ-002', feature: '로그인', text: '비밀번호를 다섯 번 틀리면 잠근다' },
  { reqId: 'XCL-REQ-003', feature: '회원가입', text: '비밀번호는 8자 이상 20자 이하' },
];
const 화면 = (이름: string) => `tests/xcl/pages/${이름}.page.ts`;
const 조각 = (이름: string) => `tests/xcl/components/${이름}.component.ts`;

const 표 = 맥락짓기({
  prd: 판,
  reqs: [
    { reqId: 'XCL-REQ-003', tcId: 'XCL-FN-001', axis: '경계' },
    { reqId: 'XCL-REQ-002', tcId: 'XCL-FN-001', axis: '정상' },
    { reqId: 'XCL-REQ-002', tcId: 'XCL-FN-002', axis: '정상' },
    { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-003', axis: '예외' },
    { reqId: 'REQ-COM-006', tcId: 'XCL-FN-004', axis: '예외' },
    { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-005', axis: '정상' },
  ],
  screens: [
    { tcId: 'XCL-FN-003', file: 조각('terms'), url: null, name: '약관동의' },
    { tcId: 'XCL-FN-003', file: 화면('signup'), url: '/signup', name: '회원가입화면' },
    { tcId: 'XCL-FN-005', file: 화면('signup'), url: '/signup', name: '회원가입화면' },
    { tcId: 'XCL-FN-001', file: 화면('signup'), url: '/signup', name: '회원가입화면' },
    { tcId: 'XCL-FN-001', file: 화면('login'), url: '/login', name: '로그인화면' },
    { tcId: 'XCL-FN-006', file: 화면('orders'), url: null, name: null },
  ],
});

describe('맥락짓기', () => {
  it('기능 묶음은 판 차례가 가장 앞인 요구의 것 · 요구는 판 차례로 · 판에 없는 번호는 글 없이 뒤에', () => {
    expect(맥락(표, 'XCL-FN-001')).toMatchObject({
      feature: '로그인',
      reqs: [
        { reqId: 'XCL-REQ-002', text: '비밀번호를 다섯 번 틀리면 잠근다', axis: '정상' },
        { reqId: 'XCL-REQ-003', text: '비밀번호는 8자 이상 20자 이하', axis: '경계' },
      ],
    });
    expect(맥락(표, 'XCL-FN-004')).toEqual({ feature: null, reqs: [{ reqId: 'REQ-COM-006', text: null, axis: '예외' }], screens: [], apiServers: [], endpoints: [] });
  });

  it('화면은 파일 이름 차례로 다 싣고 · 지도에 없는 케이스는 빈 맥락이다', () => {
    expect(맥락(표, 'XCL-FN-001').screens).toEqual([
      { file: 화면('login'), url: '/login', name: '로그인화면' },
      { file: 화면('signup'), url: '/signup', name: '회원가입화면' },
    ]);
    expect(맥락(표, 'XCL-FN-099')).toEqual({ feature: null, reqs: [], screens: [], apiServers: [], endpoints: [] });
  });
});

describe('줄세우기', () => {
  const 전부 = ['XCL-FN-006', 'XCL-FN-005', 'XCL-FN-004', 'XCL-FN-003', 'XCL-FN-002', 'XCL-FN-001', 'XCL-FN-099'];

  it('기능 묶음은 판에 처음 나온 차례 · 묶음 안은 화면 없는 것 먼저 → 화면 → 화면 조각 → 번호 · 묶음 없음은 맨 뒤', () => {
    expect(줄세우기(전부, 표).차례).toEqual([
      'XCL-FN-005', 'XCL-FN-003', 'XCL-FN-002', 'XCL-FN-001', 'XCL-FN-004', 'XCL-FN-099', 'XCL-FN-006',
    ]);
  });

  it('같은 자리끼리 한 묶음 — 여러 화면이면 파일 이름이 앞선 화면에 · 쪽이 아니라 받은 전부를 묶는다', () => {
    expect(줄세우기(전부, 표).groups).toEqual([
      { feature: '회원가입', screen: 화면('signup'), screenUrl: '/signup', screenName: '회원가입화면', part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-005'] },
      { feature: '회원가입', screen: 화면('signup'), screenUrl: '/signup', screenName: '회원가입화면', part: 조각('terms'), partName: '약관동의', endpoint: null, tcIds: ['XCL-FN-003'] },
      { feature: '로그인', screen: null, screenUrl: null, screenName: null, part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-002'] },
      { feature: '로그인', screen: 화면('login'), screenUrl: '/login', screenName: '로그인화면', part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-001'] },
      { feature: null, screen: null, screenUrl: null, screenName: null, part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-004', 'XCL-FN-099'] },
      { feature: null, screen: 화면('orders'), screenUrl: null, screenName: null, part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-006'] },
    ]);
  });

  it('화면은 주소 차례다 — 파일 이름 차례면 /signup/done 이 /signup 앞에 선다', () => {
    const 둘 = 맥락짓기({
      prd: 판,
      reqs: [
        { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-010', axis: '정상' },
        { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-011', axis: '정상' },
      ],
      screens: [
        { tcId: 'XCL-FN-010', file: 화면('signup-done'), url: '/signup/done', name: null },
        { tcId: 'XCL-FN-011', file: 화면('signup'), url: '/signup', name: null },
      ],
    });
    expect(줄세우기(['XCL-FN-010', 'XCL-FN-011'], 둘).차례).toEqual(['XCL-FN-011', 'XCL-FN-010']);
  });
});

describe('줄세우기 — 프로시저', () => {
  // 101 은 회원가입 묶음 · signup 화면, 102 는 로그인 묶음 · login 화면, 103 은 묶음 없음 — 번호 차례로는 흩어진다
  const 프로시저표 = 맥락짓기({
    prd: 판,
    reqs: [
      { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-101', axis: '정상' },
      { reqId: 'XCL-REQ-002', tcId: 'XCL-FN-102', axis: '정상' },
      { reqId: 'XCL-REQ-001', tcId: 'XCL-FN-201', axis: '정상' },
      { reqId: 'XCL-REQ-002', tcId: 'XCL-FN-301', axis: '정상' },
    ],
    screens: [
      { tcId: 'XCL-FN-101', file: 화면('signup'), url: '/signup', name: '회원가입화면' },
      { tcId: 'XCL-FN-102', file: 화면('login'), url: '/login', name: '로그인화면' },
      { tcId: 'XCL-FN-201', file: 화면('signup'), url: '/signup', name: '회원가입화면' },
      { tcId: 'XCL-FN-301', file: 화면('login'), url: '/login', name: '로그인화면' },
    ],
  });
  const 프로시저 = 프로시저표짓기([
    { tc_id: 'XCL-FN-103', proc_id: 'XCL-TP-001', proc_seq: 3 },
    { tc_id: 'XCL-FN-102', proc_id: 'XCL-TP-001', proc_seq: 2 },
    { tc_id: 'XCL-FN-101', proc_id: 'XCL-TP-001', proc_seq: 1 },
  ]);
  const 전부 = ['XCL-FN-301', 'XCL-FN-103', 'XCL-FN-201', 'XCL-FN-102', 'XCL-FN-101'];

  it('프로시저 케이스는 머리 케이스 자리에 proc_seq 차례로 붙고 · 옛 꼴 케이스 차례는 그대로다', () => {
    expect(줄세우기(전부, 프로시저표).차례).toEqual(['XCL-FN-101', 'XCL-FN-201', 'XCL-FN-102', 'XCL-FN-301', 'XCL-FN-103']);
    expect(줄세우기(전부, 프로시저표, 프로시저).차례).toEqual(['XCL-FN-101', 'XCL-FN-102', 'XCL-FN-103', 'XCL-FN-201', 'XCL-FN-301']);
  });

  it('groups 의 기능 묶음 · 화면은 머리 케이스 것이다 — 한 프로시저가 한 묶음 아래 통째로 선다', () => {
    expect(줄세우기(전부, 프로시저표, 프로시저).groups).toEqual([
      { feature: '회원가입', screen: 화면('signup'), screenUrl: '/signup', screenName: '회원가입화면', part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-101', 'XCL-FN-102', 'XCL-FN-103', 'XCL-FN-201'] },
      { feature: '로그인', screen: 화면('login'), screenUrl: '/login', screenName: '로그인화면', part: null, partName: null, endpoint: null, tcIds: ['XCL-FN-301'] },
    ]);
  });

  it('조건에 걸려 머리 케이스가 목록에서 빠져도 남은 케이스는 머리 자리에 선다', () => {
    expect(줄세우기(['XCL-FN-301', 'XCL-FN-103', 'XCL-FN-201', 'XCL-FN-102'], 프로시저표, 프로시저).차례).toEqual(['XCL-FN-102', 'XCL-FN-103', 'XCL-FN-201', 'XCL-FN-301']);
  });

  it('기능 묶음 · 화면으로 거를 때 프로시저 안 케이스의 묶인 자리는 머리 케이스 것이다 — groups 에 싣는 자리와 같다', () => {
    // 102 는 자기 요구로는 로그인 묶음 · login 화면이지만 프로시저가 회원가입 묶음 자리에 통째로 선다
    expect(맥락거르기(전부, 프로시저표, { feature: '로그인' }, 프로시저)).toEqual(['XCL-FN-301']);
    expect(맥락거르기(전부, 프로시저표, { feature: '회원가입' }, 프로시저)).toEqual(['XCL-FN-103', 'XCL-FN-201', 'XCL-FN-102', 'XCL-FN-101']);
    expect(맥락거르기(전부, 프로시저표, { screen: 화면('login') }, 프로시저)).toEqual(['XCL-FN-301']);
    // 요구 번호는 케이스 자기 것으로 거른다
    expect(맥락거르기(전부, 프로시저표, { req: 'XCL-REQ-002' }, 프로시저)).toEqual(['XCL-FN-301', 'XCL-FN-102']);
  });

  it('차례가 같은 케이스가 둘이면 번호가 앞선 것이 머리다 — 받은 줄 차례와 상관없다', () => {
    const 줄 = [
      { tc_id: 'XCL-FN-102', proc_id: 'XCL-TP-001', proc_seq: 1 },
      { tc_id: 'XCL-FN-101', proc_id: 'XCL-TP-001', proc_seq: 1 },
    ];
    expect(프로시저표짓기(줄).get('XCL-FN-102')?.머리).toBe('XCL-FN-101');
    expect(프로시저표짓기([...줄].reverse()).get('XCL-FN-102')?.머리).toBe('XCL-FN-101');
  });
});

describe('맥락거르기', () => {
  const 전부 = ['XCL-FN-001', 'XCL-FN-002', 'XCL-FN-003', 'XCL-FN-004', 'XCL-FN-005', 'XCL-FN-099'];

  it('기능 묶음 · 화면 · 화면 조각은 묶인 자리 그대로 — 빈 글자는 묶음 없음', () => {
    expect(맥락거르기(전부, 표, { feature: '회원가입' })).toEqual(['XCL-FN-003', 'XCL-FN-005']);
    expect(맥락거르기(전부, 표, { feature: '' })).toEqual(['XCL-FN-004', 'XCL-FN-099']);
    expect(맥락거르기(전부, 표, { feature: '회원가입', screen: 화면('signup'), part: 조각('terms') })).toEqual(['XCL-FN-003']);
    // 001 은 signup 도 쓰지만 login 아래 묶였다 — 「이것만 보기」에 다른 묶음 머리가 섞이지 않는다
    expect(맥락거르기(전부, 표, { screen: 화면('signup') })).toEqual(['XCL-FN-003', 'XCL-FN-005']);
    expect(맥락거르기(전부, 표, { feature: '로그인', screen: '' })).toEqual(['XCL-FN-002']);
  });

  it('종류 · 요구 번호는 그 케이스가 덮는 요구 가운데 하나만 맞아도 걸린다', () => {
    expect(맥락거르기(전부, 표, { axis: '경계' })).toEqual(['XCL-FN-001']);
    expect(맥락거르기(전부, 표, { req: 'XCL-REQ-002' })).toEqual(['XCL-FN-001', 'XCL-FN-002']);
    expect(맥락거르기(전부, 표, {})).toEqual(전부);
  });
});

describe('요구로찾기', () => {
  it('요구 번호 · 요구 문장에 대소문자 없이 맞는 케이스 — 판에 없는 번호도 번호로는 찾는다', () => {
    expect(요구로찾기(표, '비밀번호').sort()).toEqual(['XCL-FN-001', 'XCL-FN-002']);
    expect(요구로찾기(표, 'req-com')).toEqual(['XCL-FN-004']);
  });
});

describe('맥락조건읽기', () => {
  it('feature · screen 은 빈 글자도 조건(없음) · 나머지 빈 값은 안 거르고 · 모르는 종류는 null', () => {
    expect(맥락조건읽기({ feature: '', screen: '', part: '', axis: '', req: '' })).toEqual({ feature: '', screen: '' });
    expect(맥락조건읽기({ feature: '회원가입', axis: '경계', req: 'XCL-REQ-001' })).toEqual({ feature: '회원가입', axis: '경계', req: 'XCL-REQ-001' });
    expect(맥락조건읽기({ axis: '성능' })).toBeNull();
    expect(맥락조건읽기({})).toEqual({});
  });

  it('같은 이름을 두 번 보내면(배열) 마지막 값을 쓴다 — 배열을 견주면 조용히 빈 목록이 된다', () => {
    expect(맥락조건읽기({ feature: ['로그인', '회원가입'], axis: ['정상', '경계'] })).toEqual({ feature: '회원가입', axis: '경계' });
  });
});
