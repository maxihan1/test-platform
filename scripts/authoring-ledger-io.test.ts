// 원장 껍데기 검사 — 올린 뒤 표의 임시 번호 바꿔 적기(폴더 링크 · 파일 링크 · 하드링크) · 이어받은 결과 파일의 임시 번호를 원장에 싣기
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 옛표줄들, 원장과남은번호, 표번호바꾸기, 표준원장사본 } from './authoring-ledger-io.js';

let 뿌리 = '';
let 트리 = '';
const 표자리 = () => join(트리, 'docs', 'cases', 'MKT.md');
const 표글 = '| 1 | 정상 | 전 | 조 | 결 | MKT-NEW-001 · MKT-REQ-002 | MKT-FN-010 |\n| 2 | 예외 | 전 | 조 | 결 | MKT-NEW-0012 | MKT-FN-011 |\n';
const 맞춤 = new Map([['MKT-NEW-001', 'MKT-REQ-007']]);

beforeEach(() => {
  뿌리 = mkdtempSync(join(tmpdir(), 'ledger-io-'));
  트리 = join(뿌리, '트리');
  mkdirSync(join(트리, 'docs', 'cases'), { recursive: true });
});
afterEach(() => rmSync(뿌리, { recursive: true, force: true }));

describe('표번호바꾸기 — 올린 뒤 출처 칸의 임시 번호를 받은 번호로', () => {
  it('맞춤표의 번호만 바꾼다 — 긴 번호 속 짧은 번호(MKT-NEW-0012)는 안 건드린다', () => {
    writeFileSync(표자리(), 표글);
    expect(표번호바꾸기(트리, 'MKT', 맞춤)).toBeNull();
    expect(readFileSync(표자리(), 'utf8')).toBe(표글.replace('MKT-NEW-001 ·', 'MKT-REQ-007 ·'));
  });

  it('올린 뒤(남김금지)에는 받은 번호가 없는 임시 번호가 남으면 까닭을 돌려준다 — main 에 들어가면 다음 바꿔 적기가 엉뚱한 요구로 바꾼다', () => {
    writeFileSync(표자리(), 표글);
    expect(표번호바꾸기(트리, 'MKT', 맞춤, true)).toBe('요구사항 표에 받은 번호가 없는 임시 번호가 남았다 — MKT-NEW-0012. 결과 파일에 그 항목을 더하거나 표에서 고쳐라');
    expect(readFileSync(표자리(), 'utf8')).toContain('MKT-REQ-007');
    expect(표번호바꾸기(트리, 'MKT', new Map([['MKT-NEW-0012', 'MKT-REQ-008']]), true)).toBeNull();
  });

  it('표가 없거나 맞춤표가 비면 할 일이 없다', () => {
    expect(표번호바꾸기(트리, 'MKT', 맞춤)).toBeNull();
    writeFileSync(표자리(), 표글);
    expect(표번호바꾸기(트리, 'MKT', new Map())).toBeNull();
    expect(readFileSync(표자리(), 'utf8')).toBe(표글);
  });

  it('표가 트리 밖 파일 링크 · 하드링크면 쓰지 않고 까닭을 돌려준다 — root 가 링크 대상을 바꾸지 않게', () => {
    const 밖파일 = join(뿌리, '밖.md');
    writeFileSync(밖파일, 표글);
    symlinkSync(밖파일, 표자리());
    expect(표번호바꾸기(트리, 'MKT', 맞춤)).toMatch(/일반 파일이 아니다/);
    rmSync(표자리());
    linkSync(밖파일, 표자리());
    expect(표번호바꾸기(트리, 'MKT', 맞춤)).toMatch(/일반 파일이 아니다/);
    expect(readFileSync(밖파일, 'utf8')).toBe(표글);
  });

  it('docs/cases 가 트리 밖 폴더 링크면 쓰지 않는다', () => {
    const 밖 = join(뿌리, '밖');
    mkdirSync(밖);
    writeFileSync(join(밖, 'MKT.md'), 표글);
    rmSync(join(트리, 'docs', 'cases'), { recursive: true });
    symlinkSync(밖, join(트리, 'docs', 'cases'));
    expect(표번호바꾸기(트리, 'MKT', 맞춤)).toMatch(/진짜 폴더가 아니다|트리 밖/);
    expect(readFileSync(join(밖, 'MKT.md'), 'utf8')).toBe(표글);
  });
});

describe('원장과남은번호 — 이어받은 폴더', () => {
  it('앞 자식의 결과 파일이 있으면 그 임시 번호를 원장 사본에 이어 싣는다 · 원장 사본 자리의 링크를 따라 쓰지 않는다', () => {
    const 자료 = join(뿌리, '자료');
    mkdirSync(자료);
    const 남의것 = join(뿌리, '남의것.json');
    writeFileSync(남의것, '그대로');
    symlinkSync(남의것, join(자료, 'ledger.json'));
    const 깃 = (인자: string[]) => ({ ok: true, 낸것: 인자[0] === 'ls-tree' ? '' : '' });
    const 결과 = { items: [{ reqId: 'MKT-NEW-003', feature: '가입', text: '이메일은 필수', basis: [{ from: '화면', quote: '필수' }], status: 'NEEDS_CHECK' }] };
    const r = 원장과남은번호({ 계획: [], 자료폴더: 자료, 깃, 기준: 'abc', 서비스: 'MKT', 폴더: 'mkt', 이어작성원본: null, 지금: [], 옮긴다: true, 옮긴몸: 결과 });
    expect('막힘' in r).toBe(false);
    if ('막힘' in r) return;
    expect('없음' in r.원장 ? [] : r.원장.항목.map((h) => h.번호)).toEqual(['MKT-NEW-003']);
    expect(readFileSync(남의것, 'utf8')).toBe('그대로');
    expect((JSON.parse(readFileSync(join(자료, 'ledger.json'), 'utf8')) as { 원장: { 항목: unknown[] } }).원장.항목).toHaveLength(1);
    // 자료가 없는(화면만) 옮기기는 원본 원장이 없다 — 옮기기 대조를 건너뛴다
    expect(r.원본원장).toEqual({ 없음: '화면만 — 원본 자료가 없다' });
  });

  it('표준 기획서가 빈 서비스도 옮기는 요청이면 사본 자리를 준다 — 자식이 옮긴 뒤 다시 만든다. 이어 작성은 원장 없음이다', () => {
    const 자료 = join(뿌리, '자료');
    mkdirSync(자료);
    const 깃 = () => ({ ok: true, 낸것: '' });
    const 부르기 = (옮긴다: boolean) => 원장과남은번호({ 계획: [], 자료폴더: 자료, 깃, 기준: 'abc', 서비스: 'MKT', 폴더: 'mkt', 이어작성원본: null, 지금: [], 옮긴다 });
    const 옮김 = 부르기(true);
    expect('막힘' in 옮김 ? null : 옮김.입력).toEqual({ 사본: join(자료, 'ledger.json'), 요약: '표준 기획서에 항목이 없다 — 옮긴 뒤 다시 만든다' });
    const 안옮김 = 부르기(false);
    expect('막힘' in 안옮김 ? null : 안옮김.입력).toEqual({ 없음: '표준 기획서에 항목이 없다' });
  });
});

describe('표준원장사본 — 옛 표 번호 물려받기 (PRD-F3-03)', () => {
  it('기준 표 줄의 원본 번호를 결과 파일 항목 근거로 찾아 칸 재료에 옛 tcId 를 건다', () => {
    const 기준 = {
      표글: '## 요구사항\n\n| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|---|---|---|---|---|---|---|---|\n| 1 | 정상 | 전 | 조 | 결 | 기획서.docx §4 REQ-MEM-001 | MKT-FN-001 | 2026-10-05 |\n',
      있는케이스: new Set(['MKT-FN-001']),
    };
    const 결과 = { items: [{ feature: '가입', text: '아이디는 4자 이상이다', basis: [{ from: '기획서.docx', ref: 'REQ-MEM-001', quote: '아이디는 4~12자' }], status: 'CONFIRMED' }] };
    const r = 표준원장사본([], 결과, 'MKT', 기준);
    expect(r.기준.칸재료?.옛칸).toEqual({ 'MKT-NEW-001|FN|정상|정식#0': ['MKT-FN-001'] });
  });
});

describe('옛표줄들 — 옛 표를 옮긴 요청의 PR 머리 (PRD-F3-03)', () => {
  const 머리 = '## 요구사항\n\n| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|---|---|---|---|---|---|---|---|\n';
  const 행 = (n: number, 출처: string, tcId: string) => `| ${String(n)} | 정상 | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-10-05 |\n`;
  const 옛표 = 머리 + 행(1, '기획서.docx §2 REQ-COM-001', 'MKT-FN-001') + 행(2, '기획서.docx §2 REQ-COM-002', 'MKT-FN-004') + 행(3, '기획서.docx §2 REQ-COM-003 · 화면에만 — 문구', 'MKT-FN-050');

  it('물려받은 옛 번호 · 남은 옛 출처 줄 · 안 지운 옛 케이스 파일을 센다', () => {
    writeFileSync(표자리(), 머리 + 행(1, 'MKT-REQ-001', 'MKT-FN-001') + 행(2, 'MKT-REQ-002 · 화면에만 — 문구', 'MKT-FN-050') + 행(3, '기획서.docx §2 REQ-COM-002', 'MKT-FN-004'));
    mkdirSync(join(트리, 'tests', 'mkt', 'shop'), { recursive: true });
    for (const t of ['MKT-FN-001', 'MKT-FN-004', 'MKT-FN-050']) writeFileSync(join(트리, 'tests', 'mkt', 'shop', `${t}.spec.ts`), '');
    expect(옛표줄들(트리, 'MKT', 'mkt', 옛표)).toEqual([
      '옛 표 옮김: 옛 케이스 3 중 번호 물려받음 2 · 새 표에 없음 1',
      '옛 미확정 케이스 1 중 미확정 칸으로 물려받음 1',
      '⚠️ 옛 출처(원본 번호) 줄이 남음 1 — 요구 3',
      '⚠️ 새 표에 없는데 안 지운 옛 케이스 파일 1 — MKT-FN-004',
    ]);
  });

  it('옮기는 요청이면 원장 입력에 기준 표의 옛 줄 수를 싣는다 — 프롬프트가 갈아쓰기를 알린다', () => {
    const 자료 = join(뿌리, '자료');
    mkdirSync(자료);
    const 깃 = (인자: string[]) => ({ ok: true, 낸것: 인자[0] === 'ls-tree' ? 'docs/cases/MKT.md\0' : 옛표 });
    const r = 원장과남은번호({ 계획: [], 자료폴더: 자료, 깃, 기준: 'abc', 서비스: 'MKT', 폴더: 'mkt', 이어작성원본: null, 지금: [], 옮긴다: true });
    expect('막힘' in r || '없음' in r.입력 ? null : r.입력.옛줄).toBe(3);
  });

  it('「제거함」 줄은 옛 줄이 아니다 · 셈이 깨지면 던지지 않고 경고 한 줄이다 — 판을 올린 뒤라 거절이 되면 안 된다', () => {
    const 제거함 = 행(4, '기획서.docx §2 REQ-COM-004', '제거함(MKT-FN-099)');
    writeFileSync(표자리(), 머리 + 제거함);
    mkdirSync(join(트리, 'tests'));
    writeFileSync(join(트리, 'tests', 'mkt'), '폴더가 아니다');
    expect(옛표줄들(트리, 'MKT', 'mkt', 머리 + 제거함)).toEqual([]);
    expect(옛표줄들(트리, 'MKT', 'mkt', 옛표)[0]).toMatch(/^⚠️ 옛 표 셈을 못 했다 — /);
  });

  it('옛 미확정이 정식 칸으로 갔으면 번호를 띄운다 — 문서대로 확정됐거나 확인 필요가 빠졌다', () => {
    writeFileSync(표자리(), 머리 + 행(1, 'MKT-REQ-002', 'MKT-FN-050'));
    expect(옛표줄들(트리, 'MKT', 'mkt', 옛표).slice(1, 3)).toEqual([
      '옛 미확정 케이스 1 중 미확정 칸으로 물려받음 0',
      '⚠️ 미확정 칸으로 못 물려받은 옛 미확정 케이스(문서대로 확정됐거나 확인 필요가 빠졌다) 1 — MKT-FN-050',
    ]);
  });

  it('기준 표에 옛 줄이 없으면 줄이 없다', () => {
    writeFileSync(표자리(), 머리 + 행(1, 'MKT-REQ-001', 'MKT-FN-001'));
    expect(옛표줄들(트리, 'MKT', 'mkt', 머리 + 행(1, 'MKT-REQ-001', 'MKT-FN-001'))).toEqual([]);
  });
});
