// PRD 채점 검사 — 정답지 대비 포착률 · 지어낸 번호 · 비정형 대응 · 오류 추정 줄 빼기
import type { PrdItem } from '@platform/kit/types';
import { describe, expect, it } from 'vitest';

import { 번호표읽기 } from './authoring-consistency.js';
import { 대응읽기, 정답읽기, 채점줄, 채점하기 } from './eval-prd-score.js';

const 기획서 = [
  '# 데모마켓',
  '| 번호 | 요구 | 구분 |',
  '|---|---|---|',
  '| REQ-MEM-001 | 아이디는 4~12자 | 필수 |',
  '| REQ-MEM-002 | 닉네임은 2~10자 | 필수 |',
  '| REQ-MEM-003 | 프로필 사진은 선택 | 선택 |',
  '본문에 REQ-MEM-009 를 적어도 요구 줄이 아니다',
].join('\n');
const 정답 = 정답읽기(기획서);

const 항목 = (reqId: string, basis: PrdItem['basis'], status: PrdItem['status'] = 'CONFIRMED'): PrdItem => ({
  reqId,
  feature: '회원가입',
  text: '규칙',
  basis,
  status,
});

describe('정답지 읽기', () => {
  it('`| REQ-` 로 시작하는 줄만 세고 「필수 |」로 끝나는 줄이 필수다 — 측정표 grep 과 같다', () => {
    expect([...정답.전체]).toEqual(['REQ-MEM-001', 'REQ-MEM-002', 'REQ-MEM-003']);
    expect([...정답.필수]).toEqual(['REQ-MEM-001', 'REQ-MEM-002']);
  });

  it('줄 끝 빈칸이 있어도 같게 세고, 「비필수」 칸은 필수가 아니다', () => {
    const 다시 = 정답읽기('| REQ-A-001 | a | 필수 |   \n|REQ-A-002| b |비필수|');
    expect([...다시.전체]).toEqual(['REQ-A-001', 'REQ-A-002']);
    expect([...다시.필수]).toEqual(['REQ-A-001']);
  });
});

describe('정형 기획서 — 근거의 원본 번호', () => {
  const 채점 = 채점하기(
    [
      항목('MKT-REQ-001', [{ from: '기획서.docx', ref: 'REQ-MEM-001', quote: '아이디는 4~12자' }]),
      항목('MKT-REQ-002', [{ from: '화면', ref: '/signup', quote: '닉네임을 입력하세요' }], 'NEEDS_CHECK'),
      항목('MKT-REQ-003', [{ from: '기획서.docx', ref: 'REQ-MEM-099', quote: '없는 요구' }]),
      항목('MKT-REQ-004', [{ from: '피그마', ref: 'MKT-HOME-01', quote: '홈 화면' }]),
    ],
    정답,
  );

  it('정답지에 있는 번호만 포착이고 번호표에 실린다', () => {
    expect([...채점.prd포착]).toEqual(['REQ-MEM-001']);
    expect(Object.fromEntries(채점.번호표)).toEqual({ 'MKT-REQ-001': ['REQ-MEM-001'] });
  });

  it('정답지에 없는 REQ- 번호는 지어낸 번호다 — 피그마 화면 번호 같은 다른 체계는 아니다', () => {
    expect(채점.지어낸번호).toEqual(['REQ-MEM-099']);
  });

  it('화면 근거 · 지어낸 번호 · 다른 체계만 있는 항목은 원본에 안 닿는다', () => {
    expect(채점.안닿는항목).toEqual(['MKT-REQ-002', 'MKT-REQ-003', 'MKT-REQ-004']);
  });

  it('숫자 줄 — 확인 필요 비율과 필수 포착, 놓친 요구에 필수 표시', () => {
    const [첫줄, 놓침] = 채점줄(채점, 정답);
    expect(첫줄).toBe(
      'PRD 항목 4 · 확인 필요 1(25.0%) | PRD 포착 1/3(33.3%) · 필수 1/2 | 지어낸 원본 번호 1 | 원본에 안 닿는 항목 3 | 정답 셋 이상에 닿는 항목 0',
    );
    expect(놓침).toBe('PRD 가 놓친 요구: REQ-MEM-002(필수) REQ-MEM-003');
  });
});

describe('비정형 기획서 — 숨은 대응표', () => {
  const 대응 = 대응읽기(
    [
      '## 대응',
      '',
      '| 문장 | REQ |',
      '|---|---|',
      '| 닉네임은 두 글자부터 열 글자까지 쓸 수 있어요. | REQ-MEM-002 |',
      '| 아이디와 닉네임은 가입 화면에서 정해요. | REQ-MEM-001, REQ-MEM-002 |',
      '| 이 문서는 초안입니다. | - |',
    ].join('\n'),
  );

  it('빈칸 · 문장부호가 달라도 근거 원문이 대응 문장에 들어 있으면 그 번호다', () => {
    const 채점 = 채점하기([항목('MKU-REQ-020', [{ from: '기획서.docx', quote: '닉네임은 두 글자부터 열 글자까지' }])], 정답, 대응);
    expect(Object.fromEntries(채점.번호표)).toEqual({ 'MKU-REQ-020': ['REQ-MEM-002'] });
  });

  it('대응 문장이 근거 원문 안에 들어 있어도 맞는다 — 근거가 문단을 통째로 옮긴 경우', () => {
    const 채점 = 채점하기([항목('MKU-REQ-001', [{ from: '메모', quote: '참고: 아이디와 닉네임은 가입 화면에서 정해요. 끝.' }])], 정답, 대응);
    expect(채점.번호표.get('MKU-REQ-001')).toEqual(['REQ-MEM-001', 'REQ-MEM-002']);
  });

  it('여덟 글자보다 짧은 조각은 아무 문장에나 들어가므로 맞추지 않는다', () => {
    const 채점 = 채점하기([항목('MKU-REQ-002', [{ from: '메모', quote: '닉네임은' }])], 정답, 대응);
    expect(채점.안닿는항목).toEqual(['MKU-REQ-002']);
  });

  it('REQ 칸이 비면(「-」) 군더더기 문장이라 번호가 없다', () => {
    expect(대응.at(-1)).toEqual({ 문장: '이 문서는 초안입니다.', 번호들: [] });
  });

  it('여덟 글자보다 짧은 대응 문장도 근거 원문 안에 있으면 맞는다', () => {
    const 짧은대응 = [{ 문장: '탈퇴는 불가해요.', 번호들: ['REQ-MEM-003'] }];
    const 채점 = 채점하기([항목('MKU-REQ-003', [{ from: '메모', quote: 'FAQ: 탈퇴는 불가해요. 문의는 고객센터' }])], 정답, 짧은대응);
    expect(채점.번호표.get('MKU-REQ-003')).toEqual(['REQ-MEM-003']);
  });

  it('근거 하나가 문단을 옮겨 정답 번호 셋 이상에 닿으면 따로 센다 — 포착률이 부풀었을 수 있다', () => {
    const 문단 = [
      { 문장: '아이디는 네 글자부터예요.', 번호들: ['REQ-MEM-001'] },
      { 문장: '닉네임은 두 글자부터예요.', 번호들: ['REQ-MEM-002'] },
      { 문장: '프로필 사진은 안 넣어도 돼요.', 번호들: ['REQ-MEM-003'] },
    ];
    const 채점 = 채점하기([항목('MKU-REQ-009', [{ from: '기획서', quote: 문단.map((x) => x.문장).join(' ') }])], 정답, 문단);
    expect(채점.넓은항목).toEqual(['MKU-REQ-009']);
    expect(채점줄(채점, 정답)[0]).toContain('| 정답 셋 이상에 닿는 항목 1');
  });
});

describe('케이스 포착 — 요구사항 표 출처 칸', () => {
  const 표 = [
    '## 요구사항',
    '',
    '| 요구 | 축 | 출처 | tcId |',
    '|---|---|---|---|',
    '| 1 | 정상 | MKT-REQ-001 | MKT-FN-001 |',
    '| 2 | 예외 | MKT-REQ-005 · 오류 추정 — 빈 값 | MKT-FN-002 |',
    '| 3 | 정상 | REQ-MEM-003 | MKT-FN-003 |',
  ].join('\n');
  const 채점 = 채점하기(
    [
      항목('MKT-REQ-001', [{ from: '기획서', ref: 'REQ-MEM-001', quote: 'a' }]),
      항목('MKT-REQ-005', [{ from: '기획서', ref: 'REQ-MEM-002', quote: 'b' }]),
    ],
    정답,
    [],
    표,
  );

  it('PRD 번호는 번호표로 바꾸고, 옛 표의 원본 번호는 그대로 센다', () => {
    expect([...(채점.케이스포착 ?? [])].sort()).toEqual(['REQ-MEM-001', 'REQ-MEM-003']);
  });

  it('버튼 반응 줄은 첫 번호(화면을 잡는 요구)만 빼고 뒤 번호는 센다', () => {
    const 버튼표 = ['## 요구사항', '', '| 요구 | 축 | 출처 | tcId |', '|---|---|---|---|', '| 1 | UI | MKT-REQ-001 · MKT-REQ-005 · 버튼 반응 — 가입 | MKT-UI-004 |'].join('\n');
    const r = 채점하기(
      [
        항목('MKT-REQ-001', [{ from: '기획서', ref: 'REQ-MEM-001', quote: 'a' }]),
        항목('MKT-REQ-005', [{ from: '기획서', ref: 'REQ-MEM-002', quote: 'b' }]),
      ],
      정답,
      [],
      버튼표,
    );
    expect([...(r.케이스포착 ?? [])]).toEqual(['REQ-MEM-002']);
  });

  it('오류 추정 줄만 덮은 요구는 케이스 포착이 아니다 — PRD 포착에는 남는다', () => {
    expect(채점.케이스포착?.has('REQ-MEM-002')).toBe(false);
    expect(채점.prd포착.has('REQ-MEM-002')).toBe(true);
    expect(채점줄(채점, 정답)[2]).toBe('케이스가 놓친 요구: REQ-MEM-002(필수)');
  });
});

describe('번호표 읽기', () => {
  it('PRD 번호 → 글자 배열 꼴만 받고, 빈 표는 거절한다 — 칸 겹침이 조용히 「없음」이 되지 않게', () => {
    expect(번호표읽기('{"MKT-REQ-001":["REQ-MEM-001"]}').get('MKT-REQ-001')).toEqual(['REQ-MEM-001']);
    expect(() => 번호표읽기('[]')).toThrow('꼴이어야 한다');
    expect(() => 번호표읽기('{"MKT-REQ-001":"REQ-MEM-001"}')).toThrow('글자 배열이 아니다');
    expect(() => 번호표읽기('{}')).toThrow('번호표가 비었다');
  });
});
