// 표준 기획서 옮기기 검사 — 결과 파일 읽기 · 판 합치기 · 원본 대조 · PR 머리 줄
import { describe, expect, it } from 'vitest';

import type { PrdItem } from '@platform/kit/types';

import { 설계하기 } from './authoring-design.js';
import { type 옮긴것, 대조줄들, 옮긴것읽기, 옮기기대조, 판줄들, 판합치기 } from './authoring-prd.js';

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

  it('번호 없는 새 항목이 기존 요구 문장과 같으면 그 번호를 물려받는다', () => {
    const r = 판합치기(지금, 옮김([항목(' 아이디는 4자 이상 ', ['REQ-MEM-001']), 항목('아이디는 4자 이상', ['REQ-MEM-001'])]));
    expect(r.items.map((i) => i.reqId)).toEqual(['MKT-REQ-001', 'MKT-REQ-002', 'MKT-REQ-003', undefined]);
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
