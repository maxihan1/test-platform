// 표준 기획서 옮기기 껍데기 검사 — 지금 판 받아 두기 · 결과 읽기 · 비밀값 · 올리기 실패를 PR 머리 줄로
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { 사본 } from './authoring-copy.js';
import type { 원장 } from './authoring-ledger.js';
import { 옮기기올리기, 판받기 } from './authoring-prd-io.js';

const 서버 = { 주소기지: 'http://admin:3000', 토큰: 't' };
const 답 = (status: number, 몸: unknown = {}) => new Response(JSON.stringify(몸), { status });
const 있던 = { reqId: 'MKT-REQ-001', feature: '회원가입', text: '아이디는 4자 이상', basis: [{ from: '기획서.docx', ref: 'REQ-1', quote: '아이디 4자 이상' }], status: 'CONFIRMED' };
const 원장하나: 원장 = { 항목: [{ 번호: 'REQ-1', 자료: '기획서.docx', 지문: 'x' }, { 번호: 'REQ-2', 자료: '기획서.docx', 지문: 'y' }], 가족: {}, 모드: {}, 경고: [], 빠진자료: [], 꼴: {} };

let 폴더 = '';
let 자리: 사본;
beforeEach(() => {
  폴더 = mkdtempSync(join(tmpdir(), 'prd-io-'));
  자리 = { 자료: 폴더 } as 사본;
});
afterEach(() => {
  vi.unstubAllGlobals();
  rmSync(폴더, { recursive: true, force: true });
});

const 결과쓰기 = (몸: unknown) => {
  mkdirSync(join(폴더, 'out'), { recursive: true });
  writeFileSync(join(폴더, 'out', 'prd.json'), typeof 몸 === 'string' ? 몸 : JSON.stringify(몸));
};
const 받은 = { 판: 2, 항목: [있던] as never, 입력: { 지금판: '', 결과: '', 판: 2, 항목수: 1 } };

describe('판받기', () => {
  it('지금 판을 자료 폴더에 두고 프롬프트 재료를 돌려준다', async () => {
    const 건것: string[] = [];
    vi.stubGlobal('fetch', async (url: string) => (건것.push(url), 답(200, { version: 2, items: [있던] })));
    const r = await 판받기(서버, 'MKT', 7, 폴더);
    expect(건것).toEqual(['http://admin:3000/api/authoring/requests/7/prd?service=MKT']);
    expect(r).toMatchObject({ 판: 2, 입력: { 지금판: join(폴더, 'prd-current.json'), 결과: join(폴더, 'out', 'prd.json'), 판: 2, 항목수: 1 } });
    expect(JSON.parse(readFileSync(join(폴더, 'prd-current.json'), 'utf8'))).toEqual({ version: 2, items: [있던] });
  });

  it('앞 자식이 심은 링크를 따라 쓰지 않고 지운 뒤 새로 만든다', async () => {
    const 남의것 = join(폴더, 'victim.txt');
    writeFileSync(남의것, '그대로');
    symlinkSync(남의것, join(폴더, 'prd-current.json'));
    vi.stubGlobal('fetch', async () => 답(200, { version: 0, items: [] }));
    await 판받기(서버, 'MKT', 7, 폴더);
    expect(readFileSync(남의것, 'utf8')).toBe('그대로');
  });

  it('못 받으면 옮기지 않고 머리 줄을 돌려준다. 거절은 던진다', async () => {
    vi.stubGlobal('fetch', async () => 답(500));
    expect(await 판받기(서버, 'MKT', 7, 폴더)).toEqual({ 줄: '⚠️ 표준 기획서 지금 판을 못 읽어 옮기지 않았다 (500)' });
    vi.stubGlobal('fetch', async () => 답(403));
    await expect(판받기(서버, 'MKT', 7, 폴더)).rejects.toThrow(/403/);
  });
});

describe('옮기기올리기', () => {
  it('결과 파일이 없거나 JSON 이 아니면 올리지 않는다', async () => {
    const 건것 = vi.fn(async () => 답(200));
    vi.stubGlobal('fetch', 건것);
    expect(await 옮기기올리기(서버, 'MKT', 7, 자리, 받은, 원장하나, {})).toEqual(['⚠️ 표준 기획서 결과(out/prd.json)가 없다 — 옮기지 않았다']);
    결과쓰기('{ 깨짐');
    expect(await 옮기기올리기(서버, 'MKT', 7, 자리, 받은, 원장하나, {})).toEqual(['⚠️ 표준 기획서 결과를 못 읽었다 — JSON 이 아니다']);
    expect(건것).not.toHaveBeenCalled();
  });

  it('테스트 계정 비밀번호가 들었으면 이스케이프돼 있어도 올리지 않는다', async () => {
    const 건것 = vi.fn(async () => 답(200));
    vi.stubGlobal('fetch', 건것);
    결과쓰기({ items: [{ ...있던, reqId: undefined, quote: 'x', text: '비번은 pa"ss1234 로 들어간다' }] });
    expect(await 옮기기올리기(서버, 'MKT', 7, 자리, 받은, 원장하나, { 계정: 'pa"ss1234' })).toEqual(['⚠️ 표준 기획서 결과에 비밀값이 들어 있다 — 올리지 않았다']);
    expect(건것).not.toHaveBeenCalled();
  });

  it('판 전체를 올리고 판 · 사람이 남긴 번호 · 대조 줄을 돌려준다', async () => {
    let 몸: { baseVersion?: number; items?: { reqId?: string; text: string }[] } = {};
    vi.stubGlobal('fetch', async (_url: string, init: RequestInit) => {
      몸 = JSON.parse(String(init.body)) as typeof 몸;
      return 답(200, { version: 3, keptByPerson: ['MKT-REQ-001'] });
    });
    결과쓰기({ items: [{ feature: '회원가입', text: '닉네임은 필수', basis: [{ from: '기획서.docx', ref: 'REQ-2', quote: '닉네임 필수' }], status: 'CONFIRMED' }] });
    const 줄 = await 옮기기올리기(서버, 'MKT', 7, 자리, 받은, 원장하나, {});
    expect(몸.baseVersion).toBe(2);
    expect(몸.items?.map((i) => [i.reqId, i.text])).toEqual([['MKT-REQ-001', '아이디는 4자 이상'], [undefined, '닉네임은 필수']]);
    expect(줄).toEqual([
      '표준 기획서: 판 3 · 이번 자료 항목 1(확인 필요 0) · 지움 0',
      '⚠️ 사람이 고친 항목과 새 문서가 다름 1 — MKT-REQ-001',
      '옮기기 대조: 요구 2 중 빠짐 1 · 요구 아님 0 · 설계 잃음 0',
      '⚠️ 옮기기 빠짐 1 — REQ-1',
    ]);
  });

  it('서버가 거절하면 까닭을 싣고 대조 줄은 그대로 남긴다', async () => {
    vi.stubGlobal('fetch', async () => 답(400, { error: 'PRD_FULL', detail: '1000' }));
    결과쓰기({ items: [] });
    expect(await 옮기기올리기(서버, 'MKT', 7, 자리, 받은, { 없음: '글자본이 있는 자료가 없다' }, {})).toEqual([
      '⚠️ 표준 기획서를 못 올렸다 (400 PRD_FULL 1000)',
      '⚠️ 옮기기 대조 없음 — 글자본이 있는 자료가 없다',
    ]);
  });
});
