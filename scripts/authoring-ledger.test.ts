// 원장 뽑기 검사 — 기획서 글자본에서 요구 번호를 빠짐없이, 같은 글이면 같게 뽑는지
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import type { 읽을자료 } from './authoring-assets.js';
import { 번호찾기, 원장뽑기, 원장만들기 } from './authoring-ledger.js';

const 데모마켓 = readFileSync(new URL('./fixtures/ledger/demomarket.txt', import.meta.url), 'utf8');

describe('번호찾기 — 추출과 대조가 같이 쓰는 한 함수', () => {
  it('조사 · 괄호 · 표 칸에 붙은 번호를 잡는다', () => {
    expect(번호찾기('REQ-COM-001은 필수다. (REQ-COM-005) │REQ-X-01│').번호들).toEqual([
      'REQ-COM-001',
      'REQ-COM-005',
      'REQ-X-01',
    ]);
  });

  it('긴 번호 속의 짧은 번호를 따로 잡지 않는다', () => {
    expect(번호찾기('REQ-COM-0010 만 있다').번호들).toEqual(['REQ-COM-0010']);
  });

  it('한 자릿수와 점 번호도 번호다', () => {
    expect(번호찾기('REQ-1 과 FR-1.2 와 FR-1.10.').번호들).toEqual(['REQ-1', 'FR-1.2', 'FR-1.10']);
  });

  it('문장 끝 마침표는 번호에 안 붙는다', () => {
    expect(번호찾기('이것은 REQ-COM-003.').번호들).toEqual(['REQ-COM-003']);
  });

  it('범위를 같은 자릿수로 펼친다', () => {
    expect(번호찾기('REQ-HOME-001~003 과 REQ-A-8 ~ REQ-A-10').번호들).toEqual([
      'REQ-HOME-001',
      'REQ-HOME-002',
      'REQ-HOME-003',
      'REQ-A-8',
      'REQ-A-9',
      'REQ-A-10',
    ]);
  });

  it('번호가 빽빽한 큰 글도 금방 끝난다 — 번호마다 앞 글 전체를 다시 훑지 않는다 (2026-09-30 보안 검토)', () => {
    const 시작 = performance.now();
    번호찾기('AB-1 '.repeat(80_000));
    expect(performance.now() - 시작).toBeLessThan(2000);
  });

  it('다른 가족으로 끝나는 범위와 너무 큰 범위는 양 끝만 두고 경고한다', () => {
    const 결과 = 번호찾기('REQ-A-001~REQ-B-003 · REQ-C-1~900');
    expect(결과.번호들).toEqual(['REQ-A-001', 'REQ-B-003', 'REQ-C-1', 'REQ-C-900']);
    expect(결과.경고).toHaveLength(2);
  });
});

describe('원장뽑기 — 번호 모드', () => {
  it('가족마다 서로 다른 번호가 셋 이상이면 원장에 넣고 외톨이는 뺀다', () => {
    const 원장 = 원장뽑기('UTF-8 · ISO-9001 · REQ-A-1 REQ-A-2 REQ-A-3 REQ-A-2 ERR-1 ERR-2', '기획.docx');
    expect(원장.모드).toBe('번호');
    expect(원장.항목.map((h) => h.번호)).toEqual(['REQ-A-1', 'REQ-A-2', 'REQ-A-3']);
    expect(원장.가족).toEqual({ 'REQ-A': 3 });
  });

  it('데모마켓 글자본에서 처음 나온 순서로 중복 없이 뽑는다 — 본문 속 인용이 두 번 세지지 않는다', () => {
    const 원장 = 원장뽑기(데모마켓, '3757');
    const 번호 = 원장.항목.map((h) => h.번호);
    expect(번호[0]).toBe('REQ-COM-001');
    expect(new Set(번호).size).toBe(번호.length);
    expect(번호).toContain('REQ-HOME-001');
    expect(번호).toContain('REQ-HOME-003');
    expect(번호).toContain('REQ-BRD-008');
    expect(원장.가족).toEqual({ 'REQ-COM': 14, 'REQ-HOME': 11, 'REQ-MEM': 19, 'REQ-BRD': 17 });
    expect(원장.항목.every((h) => h.자료 === '3757')).toBe(true);
  });
});

const 번호없는글 = [
  '데모 기획서',
  '',
  '장바구니에 담은 상품은 로그인하지 않아도 30일 동안 남는다.',
  '',
  '-   쿠폰은 한 주문에 한 장만 쓸 수 있다',
  '-   품절 상품은 담기 버튼이 눌리지 않는다',
  '',
  '  구분        내용                          비고',
  '  ----------- ----------------------------- ------',
  '  배송비      3만 원 이상이면 무료로 보낸다   필수',
  '  반품        받은 날부터 7일 안에 신청한다   필수',
  '',
  '짧은 줄',
].join('\n');

describe('원장뽑기 — 문단 모드', () => {
  it('번호 가족이 없으면 문단 · 목록 항목 · 표 행마다 P-번호를 매기고 짧은 줄과 테두리는 뺀다', () => {
    const 원장 = 원장뽑기(번호없는글, '기획.md');
    expect(원장.모드).toBe('문단');
    expect(원장.항목.map((h) => [h.번호, h.글])).toEqual([
      ['P-001', '장바구니에 담은 상품은 로그인하지 않아도 30일 동안 남는다.'],
      ['P-002', '-   쿠폰은 한 주문에 한 장만 쓸 수 있다'],
      ['P-003', '-   품절 상품은 담기 버튼이 눌리지 않는다'],
      ['P-004', '배송비      3만 원 이상이면 무료로 보낸다   필수'],
      ['P-005', '반품        받은 날부터 7일 안에 신청한다   필수'],
    ]);
  });

  it('같은 글이면 같은 번호가 나온다', () => {
    expect(원장뽑기(번호없는글, 'a')).toEqual(원장뽑기(번호없는글, 'a'));
  });

  it('글은 첫 80자만 싣는다', () => {
    const 원장 = 원장뽑기('가'.repeat(120), 'a');
    expect(원장.항목[0]?.글).toHaveLength(80);
  });
});

describe('원장만들기 — 자료 여럿 · 원장 없음', () => {
  const 파일 = (id: number, name: string, 읽을자리: string): 읽을자료 => ({
    kind: 'FILE', id, name, 받을자리: 읽을자리, 변환: null, 읽을자리,
  });
  const 글들: Record<string, string> = {
    '/a/1.txt': 'REQ-A-1 REQ-A-2 REQ-A-3',
    '/a/2.md': 'REQ-A-3 REQ-A-4 REQ-A-5 은 다른 자료에도 있다',
    '/a/3.md': 번호없는글,
    '/a/4.md': 번호없는글,
  };
  const 읽기 = (경로: string) => 글들[경로] ?? '';

  it('자료마다 따로 뽑아 합치고 겹치는 번호는 하나로 친다', () => {
    const r = 원장만들기([파일(1, '가.docx', '/a/1.txt'), 파일(2, '나.md', '/a/2.md')], 읽기);
    if (!('원장' in r)) throw new Error('원장이 없다');
    expect(r.원장.항목.map((h) => h.번호)).toEqual(['REQ-A-1', 'REQ-A-2', 'REQ-A-3', 'REQ-A-4', 'REQ-A-5']);
    expect(r.원장.항목[3]?.자료).toBe('나.md');
    expect(r.원장.가족).toEqual({ 'REQ-A': 5 });
  });

  it('글자본을 못 읽은 자료는 빠진 자료로 적고, 전부 못 읽으면 원장이 없다 — 빈 원장이 통과로 안 보이게', () => {
    const 못읽음 = (경로: string) => (경로 === '/a/1.txt' ? null : 읽기(경로));
    const r = 원장만들기([파일(1, '가.docx', '/a/1.txt'), 파일(2, '나.md', '/a/2.md')], 못읽음);
    if (!('원장' in r)) throw new Error('원장이 없다');
    expect(r.원장.빠진자료).toEqual(['가.docx(글자본을 못 읽음)']);
    expect(원장만들기([파일(1, '가.docx', '/a/1.txt')], () => null)).toEqual({
      없음: '글자본이 있는 자료가 없다 — 가.docx(글자본을 못 읽음)',
    });
  });

  it('문단 모드 자료가 둘 이상이면 자료 순번을 번호에 넣는다', () => {
    const r = 원장만들기([파일(3, '가.md', '/a/3.md'), 파일(4, '나.md', '/a/4.md')], 읽기);
    if (!('원장' in r)) throw new Error('원장이 없다');
    expect(r.원장.항목[0]?.번호).toBe('P1-001');
    expect(r.원장.항목[5]?.번호).toBe('P2-001');
  });

  it('PDF 와 피그마는 글자본이 없어 까닭에 적고, 그것뿐이면 원장이 없다', () => {
    const r = 원장만들기(
      [파일(5, '화면.pdf', '/a/5.pdf'), { kind: 'FIGMA', id: 6, 주소: 'https://www.figma.com/design/x/' }],
      읽기,
    );
    expect(r).toEqual({ 없음: '글자본이 있는 자료가 없다 — 화면.pdf(PDF) · 피그마 1건' });
  });

  it('글자본 자료가 하나라도 있으면 원장을 만들고 못 읽은 자료를 까닭에 남긴다', () => {
    const r = 원장만들기([파일(1, '가.docx', '/a/1.txt'), 파일(5, '화면.pdf', '/a/5.pdf')], 읽기);
    if (!('원장' in r)) throw new Error('원장이 없다');
    expect(r.원장.빠진자료).toEqual(['화면.pdf(PDF)']);
  });
});

const 서버꼴 = readFileSync(new URL('./fixtures/ledger/demomarket-pandoc.txt', import.meta.url), 'utf8');
const 지문표 = (글: string) => new Map(원장뽑기(글, '기획.docx').항목.map((h) => [h.번호, h.지문]));
const 바뀐번호 = (앞: string, 뒤: string) => {
  const [가, 나] = [지문표(앞), 지문표(뒤)];
  return [...가].filter(([번호, 지문]) => 나.get(번호) !== 지문).map(([번호]) => 번호);
};

describe('요구 지문 (2026-10-04 게이트 0 · 1 — 기획서 판이 바뀌면 더함 · 바뀜 · 지움을 기계로)', () => {
  it('원장 항목마다 16자 지문이 있고 같은 글이면 같다 — 맥 꼴 · 서버 꼴 둘 다', () => {
    for (const 글 of [데모마켓, 서버꼴]) {
      expect(원장뽑기(글, '기획.docx').항목.every((h) => /^[0-9a-f]{16}$/.test(h.지문 ?? ''))).toBe(true);
      expect(바뀐번호(글, 글)).toEqual([]);
    }
  });

  it('빈칸만 바뀌면 지문이 같다 — 서버 꼴은 칸 너비가 바뀌면 모든 줄의 빈칸과 테두리 길이가 달라진다', () => {
    expect(바뀐번호(서버꼴, 서버꼴.replace(/ {3,}/g, '      ').replace(/-{10,}/g, '----------'))).toEqual([]);
  });

  it('요구 한 줄을 고치면 그 번호 하나만 바뀐다 — 서버 꼴(한 줄) · 맥 꼴(번호 · 글 · 구분이 줄 셋)', () => {
    for (const 글 of [데모마켓, 서버꼴]) expect(바뀐번호(글, 글.replace('자동 넘김이 멈추고', '자동 넘김이 잠깐 멈추고'))).toEqual(['REQ-HOME-002']);
  });

  it('장 제목을 고쳐도 앞 장 마지막 요구가 안 바뀐다 — 제목 뒤 표 머리 칸도 어디에도 안 붙는다', () => {
    for (const 글 of [데모마켓, 서버꼴]) expect(바뀐번호(글, 글.replace('3. 홈 (HOME)', '3. 홈 화면 (HOME)'))).toEqual([]);
  });

  it('줄 첫머리의 원장 번호가 주인이다 — 줄 가운데서 언급한 번호(REQ-ADM-003)는 자기 줄이 따로 있다', () => {
    for (const 글 of [데모마켓, 서버꼴]) {
      expect(바뀐번호(글, 글.replace('관리자 배너 관리(REQ-ADM-003)를 따른다', '관리자 배너 관리(REQ-ADM-003)를 그대로 따른다'))).toEqual(['REQ-HOME-004']);
    }
  });

  it('번호 없는 이어진 문단은 앞 주인에 붙고, 원장 번호 없는 표 행과 테두리는 어디에도 안 붙는다', () => {
    const 글 = ['REQ-X-001 로그인', '', '아이디와 비밀번호를 넣으면 들어간다.', '', '| ID | 요구 |', '|---|---|', '| REQ-X-002 | 나가기 |', '| REQ-X-003 | 가입 |'].join('\n');
    expect(바뀐번호(글, 글.replace('들어간다', '홈으로 들어간다'))).toEqual(['REQ-X-001']);
    expect(바뀐번호(글, 글.replace('| ID | 요구 |', '| 번호 | 요구사항 |'))).toEqual([]);
  });

  it('서버 변환의 격자 표 — 첫 칸이 빈 이어진 줄(칸 안 목록)은 그 행 주인에 붙고, 번호 없는 새 행은 주인을 끊는다 (2026-10-04 코드 검토)', () => {
    const 글 = [
      '+-------------+------------------+------+',
      '| ID          | 요구사항         | 구분 |',
      '+=============+==================+======+',
      '| REQ-C-001   | 머리글이 있다.   | 필수 |',
      '|             | - 로고를 누르면 홈으로 간다 |      |',
      '+-------------+------------------+------+',
      '| REQ-C-002   | 바닥글이 있다.   | 필수 |',
      '+-------------+------------------+------+',
      '| REQ-C-003   | 토스트가 보인다. | 필수 |',
      '| 비고        | 표 끝 설명       |      |',
      '|             | 둘째 줄          |      |',
    ].join('\n');
    expect(바뀐번호(글, 글.replace('로고를 누르면 홈으로', '로고를 누르면 첫 화면으로'))).toEqual(['REQ-C-001']);
    expect(바뀐번호(글, 글.replace('둘째 줄', '둘째 줄 고침'))).toEqual([]);
  });

  it('서버 변환의 번호 목록(「1.  아이디」 빈칸 둘)은 머리글이 아니라 요구 글이다 — 제목(「4. 회원」 빈칸 하나)만 끊는다', () => {
    const 글 = ['4. 회원', '', 'REQ-M-001 로그인 절차는 다음과 같다.', '', '1.  아이디 입력', '2.  비밀번호 입력', '', 'REQ-M-002 로그아웃한다.', '', 'REQ-M-003 탈퇴한다.'].join('\n');
    expect(바뀐번호(글, 글.replace('비밀번호 입력', 'OTP 입력'))).toEqual(['REQ-M-001']);
    expect(바뀐번호(글, 글.replace('4. 회원', '4. 회원 관리'))).toEqual([]);
  });

  it('md 자료는 # 만 제목이다 — 「### REQ-001 로그인」은 주인이고 「1. 아이디 입력」 목록은 요구 글이다', () => {
    const 글 = ['# 2. 회원', '', '### REQ-M-001 로그인', '', '1. 아이디 입력', '2. 비밀번호 입력', '', '### REQ-M-002 로그아웃', '', '### REQ-M-003 탈퇴'].join('\n');
    expect(바뀐번호(글, 글.replace('비밀번호 입력', 'OTP 입력'))).toEqual(['REQ-M-001']);
    expect(바뀐번호(글, 글.replace('# 2. 회원', '# 2. 회원 관리'))).toEqual([]);
  });

  it('줄 앞 표시(【 [ ( ■ ◦ 등) 뒤의 번호도 주인이고, 행 번호 칸(「3   REQ-…」 · 숫자만 있는 줄)은 지문에서 빠진다 — 행을 끼워 번호가 밀려도 안 바뀐다', () => {
    const 표시 = ['[REQ-S-001] 검색한다', '■ REQ-S-002 정렬한다', '◦ REQ-S-003 거른다'].join('\n');
    expect(바뀐번호(표시, 표시.replace('정렬한다', '이름순으로 정렬한다'))).toEqual(['REQ-S-002']);
    const 행번호 = ['1   REQ-T-001   담는다', '2   REQ-T-002   뺀다', '3   REQ-T-003   비운다'].join('\n');
    expect(바뀐번호(행번호, ['1   REQ-T-001   담는다', '2   REQ-T-009   새로', '3   REQ-T-002   뺀다', '4   REQ-T-003   비운다'].join('\n'))).toEqual([]);
    const 맥행번호 = ['1', 'REQ-T-001', '담는다', '2', 'REQ-T-002', '뺀다', '3', 'REQ-T-003', '비운다'].join('\n');
    expect(바뀐번호(맥행번호, 맥행번호.replace('2\nREQ-T-002', '7\nREQ-T-002'))).toEqual([]);
  });

  it('다른 요구 글 안에서 번호로 시작하는 언급(「REQ-001 을 먼저 거친다」)은 주인을 빼앗지 않는다', () => {
    const 글 = ['REQ-L-001 로그인한다.', 'REQ-L-002 주문한다.', 'REQ-L-001 을 먼저 거친다.', 'REQ-L-003 결제한다.'].join('\n');
    expect(바뀐번호(글, 글.replace('먼저 거친다', '반드시 먼저 거친다'))).toEqual(['REQ-L-002']);
  });

  it('범위로 적은 줄(REQ-R-001~003)은 셋 다 지문이 있고 그 줄을 고치면 셋 다 바뀐다', () => {
    const 글 = ['| REQ-R-001~003 | 목록을 보여 준다 |', '| REQ-R-004 | 지운다 |'].join('\n');
    expect(바뀐번호(글, 글.replace('보여 준다', '모두 보여 준다'))).toEqual(['REQ-R-001', 'REQ-R-002', 'REQ-R-003']);
  });

  it('문단 모드는 문단 글이 지문이다 — 앞에 문단을 끼워 번호가 밀려도 지문은 그대로 남는다', () => {
    const 글 = '로그인 화면에서 아이디를 넣으면 다음 화면으로 간다.\n\n장바구니에 담은 상품이 목록에 그대로 보인다.';
    const 앞 = 원장뽑기(글, '기획.md').항목;
    const 뒤 = 원장뽑기(`새로 더한 문단이 맨 앞에 들어와 번호를 민다.\n\n${글}`, '기획.md').항목;
    expect(뒤.slice(1).map((h) => h.지문)).toEqual(앞.map((h) => h.지문));
  });

  it('원장만들기는 자료마다 글자본 꼴(확장자/변환 도구)을 싣고, 같은 번호가 자료 둘에 나오면 먼저 나온 자료의 지문이다', () => {
    const 계획: 읽을자료[] = [
      { kind: 'FILE', id: 1, name: '가.docx', 받을자리: '/a/1.docx', 변환: { 명령: 'pandoc', 인자: [] }, 읽을자리: '/a/1.txt' },
      { kind: 'FILE', id: 2, name: '나.md', 받을자리: '/a/2.md', 변환: null, 읽을자리: '/a/2.md' },
    ];
    const 글들: Record<string, string> = { '/a/1.txt': 'REQ-A-1 하나\nREQ-A-2 둘\nREQ-A-3 셋', '/a/2.md': 'REQ-A-3 다른 글\nREQ-A-4 넷\nREQ-A-5 다섯' };
    const r = 원장만들기(계획, (p) => 글들[p] ?? null);
    if (!('원장' in r)) throw new Error('원장이 없다');
    expect(r.원장.꼴).toEqual({ '가.docx': '.docx/pandoc', '나.md': '.md/그대로' });
    const 셋 = r.원장.항목.find((h) => h.번호 === 'REQ-A-3');
    expect(셋?.자료).toBe('가.docx');
    expect(셋?.지문).toBe(원장뽑기(글들['/a/1.txt'] ?? '', '가.docx').항목.find((h) => h.번호 === 'REQ-A-3')?.지문);
  });
});
