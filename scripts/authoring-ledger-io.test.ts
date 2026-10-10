// 원장 껍데기 검사 — 올린 뒤 표의 임시 번호 바꿔 적기(폴더 링크 · 파일 링크 · 하드링크) · 이어받은 결과 파일의 임시 번호를 원장에 싣기
import { linkSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 원장과남은번호, 표번호바꾸기 } from './authoring-ledger-io.js';

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
    expect(r.원본원장).toEqual({ 없음: '글자본이 있는 자료가 없다' });
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
