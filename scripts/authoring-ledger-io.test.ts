// 요구 지문 껍데기 검사 — main 의 지문 파일 읽기 · 트리에 지문 파일 쓰기(폴더 링크 · 파일 링크 · 원장 없음)
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import type { 원장 } from './authoring-ledger.js';
import { 지문파일글, 지문파일읽기 } from './authoring-ledger-diff.js';
import { 앞지문읽기, 지문쓰기 } from './authoring-ledger-io.js';

const 지 = (c: string) => c.repeat(16);
const 원장하나 = (지문: string): 원장 => ({
  항목: [{ 번호: 'REQ-A-1', 자료: '가.docx', 지문 }],
  가족: { 'REQ-A': 1 },
  모드: { '가.docx': '번호' },
  경고: [],
  빠진자료: [],
  꼴: { '가.docx': '.docx/pandoc' },
});
const 앞판글 = 지문파일글({
  판: 1,
  자료: { '가.docx': { 꼴: '.docx/pandoc' }, '개정.docx': { 꼴: '.docx/pandoc' } },
  항목: [
    { 번호: 'REQ-A-1', 자료: '가.docx', 지문: 지('a') },
    { 번호: 'REQ-B-1', 자료: '개정.docx', 지문: 지('b') },
  ],
});

describe('앞지문읽기 — 기준 SHA 의 지문 파일을 git 에서', () => {
  const 깃 = (있나: boolean, 망가짐 = false) => (인자: string[]) => {
    if (망가짐) return { ok: false, 낸것: '', 까닭: '망가짐' };
    if (인자[0] === 'ls-tree') return { ok: true, 낸것: 있나 ? 'docs/cases/MKT.fingerprint.json\n' : '' };
    return { ok: true, 낸것: 앞판글 };
  };

  it('있으면 글, 없으면 글이 null, git 이 실패하면 null(못 읽음)', () => {
    expect(앞지문읽기(깃(true), 'abc', 'MKT')).toEqual({ 글: 앞판글 });
    expect(앞지문읽기(깃(false), 'abc', 'MKT')).toEqual({ 글: null });
    expect(앞지문읽기(깃(true, true), 'abc', 'MKT')).toBeNull();
  });
});

describe('지문쓰기 — 에이전트가 올리기 전에 트리에 쓴다 (게이트 1)', () => {
  let 뿌리 = '';
  let 트리 = '';
  const 자리 = () => join(트리, 'docs', 'cases', 'MKT.fingerprint.json');
  beforeEach(() => {
    뿌리 = mkdtempSync(join(tmpdir(), 'fingerprint-'));
    트리 = join(뿌리, '트리');
    mkdirSync(join(트리, 'docs', 'cases'), { recursive: true });
  });
  afterEach(() => rmSync(뿌리, { recursive: true, force: true }));

  it('앞 판이 없으면 이번 원장을 쓰고 「앞 판 지문 없음」 줄을 돌려준다', () => {
    expect(지문쓰기(트리, 'MKT', 원장하나(지('c')), { 글: null })).toBe('기획서 판 차이 — 앞 판 지문 없음(반영하면 저장된다)');
    expect(지문파일읽기(readFileSync(자리(), 'utf8'))?.항목).toEqual([{ 번호: 'REQ-A-1', 자료: '가.docx', 지문: 지('c') }]);
  });

  it('앞 판이 있으면 자료마다 합쳐 쓰고 차이 줄을 돌려준다 — 다른 자료 항목은 물려받는다', () => {
    expect(지문쓰기(트리, 'MKT', 원장하나(지('c')), { 글: 앞판글 })).toBe('기획서 판 차이 — 더함 0 · 바뀜 1(REQ-A-1) · 지움 0');
    expect(지문파일읽기(readFileSync(자리(), 'utf8'))?.항목.map((h) => h.번호)).toEqual(['REQ-B-1', 'REQ-A-1']);
  });

  it('앞 판을 못 읽었으면 쓰지 않고 그렇게 말한다', () => {
    expect(지문쓰기(트리, 'MKT', 원장하나(지('c')), null)).toBe('⚠️ 앞 판 지문을 못 읽음 — 요구 지문 파일을 안 썼다');
    expect(existsSync(자리())).toBe(false);
  });

  it('docs/cases 가 트리 밖 폴더 링크면 아무것도 쓰지 않는다 — root 가 트리 밖에 쓰지 않게', () => {
    const 밖 = join(뿌리, '밖');
    mkdirSync(밖);
    rmSync(join(트리, 'docs', 'cases'), { recursive: true });
    symlinkSync(밖, join(트리, 'docs', 'cases'));
    expect(지문쓰기(트리, 'MKT', 원장하나(지('c')), { 글: null })).toMatch(/^⚠️ 요구 지문 파일을 못 썼다/);
    expect(existsSync(join(밖, 'MKT.fingerprint.json'))).toBe(false);
  });

  it('파일 자리가 트리 밖 파일 링크면 링크를 지우고 새로 쓴다 — 링크 대상은 안 바뀐다', () => {
    const 밖파일 = join(뿌리, '밖.json');
    writeFileSync(밖파일, '원래');
    symlinkSync(밖파일, 자리());
    지문쓰기(트리, 'MKT', 원장하나(지('c')), { 글: null });
    expect(readFileSync(밖파일, 'utf8')).toBe('원래');
    expect(lstatSync(자리()).isSymbolicLink()).toBe(false);
  });

  it('원장이 없으면 자식이 만진 파일을 앞 판 글로 되돌리고, 앞 판에 없으면 지운다 — 줄은 없다', () => {
    writeFileSync(자리(), '자식이 고친 글');
    expect(지문쓰기(트리, 'MKT', { 없음: '글자본이 없다' }, { 글: 앞판글 })).toBeNull();
    expect(readFileSync(자리(), 'utf8')).toBe(앞판글);
    expect(지문쓰기(트리, 'MKT', { 없음: '글자본이 없다' }, { 글: null })).toBeNull();
    expect(existsSync(자리())).toBe(false);
  });
});
