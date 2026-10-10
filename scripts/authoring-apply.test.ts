// 반영 요청 — 기준 판과 지금 판을 견줘 다시 쓸 요구 · 종류와 지울 케이스를 정한다 (도메인/작성 §3.6 「사람이 고칠 때」 「고친 요구만 다시 작성」)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';
import { describe, expect, it } from 'vitest';

import { 바뀐종류, 반영계획만들기, 반영뒤줄, 반영막힘, 반영요청인가 } from './authoring-apply.js';
import { 원장과남은번호 } from './authoring-ledger-io.js';

const 항목 = (reqId: string, text: string): PrdItem => ({ reqId, feature: '회원가입', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED' });
const 표 = (줄들: [string, string, string][]) =>
  [
    '## 요구사항',
    '',
    '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |',
    '|---|---|---|---|---|---|---|---|',
    ...줄들.map(([축, 출처, tcId], i) => `| ${String(i + 1)} | ${축} | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-10-11 |`),
    '',
  ].join('\n');

describe('바뀐종류', () => {
  it('숫자 한도가 바뀌면 정상 · UI 에 경계를 더한다', () => {
    expect(바뀐종류('비밀번호는 8자 이상이어야 한다', '비밀번호는 10자 이상이어야 한다')).toEqual(['정상', '경계', 'UI']);
  });

  it('설계가 같으면 정상 · UI 만 다시 쓴다', () => {
    expect(바뀐종류('비밀번호는 8자 이상이어야 한다', '비밀번호는 8자 이상으로 적어야 한다')).toEqual(['정상', 'UI']);
  });

  it('예외 기법이 생기면 예외를 더한다', () => {
    expect(바뀐종류('아이디를 적는다', '아이디가 형식에 맞지 않으면 안내 문구가 보인다')).toEqual(['정상', '예외', 'UI']);
  });
});

describe('반영계획만들기', () => {
  const 기준 = { version: 3, items: [항목('X-REQ-001', '비밀번호는 8자 이상이어야 한다'), 항목('X-REQ-002', '약관에 동의한다'), 항목('X-REQ-003', '가입하면 환영 문구가 보인다')] };
  const 지금 = { version: 5, items: [항목('X-REQ-001', '비밀번호는 10자 이상이어야 한다'), 항목('X-REQ-003', '가입하면 환영 문구가 보인다'), 항목('X-REQ-004', '가입하면 메일이 간다')] };
  const main표 = 표([
    ['정상', 'X-REQ-001', 'X-FN-001'],
    ['경계', 'X-REQ-001', 'X-FN-002'],
    ['정상', 'X-REQ-002', 'X-FN-004'],
    ['정상', 'X-REQ-002 · X-REQ-003', 'X-FN-007'],
    ['UI', 'X-REQ-003', 'X-UI-003'],
  ]);

  it('바뀐 항목은 덮던 케이스 · 옛 문장 · 다시 쓸 종류, 새 항목은 번호, 지운 항목은 그 요구만 덮던 케이스를 지운다', () => {
    expect(반영계획만들기(지금, 기준, main표, 'X')).toEqual({
      기준판: 3,
      지금판: 5,
      다시씀: [
        {
          번호: 'X-REQ-001',
          옛문장: '비밀번호는 8자 이상이어야 한다',
          새문장: '비밀번호는 10자 이상이어야 한다',
          다시쓸종류: ['정상', '경계', 'UI'],
          케이스: [{ tcId: 'X-FN-001', 축: '정상' }, { tcId: 'X-FN-002', 축: '경계' }],
        },
      ],
      새항목: ['X-REQ-004'],
      지움: [{ 번호: 'X-REQ-002', 지울케이스: ['X-FN-004'], 남길케이스: ['X-FN-007'] }],
    });
  });

  it('기준 판이 없으면 전부 새 항목이고, 표가 이미 덮는 항목은 네 종류를 다 다시 쓴다 — 케이스가 둘로 생기지 않게', () => {
    const r = 반영계획만들기(지금, null, main표, 'X');
    expect(r.기준판).toBeNull();
    expect(r.다시씀.map((x) => [x.번호, x.옛문장, x.다시쓸종류])).toEqual([
      ['X-REQ-001', null, ['정상', '경계', '예외', 'UI']],
      ['X-REQ-003', null, ['정상', '경계', '예외', 'UI']],
    ]);
    expect(r.새항목).toEqual(['X-REQ-004']);
    expect(r.지움).toEqual([]);
  });

  it('반영할 것이 없으면 막는다', () => {
    const 같음 = 반영계획만들기(기준, 기준, main표, 'X');
    expect(반영막힘(같음)).toMatch(/반영할 것이 없다/);
    expect(반영막힘(반영계획만들기(지금, 기준, main표, 'X'))).toBeNull();
  });
});

describe('반영요청인가', () => {
  it('params.prdApply 가 true 일 때만', () => {
    expect(반영요청인가({ params: { prdApply: true } })).toBe(true);
    expect(반영요청인가({ params: { prdApply: 'true' } })).toBe(false);
    expect(반영요청인가({ params: {} })).toBe(false);
    expect(반영요청인가({})).toBe(false);
  });
});

describe('반영뒤줄', () => {
  it('판 견줌 한 줄과, 지울 케이스 파일이 남았으면 경고를 단다', () => {
    const 트리 = mkdtempSync(join(tmpdir(), 'apply-'));
    try {
      mkdirSync(join(트리, 'tests', 'x', 'pages'), { recursive: true });
      writeFileSync(join(트리, 'tests', 'x', 'X-FN-004.spec.ts'), '');
      const 계획 = { 기준판: 3, 지금판: 5, 다시씀: [], 새항목: ['X-REQ-004'], 지움: [{ 번호: 'X-REQ-002', 지울케이스: ['X-FN-004', 'X-FN-005'], 남길케이스: [] }] };
      expect(반영뒤줄(계획, 트리, 'x')).toEqual([
        '표준 기획서 반영: 판 3 → 5 · 다시 씀 0 · 새 항목 1 · 지움 1',
        '⚠️ 지운 요구만 덮던 케이스가 남음 1 — X-FN-004',
      ]);
      rmSync(join(트리, 'tests', 'x', 'X-FN-004.spec.ts'));
      expect(반영뒤줄({ ...계획, 기준판: null }, 트리, 'x')).toEqual(['표준 기획서 반영: 기준 판 없음 → 판 5 · 다시 씀 0 · 새 항목 1 · 지움 1']);
    } finally {
      rmSync(트리, { recursive: true, force: true });
    }
  });
});

describe('원장과남은번호 — 반영 요청', () => {
  const main표 = 표([['정상', 'X-REQ-001', 'X-FN-001']]);
  const 깃 = (망가짐: boolean) => (인자: string[]) => {
    if (망가짐) return { ok: false, 낸것: '', 까닭: '망가짐' };
    if (인자[0] === 'ls-tree') return { ok: true, 낸것: 'docs/cases/X.md\0' };
    return { ok: true, 낸것: main표 };
  };
  const 기준판 = { version: 1, items: [항목('X-REQ-001', '비밀번호는 8자 이상이어야 한다')] };
  const 부르기 = (폴더: string, 지금: PrdItem[], 망가짐 = false) =>
    원장과남은번호({ 계획: [], 자료폴더: 폴더, 깃: 깃(망가짐), 기준: 'abc', 서비스: 'X', 폴더: 'x', 이어작성원본: null, 지금, 옮긴다: false, 반영: { 지금판: 2, 기준판 } });

  it('반영 계획을 사본에 쓰고 절 재료를 준다 — 원본 원장은 없다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'apply-io-'));
    try {
      const r = 부르기(폴더, [항목('X-REQ-001', '비밀번호는 10자 이상이어야 한다')]);
      if ('막힘' in r) throw new Error(r.막힘);
      expect(r.반영?.사본).toBe(join(폴더, 'apply.json'));
      expect(r.반영?.계획.다시씀.map((x) => [x.번호, x.케이스])).toEqual([['X-REQ-001', [{ tcId: 'X-FN-001', 축: '정상' }]]]);
      expect(JSON.parse(readFileSync(join(폴더, 'apply.json'), 'utf8'))).toEqual(r.반영?.계획);
      expect(r.원본원장).toEqual({ 없음: '옮기지 않는 요청이다' });
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });

  it('반영할 것이 없거나 기준 표를 못 읽으면 막는다 — 덮던 케이스를 모르고 돌면 케이스가 둘로 생긴다', () => {
    const 폴더 = mkdtempSync(join(tmpdir(), 'apply-io-'));
    try {
      expect(부르기(폴더, 기준판.items)).toEqual({ 막힘: expect.stringMatching(/반영할 것이 없다/) as unknown });
      expect(부르기(폴더, [항목('X-REQ-001', '10자')], true)).toEqual({ 막힘: expect.stringMatching(/망가짐/) as unknown });
    } finally {
      rmSync(폴더, { recursive: true, force: true });
    }
  });
});
