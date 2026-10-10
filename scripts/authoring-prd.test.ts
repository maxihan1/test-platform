// 표준 기획서 옮기기 검사 — 결과 파일 읽기 · 판 합치기 · 원본 대조 · PR 머리 줄
import { describe, expect, it } from 'vitest';

import type { PrdItem } from '@platform/kit/types';

import { 설계하기 } from './authoring-design.js';
import { type 옮긴것, 대조줄들, 보낼항목, 새번호맞추기, 옮긴것읽기, 옮기기대조, 판줄들, 판합치기, 표준원장 } from './authoring-prd.js';

const 근거 = (ref: string, quote = '원문') => ({ from: '기획서.docx', ref, quote });
const 항목 = (text: string, refs: string[], 더: Partial<PrdItem> = {}) => ({
  feature: '회원가입',
  text,
  basis: refs.map((r) => 근거(r)),
  status: 'CONFIRMED' as const,
  ...더,
});
const 있던 = (no: number, text: string, 더: Partial<PrdItem> = {}): PrdItem => ({
  reqId: `MKT-REQ-${String(no).padStart(3, '0')}`,
  ...항목(text, ['REQ-MEM-001']),
  ...더,
});
const 옮김 = (items: 옮긴것['items'], 더: Partial<옮긴것> = {}): 옮긴것 => ({ items, removed: [], notRequirements: [], 버림: [], ...더 });

describe('옮긴것읽기', () => {
  it('items 목록이 없으면 사유를 돌려준다', () => {
    expect(옮긴것읽기({ removed: [] }, 'MKT')).toEqual({ 사유: 'items 목록이 없다' });
    expect(옮긴것읽기([], 'MKT')).toEqual({ 사유: 'items 목록이 없다' });
  });

  it('근거가 화면뿐인 항목은 확정으로 적어도 확인 필요가 된다', () => {
    const r = 옮긴것읽기(
      {
        items: [
          { ...항목('닉네임은 2자 이상', []), basis: [{ from: '화면', ref: 'https://a.test/join', quote: '2자 이상 입력' }] },
          { ...항목('이메일은 필수', ['REQ-MEM-003']), basis: [근거('REQ-MEM-003'), { from: '화면', quote: '필수' }] },
        ],
      },
      'MKT',
    );
    expect('items' in r && r.items.map((i) => i.status)).toEqual(['NEEDS_CHECK', 'CONFIRMED']);
  });

  it('모양 · 상한을 어긴 항목과 겹친 번호는 그 항목만 버리고 자리를 남긴다', () => {
    const r = 옮긴것읽기(
      {
        items: [
          항목('정상', ['REQ-MEM-001'], { reqId: 'MKT-REQ-001' }),
          항목('x'.repeat(1001), ['REQ-MEM-002']),
          항목('겹침', ['REQ-MEM-003'], { reqId: 'MKT-REQ-001' }),
          { ...항목('근거 없음', []), basis: [] },
          항목('남의 접두사', ['REQ-MEM-004'], { reqId: 'CDY-REQ-001' }),
        ],
      },
      'MKT',
    );
    expect('items' in r && r.items.map((i) => i.text)).toEqual(['정상']);
    expect('items' in r && r.버림).toEqual(['1.text', '2.reqId', '3.basis', '4.reqId']);
  });

  it('지울 번호 · 요구 아님은 틀린 줄만 버리고 까닭이 없으면 채운다', () => {
    const r = 옮긴것읽기({ items: [], removed: ['MKT-REQ-002', 3, ''], notRequirements: [{ ref: 'SCR-001', reason: '화면 ID' }, { ref: 'ERR-1' }, 'x'] }, 'MKT');
    expect(r).toEqual({
      items: [],
      removed: ['MKT-REQ-002'],
      notRequirements: [{ ref: 'SCR-001', reason: '화면 ID' }, { ref: 'ERR-1', reason: '까닭 없음' }],
      버림: [],
    });
  });
});

describe('판합치기', () => {
  const 지금 = [있던(1, '아이디는 4자 이상'), 있던(2, '장바구니는 20개까지', { feature: '장바구니', byPerson: true }), 있던(3, '탈퇴는 확인을 한 번 더 묻는다')];

  it('적지 않은 기존 항목은 남기고 고친 번호는 제자리에, 새 항목은 끝에 둔다', () => {
    const r = 판합치기(지금, 옮김([항목('아이디는 4자 이상 12자 이하', ['REQ-MEM-001'], { reqId: 'MKT-REQ-001' }), 항목('닉네임은 필수', ['REQ-MEM-009'])]));
    expect(r.items.map((i) => [i.reqId, i.text])).toEqual([
      ['MKT-REQ-001', '아이디는 4자 이상 12자 이하'],
      ['MKT-REQ-002', '장바구니는 20개까지'],
      ['MKT-REQ-003', '탈퇴는 확인을 한 번 더 묻는다'],
      [undefined, '닉네임은 필수'],
    ]);
    expect(r.지운번호).toEqual([]);
  });

  it('지운다고 적은 번호만 빠지고 같은 번호를 고친 항목이 있으면 고친 것이 이긴다', () => {
    const r = 판합치기(지금, 옮김([항목('탈퇴는 비밀번호를 다시 묻는다', ['REQ-MEM-010'], { reqId: 'MKT-REQ-003' })], { removed: ['MKT-REQ-001', 'MKT-REQ-003', 'MKT-REQ-777'] }));
    expect(r.items.map((i) => i.reqId)).toEqual(['MKT-REQ-002', 'MKT-REQ-003']);
    expect(r.지운번호).toEqual(['MKT-REQ-001']);
  });

  it('번호 없는 새 항목이 기존 항목과 기능 묶음 · 요구 문장이 같으면 그 번호를 물려받는다', () => {
    const r = 판합치기(지금, 옮김([항목(' 아이디는 4자 이상 ', ['REQ-MEM-001']), 항목('아이디는 4자 이상', ['REQ-MEM-001'])]));
    expect(r.items.map((i) => i.reqId)).toEqual(['MKT-REQ-001', 'MKT-REQ-002', 'MKT-REQ-003', undefined]);
  });

  it('요구 문장이 같아도 기능 묶음이 다르면 물려받지 않는다', () => {
    const r = 판합치기(지금, 옮김([항목('장바구니는 20개까지', ['REQ-MEM-012'])]));
    expect(r.items.map((i) => [i.reqId, i.feature])).toEqual([
      ['MKT-REQ-001', '회원가입'],
      ['MKT-REQ-002', '장바구니'],
      ['MKT-REQ-003', '회원가입'],
      [undefined, '회원가입'],
    ]);
  });

  it('번호를 고친 기존 항목의 옛 문장은 새 항목이 물려받지 않는다', () => {
    const r = 판합치기(지금, 옮김([항목('아이디는 6자 이상', ['REQ-MEM-001'], { reqId: 'MKT-REQ-001' }), 항목('아이디는 4자 이상', ['REQ-MEM-001'])]));
    expect(r.items.map((i) => [i.reqId, i.text]).at(-1)).toEqual([undefined, '아이디는 4자 이상']);
  });

  it('지금 판에 없는 번호는 새 항목으로 돌리고 알린다', () => {
    const r = 판합치기(지금, 옮김([항목('새 규칙', ['REQ-MEM-011'], { reqId: 'MKT-REQ-099' })]));
    expect(r.items.at(-1)).not.toHaveProperty('reqId');
    expect(r.모르는번호).toEqual(['MKT-REQ-099']);
  });

  it('기준 판에만 있던 번호(그 사이 지워짐)는 번호를 단 채 새 항목 앞에 보낸다 — 서버가 되살리지 않는다', () => {
    const r = 판합치기(지금, 옮김([항목('새 규칙', ['REQ-MEM-011']), 항목('지워진 요구', ['REQ-MEM-004'], { reqId: 'MKT-REQ-004' })]), new Set(['MKT-REQ-004']));
    expect(r.items.map((i) => i.reqId)).toEqual(['MKT-REQ-001', 'MKT-REQ-002', 'MKT-REQ-003', 'MKT-REQ-004', undefined]);
    expect(r.모르는번호).toEqual([]);
  });

  it('모르는 번호를 뗀 항목이 문장으로 기존 번호를 찾으면 새 항목으로 세지 않는다', () => {
    const r = 판합치기(지금, 옮김([항목('탈퇴는 확인을 한 번 더 묻는다', ['REQ-MEM-010'], { reqId: 'MKT-REQ-099' })]));
    expect(r.items.map((i) => i.reqId)).toEqual(['MKT-REQ-001', 'MKT-REQ-002', 'MKT-REQ-003']);
    expect(r.모르는번호).toEqual([]);
  });
});

describe('옮기기대조', () => {
  const 원문 = '비밀번호는 영문·숫자 조합 8~16자로 입력하고, 형식에 맞지 않으면 안내 문구를 보여 준다';
  const 원장 = [{ 번호: 'REQ-MEM-002', 설계: 설계하기(원문) }, { 번호: 'REQ-MEM-003' }, { 번호: 'SCR-001' }];

  it('쪼갠 항목들의 설계 합이 원본 설계를 덮으면 잃은 것이 없다', () => {
    const r = 옮기기대조(
      원장,
      옮김(
        [
          항목('비밀번호는 8자 이상이다', ['REQ-MEM-002']),
          항목('비밀번호는 16자 이하다', ['REQ-MEM-002']),
          항목('비밀번호 형식에 맞지 않으면 안내 문구를 보여 준다', ['REQ-MEM-002']),
          항목('이메일은 필수다', ['REQ-MEM-003']),
        ],
        { notRequirements: [{ ref: 'SCR-001', reason: '화면 ID' }] },
      ),
    );
    expect(r).toEqual({ 요구수: 3, 빠짐: [], 요구아님: ['SCR-001(화면 ID)'], 설계잃음: [] });
  });

  it('쪼개다 숫자와 조건을 잃으면 그 번호의 경계 · 예외가 잃음으로 나온다', () => {
    const r = 옮기기대조(원장, 옮김([항목('비밀번호는 8자 이상이다', ['REQ-MEM-002'])]));
    expect(r.설계잃음).toEqual(['REQ-MEM-002 경계 「8~16자」', 'REQ-MEM-002 예외 동등 분할 「형식에 맞지」']);
    expect(r.빠짐).toEqual(['REQ-MEM-003', 'SCR-001']);
  });

  it('덮은 번호를 요구 아님으로도 적었으면 덮은 것으로 센다', () => {
    const r = 옮기기대조([{ 번호: 'REQ-MEM-003' }], 옮김([항목('이메일은 필수다', ['REQ-MEM-003'])], { notRequirements: [{ ref: 'REQ-MEM-003', reason: 'x' }] }));
    expect(r.요구아님).toEqual([]);
  });
});

describe('머리 줄', () => {
  it('대조 줄 — 요약을 늘 싣고 빠짐 · 잃음은 경고로, 원장이 없으면 건너뛴 까닭', () => {
    expect(대조줄들({ 요구수: 2, 빠짐: ['REQ-1'], 요구아님: ['SCR-1(화면 ID)'], 설계잃음: [] })).toEqual([
      '옮기기 대조: 요구 2 중 빠짐 1 · 요구 아님 1 · 설계 잃음 0',
      '⚠️ 옮기기 빠짐 1 — REQ-1',
      '요구 아님 1 — SCR-1(화면 ID)',
    ]);
    expect(대조줄들({ 없음: '글자본이 있는 자료가 없다' })).toEqual(['⚠️ 옮기기 대조 없음 — 글자본이 있는 자료가 없다']);
  });

  it('판 줄 — 확인 필요 수와 사람이 고친 번호 · 모르는 번호 · 버린 항목', () => {
    const 옮긴 = 옮김([항목('a', []), { ...항목('b', []), status: 'NEEDS_CHECK' }], { 버림: ['3.text'] });
    expect(판줄들(4, 옮긴, { 지운번호: ['MKT-REQ-001'], 모르는번호: [] }, ['MKT-REQ-002'])).toEqual([
      '표준 기획서: 판 4 · 이번 자료 항목 2(확인 필요 1) · 지움 1',
      '⚠️ 사람이 고친 항목과 새 문서가 다름 1 — MKT-REQ-002',
      '⚠️ 표준 기획서 항목을 버림 1 — 3.text',
    ]);
  });
});

describe('임시 번호 — 새 항목은 자식이 표에 적을 자리 번호를 단다 (§3.6 「작성은 표준 기획서만 읽는다」)', () => {
  it('임시 번호는 서버 번호 꼴이 아니어도 읽고, 없는 새 항목에는 이어서 매긴다 · 겹치면 버린다', () => {
    const r = 옮긴것읽기(
      {
        items: [
          항목('닉네임은 2자 이상', ['REQ-MEM-009'], { reqId: 'MKT-NEW-004' }),
          항목('번호 없는 새 항목', ['REQ-MEM-010']),
          항목('겹친 임시', ['REQ-MEM-011'], { reqId: 'MKT-NEW-004' }),
          항목('남의 임시', ['REQ-MEM-012'], { reqId: 'CDY-NEW-001' }),
        ],
      },
      'MKT',
    );
    expect('items' in r && r.items.map((i) => [i.reqId, i.임시])).toEqual([[undefined, 'MKT-NEW-004'], [undefined, 'MKT-NEW-005']]);
    expect('items' in r && r.버림).toEqual(['2.reqId', '3.reqId']);
    expect('items' in r && r.자동).toEqual([[1, 'MKT-NEW-005']]);
  });

  it('판합치기 — 지금 판에 없는 번호는 떼고 새 임시 번호를 단다(뗀 번호를 쓰면 main 표의 옛 줄까지 바뀐다) · 문장이 같은 기존 항목은 번호를 물려받으며 임시 번호를 들고 간다', () => {
    const 지금 = [있던(1, '아이디는 4자 이상')];
    const r = 판합치기(지금, 옮김([{ ...항목('아이디는 4자 이상', ['REQ-MEM-001']), 임시: 'MKT-NEW-001' }, 항목('새 규칙', ['REQ-MEM-011'], { reqId: 'MKT-REQ-099' })]));
    expect(r.items.map((i) => [i.reqId, i.임시])).toEqual([['MKT-REQ-001', 'MKT-NEW-001'], [undefined, 'MKT-NEW-002']]);
    expect(r.모르는번호).toEqual(['MKT-REQ-099']);
  });

  it('보낼항목은 임시 번호를 뗀다', () => {
    expect(보낼항목([{ ...항목('a', []), 임시: 'MKT-NEW-001' }])[0]).not.toHaveProperty('임시');
  });
});

describe('표준원장 — 작성의 원장은 표준 기획서 항목이다', () => {
  it('번호 · 요구 문장 · 확인 필요 · 요구 문장으로 판정한 설계를 싣고 가족을 센다', () => {
    const r = 표준원장([있던(1, '비밀번호는 8~16자로 입력한다'), { ...항목('이메일 형식이 아니면 안내한다', [], { status: 'NEEDS_CHECK' }), 임시: 'MKT-NEW-001' }]);
    expect('항목' in r && r.항목.map((h) => [h.번호, h.문장, h.확인필요])).toEqual([
      ['MKT-REQ-001', '비밀번호는 8~16자로 입력한다', undefined],
      ['MKT-NEW-001', '이메일 형식이 아니면 안내한다', true],
    ]);
    expect('항목' in r && r.항목[0]?.설계?.경계.map((b) => b.값)).toEqual([['7자', '8자', '16자', '17자']]);
    expect('항목' in r && r.가족).toEqual({ 'MKT-REQ': 1, 'MKT-NEW': 1 });
    expect(표준원장([])).toEqual({ 없음: '표준 기획서에 항목이 없다' });
  });
});

describe('새번호맞추기 — 올린 뒤 임시 번호를 서버가 준 번호로', () => {
  const 보낸 = [{ ...있던(1, '아이디는 4자 이상'), 임시: 'MKT-NEW-001' }, { ...항목('새 규칙 A', []), 임시: 'MKT-NEW-002' }, { ...항목('새 규칙 B', []), 임시: 'MKT-NEW-003' }];

  it('보낸 번호 · 사람이 남긴 항목을 뺀 새 번호를 보낸 차례대로 짝짓는다', () => {
    const 저장 = [있던(1, '아이디는 4자 이상'), 있던(2, '사람이 더함', { byPerson: true }), 있던(8, '새 규칙 A'), 있던(9, '새 규칙 B')];
    expect(새번호맞추기(보낸, 저장)).toEqual(new Map([['MKT-NEW-001', 'MKT-REQ-001'], ['MKT-NEW-002', 'MKT-REQ-008'], ['MKT-NEW-003', 'MKT-REQ-009']]));
  });

  it('문장으로 짝짓는다 — 그 사이 다른 저장이 끼어도 그 항목이 남아 있으면 찾고, 없으면 사유', () => {
    const 끼인 = [있던(1, '아이디는 4자 이상'), 있던(8, '새 규칙 B'), 있던(9, '남이 올린 것'), 있던(10, '새 규칙 A')];
    expect(새번호맞추기(보낸, 끼인)).toEqual(new Map([['MKT-NEW-001', 'MKT-REQ-001'], ['MKT-NEW-002', 'MKT-REQ-010'], ['MKT-NEW-003', 'MKT-REQ-008']]));
    expect(새번호맞추기(보낸, [있던(1, '아이디는 4자 이상'), 있던(8, '새 규칙 A')])).toEqual({ 사유: '새 항목 「새 규칙 B」 을 올린 판에서 못 찾았다' });
  });
});
