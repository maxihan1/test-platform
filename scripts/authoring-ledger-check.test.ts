// 원장 대조 검사 — 원장의 번호가 표에서 케이스나 제외 한 줄로 빠짐없이 덮였는지
import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { 원장뽑기 } from './authoring-ledger.js';
import { tcId들, 사람이뺀번호, 셈글, 원장대조, 원장판정, 제외종류 } from './authoring-ledger-check.js';

const 옛표 = readFileSync(new URL('./fixtures/ledger/mkt-5877.md', import.meta.url), 'utf8');
const 데모마켓 = 원장뽑기(readFileSync(new URL('./fixtures/ledger/demomarket.txt', import.meta.url), 'utf8'), '3757');

const 표 = (요구줄: string[], 제외줄: string[] = []) =>
  [
    '# X',
    '',
    '## 요구사항',
    '',
    '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |',
    '|---|---|---|---|---|---|---|---|',
    ...요구줄,
    '',
    '## 제외',
    '',
    '| 요구 | 종류 | 사유 |',
    '|---|---|---|',
    ...제외줄,
    '',
  ].join('\n');
const 줄 = (출처: string, tcId: string) => `| 1 | 정상 | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-09-30 |`;
const 원장 = ['REQ-A-1', 'REQ-A-2', 'REQ-A-3'].map((번호) => ({ 번호, 자료: 'a' }));

describe('원장대조', () => {
  it('출처 칸의 번호와 제외 한 줄로 전부 덮이면 빠짐이 없고 셈이 맞다', () => {
    const r = 원장대조(원장, 표([줄('a §2 REQ-A-1 · REQ-A-2', 'X-001')], ['| REQ-A-3 | 다음 요청 | 이번 범위 밖 |']), {
      있는케이스: new Set(['X-001']),
      에이전트: true,
    });
    expect(r.빠짐).toEqual([]);
    expect(r.형식오류).toEqual([]);
    expect(r.셈).toEqual({ 총: 3, 케이스: 2, 제외: { '다음 요청': 1 }, 빠짐: 0 });
  });

  it('tcId 가 없거나(—) 케이스 파일이 없는 줄은 덮지 않는다', () => {
    const r = 원장대조(원장, 표([줄('REQ-A-1', '—'), 줄('REQ-A-2', 'X-009')]), { 있는케이스: new Set(['X-001']), 에이전트: true });
    expect(r.빠짐).toEqual(['REQ-A-1', 'REQ-A-2', 'REQ-A-3']);
    expect(r.형식오류).toEqual(['요구 줄의 tcId X-009 케이스 파일이 없다']);
  });

  it('제외는 한 줄에 하나 · 닫힌 종류 · 범위 금지 · 에이전트는 「사람이 뺌」을 못 쓴다', () => {
    const r = 원장대조(
      원장,
      표([], [
        '| REQ-A-1 · REQ-A-2 | 다음 요청 | 둘 |',
        '| REQ-A-3 | 한 칸 밖 | 모르는 종류 |',
        '| REQ-A-1~REQ-A-3 | 다음 요청 | 범위 |',
        '| REQ-A-2 | 사람이 뺌 | 자식이 씀 |',
      ]),
      { 에이전트: true },
    );
    expect(r.빠짐).toEqual(['REQ-A-1', 'REQ-A-2', 'REQ-A-3']);
    expect(r.형식오류).toEqual([
      '제외 줄 「REQ-A-1 · REQ-A-2」 — 한 줄에 번호 하나',
      '제외 줄 「REQ-A-3」 — 모르는 종류 「한 칸 밖」',
      '제외 줄 「REQ-A-1~REQ-A-3」 — 범위는 못 쓴다',
      '제외 줄 「REQ-A-2」 — 「사람이 뺌」은 사람 세션만 쓴다',
    ]);
  });

  it('사람 세션은 「사람이 뺌」을 쓸 수 있다', () => {
    const r = 원장대조(원장, 표([], ['| REQ-A-1 | 사람이 뺌 | PO 결정 |', '| REQ-A-2 | 요구 아님 | 개요 |', '| REQ-A-3 | 되돌릴 수 없음 | 결제 |']), {
      에이전트: false,
    });
    expect(r.빠짐).toEqual([]);
  });

  it('출처 칸 하나에 번호가 10개를 넘으면 형식 오류다', () => {
    const 많이 = Array.from({ length: 11 }, (_, i) => `REQ-B-${String(i + 1)}`).join(' ');
    expect(원장대조(원장, 표([줄(많이, 'X-001')]), { 에이전트: true }).형식오류).toEqual(['요구 줄 출처 칸에 번호가 11개다 — 10개까지']);
  });

  it('요구사항 절 안의 표가 여럿이어도(### 소제목으로 나눠도) 전부 읽는다', () => {
    const 글 = 표([줄('REQ-A-1', 'X-001')]).replace(
      '\n\n## 제외',
      `\n\n### 둘째 화면\n\n| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |\n|---|---|---|---|---|---|---|---|\n${줄('REQ-A-2 REQ-A-3', 'X-002')}\n\n## 제외`,
    );
    expect(원장대조(원장, 글, { 에이전트: true }).빠짐).toEqual([]);
  });

  it('원장에 없는 번호는 경고만 한다', () => {
    const r = 원장대조(원장, 표([줄('REQ-A-1 REQ-A-2 REQ-A-3 REQ-A-9', 'X-001')]), { 에이전트: true });
    expect(r.빠짐).toEqual([]);
    expect(r.경고).toEqual(['원장에 없는 번호가 표에 있다 — REQ-A-9']);
  });

  it('5877 표는 흔적 없던 세 요구를 빠짐으로 잡는다', () => {
    const r = 원장대조(데모마켓.항목, 옛표, { 에이전트: true });
    expect(r.빠짐).toEqual(expect.arrayContaining(['REQ-HOME-001', 'REQ-HOME-003', 'REQ-BRD-008']));
    expect(r.빠짐).not.toContain('REQ-COM-001');
  });

  it('덮음은 번호마다 덮은 tcId 를 모은다 — 덮은 것으로 치는 줄만 · 원장 번호만', () => {
    const r = 원장대조(
      원장,
      표([줄('REQ-A-1 REQ-A-2 REQ-A-9', 'X-001'), 줄('REQ-A-1', 'X-002'), 줄('REQ-A-3', '—'), 줄('REQ-A-3', 'X-009')]),
      { 있는케이스: new Set(['X-001', 'X-002']), 에이전트: true },
    );
    expect(r.덮음).toEqual(
      new Map([
        ['REQ-A-1', new Set(['X-001', 'X-002'])],
        ['REQ-A-2', new Set(['X-001'])],
      ]),
    );
  });

  it('제외번호는 원장 안이고 케이스로 안 덮인 번호만 싣는다 — 제외 셈과 같은 거름', () => {
    const r = 원장대조(
      원장,
      표([줄('REQ-A-1', 'X-001')], ['| REQ-A-1 | 다음 요청 | 케이스도 있다 |', '| REQ-A-2 | 자료 없음 | 화면 없음 |', '| REQ-A-9 | 요구 아님 | 원장 밖 |']),
      { 있는케이스: new Set(['X-001']), 에이전트: true },
    );
    expect(r.제외번호).toEqual(new Map([['REQ-A-2', '자료 없음']]));
    expect(r.셈.제외).toEqual({ '자료 없음': 1 });
  });

  it('새 번호 꼴 줄도 덮는다 — UI 케이스로만 덮인 번호는 UI만 에 원장 순서로 싣는다', () => {
    const 축줄 = (출처: string, tcId: string, 축: string) => `| 1 | ${축} | 전 | 조 | 결 | ${출처} | ${tcId} | 2026-09-30 |`;
    const 있는케이스 = new Set(['MKT-UI-001', 'MKT-FN-002', 'MKT-003']);
    const r = 원장대조(
      원장,
      표([줄('REQ-A-3', 'MKT-003'), 축줄('REQ-A-3', 'MKT-003', 'UI'), 줄('REQ-A-1', 'MKT-UI-001'), 줄('REQ-A-2', 'MKT-UI-001'), 줄('REQ-A-2', 'MKT-FN-002')]),
      { 있는케이스, 에이전트: true },
    );
    expect(r.빠짐).toEqual([]);
    expect(r.UI만).toEqual(['REQ-A-1']);
    const 축만 = 원장대조(원장, 표([축줄('REQ-A-3', 'MKT-003', 'UI'), 축줄('REQ-A-1', 'MKT-UI-001', '정상')]), { 있는케이스, 에이전트: true });
    expect(축만.UI만).toEqual(['REQ-A-1', 'REQ-A-3']);
    const 파일없음 = 원장대조(원장, 표([줄('REQ-A-1', 'MKT-UI-009')]), { 있는케이스, 에이전트: true });
    expect(파일없음.형식오류).toEqual(['요구 줄의 tcId MKT-UI-009 케이스 파일이 없다']);
  });

  it('제외 종류는 다섯뿐이다', () => {
    expect(제외종류).toEqual(['다음 요청', '되돌릴 수 없음', '자료 없음', '요구 아님', '사람이 뺌']);
  });
});

describe('글', () => {
  it('셈 글은 총 · 케이스 · 제외 종류별 · 가족별을 싣는다', () => {
    expect(셈글({ 총: 3, 케이스: 2, 제외: { '다음 요청': 1 }, 빠짐: 0 }, { 'REQ-A': 3 })).toBe(
      '원장: 요구 3 → 케이스 2 · 제외 1(다음 요청 1) · 빠짐 0 · 번호 가족 REQ-A 3',
    );
  });
});

describe('tcId들', () => {
  it('케이스 선언의 tcId 를 모은다', () => {
    const 케이스 = (선언: string, 제목 = '연다') =>
      `export const spec = defineCase({ ${선언}, name: 'n' });\ntest(spec, async () => { await test.step('${제목}', async () => {}); });`;
    expect(tcId들([케이스("tcId: 'MKT-001'"), 케이스('tcId: `MKT-002`')])).toEqual(new Set(['MKT-001', 'MKT-002']));
  });

  it('선언이 아닌 글에 적힌 tcId 는 세지 않는다 — 절차 제목에 적어 대조를 넘지 못하게', () => {
    expect(tcId들(["const x = 1; // tcId: 'MKT-050'\ntest.step(\"tcId: 'MKT-051'\", f);"])).toEqual(new Set());
  });
});

describe('원장판정 — 에이전트가 올리기 직전에 부른다 · 빠져도 거절하지 않는다', () => {
  const 원장값 = { 항목: 원장, 가족: { 'REQ-A': 3 }, 모드: { a: '번호' as const }, 경고: [], 빠진자료: [] };

  it('다 덮였으면 셈 한 줄 머리글과 대조 결과를 준다', () => {
    const 표글 = 표([줄('REQ-A-1 REQ-A-2 REQ-A-3', 'X-001')]);
    expect(원장판정(원장값, 표글, new Set(['X-001']))).toEqual({
      머리글: '원장: 요구 3 → 케이스 3 · 제외 0 · 빠짐 0 · 번호 가족 REQ-A 3',
      대조: 원장대조(원장, 표글, { 있는케이스: new Set(['X-001']), 에이전트: true }),
    });
  });

  it('UI 케이스로만 덮인 번호는 경고가 아닌 보고 줄로 셈 줄 아래에 싣는다', () => {
    const r = 원장판정(원장값, 표([줄('REQ-A-1 REQ-A-2 REQ-A-3', 'X-UI-001')]), new Set(['X-UI-001']));
    expect(r.머리글).toBe(
      ['원장: 요구 3 → 케이스 3 · 제외 0 · 빠짐 0 · 번호 가족 REQ-A 3', 'UI 로만 덮음 3 — REQ-A-1 · REQ-A-2 · REQ-A-3'].join('\n'),
    );
  });

  it('빠지거나 형식 오류가 있어도 거절하지 않고 셈 줄 아래에 싣는다', () => {
    const r = 원장판정(원장값, 표([줄('REQ-A-1', 'X-001')], ['| REQ-A-2 | 한 칸 밖 | x |']), new Set(['X-001']));
    if (!('대조' in r)) throw new Error('대조가 있어야 한다');
    expect(r).not.toHaveProperty('거절');
    expect(r.머리글).toBe(
      [
        '원장: 요구 3 → 케이스 1 · 제외 0 · 빠짐 2 · 번호 가족 REQ-A 3',
        '⚠️ 빠짐 2 — REQ-A-2 · REQ-A-3',
        '⚠️ 형식 오류 1 — 제외 줄 「REQ-A-2」 — 모르는 종류 「한 칸 밖」',
      ].join('\n'),
    );
    expect(r.대조.빠짐).toEqual(['REQ-A-2', 'REQ-A-3']);
    expect(r.대조.형식오류).toEqual(['제외 줄 「REQ-A-2」 — 모르는 종류 「한 칸 밖」']);
  });

  it('빠짐은 앞 10개 · 형식 오류는 앞 3개만 싣고 더 있으면 말줄임을 붙인다', () => {
    const 긴원장 = Array.from({ length: 12 }, (_, i) => ({ 번호: `REQ-C-${String(i + 1)}`, 자료: 'a' }));
    const r = 원장판정(
      { 항목: 긴원장, 가족: { 'REQ-C': 12 }, 모드: { a: '번호' }, 경고: [], 빠진자료: [] },
      표([], ['| REQ-C-1 | 가 | x |', '| REQ-C-2 | 나 | x |', '| REQ-C-3 | 다 | x |', '| REQ-C-4 | 라 | x |']),
      new Set(),
    );
    expect(r.머리글).toBe(
      [
        '원장: 요구 12 → 케이스 0 · 제외 0 · 빠짐 12 · 번호 가족 REQ-C 12',
        '⚠️ 빠짐 12 — REQ-C-1 · REQ-C-2 · REQ-C-3 · REQ-C-4 · REQ-C-5 · REQ-C-6 · REQ-C-7 · REQ-C-8 · REQ-C-9 · REQ-C-10 …',
        '⚠️ 형식 오류 4 — 제외 줄 「REQ-C-1」 — 모르는 종류 「가」 · 제외 줄 「REQ-C-2」 — 모르는 종류 「나」 · 제외 줄 「REQ-C-3」 — 모르는 종류 「다」 …',
      ].join('\n'),
    );
  });

  it('원장이 없으면 경고 머리글과 까닭을 준다 — 대조를 건너뛴다', () => {
    expect(원장판정({ 없음: '글자본이 있는 자료가 없다 — 화면.pdf(PDF)' }, '', new Set())).toEqual({
      머리글: '⚠️ 원장 없음 — 글자본이 있는 자료가 없다 — 화면.pdf(PDF). 빠진 요구를 기계로 확인하지 못했다',
      없음: '글자본이 있는 자료가 없다 — 화면.pdf(PDF)',
    });
  });

  it('원장에 못 넣은 자료가 있으면 셈 줄 끝에 싣는다', () => {
    const r = 원장판정({ ...원장값, 빠진자료: ['화면.pdf(PDF)'] }, 표([줄('REQ-A-1 REQ-A-2 REQ-A-3', 'X-001')]), new Set(['X-001']));
    expect(r.머리글).toBe('원장: 요구 3 → 케이스 3 · 제외 0 · 빠짐 0 · 번호 가족 REQ-A 3 · 원장에 못 넣은 자료 화면.pdf(PDF)');
  });

  it('못 넣은 자료와 빠짐이 같이 있으면 자료는 셈 줄 끝 · 빠짐은 다음 줄이다', () => {
    const r = 원장판정({ ...원장값, 빠진자료: ['화면.pdf(PDF)'] }, 표([줄('REQ-A-1', 'X-001')]), new Set(['X-001']));
    expect(r.머리글).toBe(
      '원장: 요구 3 → 케이스 1 · 제외 0 · 빠짐 2 · 번호 가족 REQ-A 3 · 원장에 못 넣은 자료 화면.pdf(PDF)\n⚠️ 빠짐 2 — REQ-A-2 · REQ-A-3',
    );
  });
});

describe('「사람이 뺌」 — 기준 표에 이미 있던 것은 에이전트도 인정한다 (2026-09-30 게이트 1)', () => {
  const 제외표 = 표([], ['| REQ-A-1 | 사람이 뺌 | 사람이 판정했다 |', '| REQ-A-2 | 사람이 뺌 | 자식이 적었다 |', '| REQ-A-3 | 다음 요청 | 다음 |']);

  it('사람이뺀번호 가 제외 표에서 「사람이 뺌」 번호만 뽑는다', () => {
    expect([...사람이뺀번호(제외표)]).toEqual(['REQ-A-1', 'REQ-A-2']);
    expect([...사람이뺀번호('')]).toEqual([]);
  });

  it('목록에 든 번호의 줄은 제외로 세고, 목록 밖은 지금처럼 형식 오류다', () => {
    const r = 원장대조(원장, 제외표, { 에이전트: true, 사람이뺌: new Set(['REQ-A-1']) });
    expect(r.형식오류).toEqual(['제외 줄 「REQ-A-2」 — 「사람이 뺌」은 사람 세션만 쓴다']);
    expect(r.빠짐).toEqual(['REQ-A-2']);
    expect(r.셈.제외).toEqual({ '사람이 뺌': 1, '다음 요청': 1 });
  });

  it('원장판정 이 목록을 대조에 넘긴다', () => {
    const 값 = { 항목: 원장, 가족: {}, 모드: {}, 경고: [], 빠진자료: [] };
    const r = 원장판정(값, 제외표, new Set(), new Set(['REQ-A-1', 'REQ-A-2']));
    expect('대조' in r && r.대조.형식오류).toEqual([]);
  });
});
