// 원장 뽑기 검사 — 기획서 글자본에서 요구 번호를 빠짐없이, 같은 글이면 같게 뽑는지
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 번호찾기, 원장뽑기 } from './authoring-ledger.js';

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
