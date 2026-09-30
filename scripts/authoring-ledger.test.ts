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
