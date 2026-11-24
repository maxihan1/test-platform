// 프로시저 안 케이스의 삭제 작성 · 반영 계획에 싣는 프로시저 검사 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「고치기 · 삭제 · 보류 · 겹침」 「반영 · 이어 작성」)
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PrdItem } from '@platform/kit/types';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { 구간, 선언, 프로시저글 } from '../apps/admin/src/catalog/procedure-fixture.js';
import { type 반영계획, 반영뒤줄, 반영요청인가, 반영절 } from './authoring-apply.js';
import { 고칠프로시저들, 삭제막힘, 삭제요청읽기, 트리케이스들 } from './authoring-apply-proc.js';
import { 편집계산 } from './authoring-edit-apply.js';
import { 탐색하나 } from './authoring-explore.js';
import { 원장판정 } from './authoring-ledger-verdict.js';
import { 원장과남은번호 } from './authoring-ledger-io.js';

const 항목 = (번호: number, text: string): PrdItem => ({ reqId: `XQ-REQ-00${String(번호)}`, feature: '글쓰기', text, basis: [{ from: '기획서.docx', quote: text }], status: 'CONFIRMED' });
const 줄 = (tcId칸: string, 출처: string, 축 = '정상') => `| 1 | ${축} | 전 | 조 | 결 | ${출처} | ${tcId칸} | 2026-11-25 |`;
const 표 = (줄들: string[]) => ['## 요구사항', '', '| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |', '|---|---|---|---|---|---|---|---|', ...줄들, ''].join('\n');
const main표 = 표([줄('XQ-FN-101', 'XQ-REQ-001'), 줄('XQ-FN-102', 'XQ-REQ-002'), 줄('XQ-FN-103', 'XQ-REQ-003')]);
const 프로시저 = 프로시저글(구간('본문없음', '본문없음 확인') + 구간('글자수초과', '글자수초과 확인') + 구간('게시확인', '게시확인 확인'));
const 빈계획 = { 기준판: 1, 지금판: 1, 다시씀: [], 새항목: [], 지움: [] } satisfies 반영계획;
const 기준 = [
  { 파일: 'tests/xq/XQ-TP-001.spec.ts', procId: 'XQ-TP-001', 케이스: ['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103'] },
  { 파일: 'tests/xq/XQ-TP-002.spec.ts', procId: 'XQ-TP-002', 케이스: ['XQ-FN-201'] },
];

describe('삭제요청읽기', () => {
  it('params.procDelete.cases 를 읽는다 — 칸이 없으면 undefined, 모양이 틀리면 null', () => {
    expect(삭제요청읽기({ params: { procDelete: { cases: ['XQ-FN-101', 'XQ-FN-101', 'XQ-FN-102'] } } })).toEqual(['XQ-FN-101', 'XQ-FN-102']);
    expect(삭제요청읽기({ params: { prdApply: true } })).toBeUndefined();
    for (const procDelete of [null, {}, { cases: [] }, { cases: [1] }, { cases: ['XQ FN'] }]) expect(삭제요청읽기({ params: { procDelete } })).toBeNull();
  });

  it('삭제 작성은 자료 없이 도는 요청이고 탐색하지 않는다', () => {
    const 것 = { params: { procDelete: { cases: ['XQ-FN-101'] } } };
    expect(반영요청인가(것)).toBe(true);
    expect(탐색하나(것, true)).toBe(false);
  });
});

describe('고칠프로시저들', () => {
  it('다시 쓸 종류의 케이스 · 남길 케이스 · 화면이 맞음 · 테스트 고침 케이스가 든 프로시저를 낸다', () => {
    const 다시씀 = [{ 번호: 'XQ-REQ-001', 옛문장: '가', 새문장: '나', 다시쓸종류: ['정상' as const], 케이스: [{ tcId: 'XQ-FN-101', 축: '정상' as const }, { tcId: 'XQ-FN-201', 축: '경계' as const }] }];
    expect(고칠프로시저들({ ...빈계획, 다시씀 }, 기준)).toEqual([{ ...기준[0], 고칠: ['XQ-FN-101'], 지울: [] }]);
    expect(고칠프로시저들({ ...빈계획, 테스트고침: { issueKey: 'X-1', cases: [{ runId: 1, tcId: 'XQ-FN-201', env: 'qa' }], note: '' } }, 기준)).toEqual([{ ...기준[1], 고칠: ['XQ-FN-201'], 지울: [] }]);
    expect(고칠프로시저들({ ...빈계획, 화면이맞음: [{ runId: 1, tcId: 'XQ-FN-103', env: 'qa', 번호들: [] }] }, 기준)[0]!.고칠).toEqual(['XQ-FN-103']);
  });

  it('지운 요구의 케이스와 삭제 요청의 케이스는 지울에 든다', () => {
    const 지움 = [{ 번호: 'XQ-REQ-002', 지울케이스: ['XQ-FN-102'], 남길케이스: ['XQ-FN-103'] }];
    expect(고칠프로시저들({ ...빈계획, 지움 }, 기준)).toEqual([{ ...기준[0], 고칠: ['XQ-FN-103'], 지울: ['XQ-FN-102'] }]);
    expect(고칠프로시저들({ ...빈계획, 삭제: ['XQ-FN-102', 'XQ-FN-201'] }, 기준).map((p) => p.지울)).toEqual([['XQ-FN-102'], ['XQ-FN-201']]);
  });

  it('닿는 프로시저가 없으면 비어 있다 — 옛 꼴 케이스만 고치는 반영은 지금 그대로다', () => {
    expect(고칠프로시저들({ ...빈계획, 삭제: ['XQ-FN-900'] }, 기준)).toEqual([]);
    expect(삭제막힘({ ...빈계획, 삭제: ['XQ-FN-900'] })).toContain('main 의 프로시저 파일에 없다');
    expect(삭제막힘(빈계획)).toBeNull();
  });
});

describe('원장과남은번호 — 삭제 작성', () => {
  let 폴더 = '';
  beforeEach(() => { 폴더 = mkdtempSync(join(tmpdir(), 'apply-proc-')); });
  afterEach(() => rmSync(폴더, { recursive: true, force: true }));

  const 깃 = (인자: string[]) => {
    if (인자[0] === 'ls-tree') return { ok: true, 낸것: 'docs/cases/XQ.md\0tests/xq/XQ-TP-001.spec.ts\0' };
    return { ok: true, 낸것: 인자[1]!.endsWith('.md') ? main표 : 프로시저 };
  };
  const items = [항목(1, '본문을 쓴다'), 항목(2, '글을 고친다'), 항목(3, '글을 올린다')];
  const 부르기 = (삭제: string[] | null) =>
    원장과남은번호({ 계획: [], 자료폴더: 폴더, 깃, 기준: 'abc', 서비스: 'XQ', 폴더: 'xq', 이어작성원본: null, 지금: items, 옮긴다: false, 반영: { 지금판: 1, 기준판: { version: 1, items }, 삭제 } });

  it('계획에 지울 케이스와 그 프로시저만 싣는다 — 다시 씀 · 새 항목 · 지움은 없다', () => {
    const r = 부르기(['XQ-FN-102']);
    if ('막힘' in r) throw new Error(r.막힘);
    expect(r.반영?.계획).toEqual({ ...빈계획, 삭제: ['XQ-FN-102'], 프로시저: [{ 파일: 'tests/xq/XQ-TP-001.spec.ts', procId: 'XQ-TP-001', 케이스: ['XQ-FN-101', 'XQ-FN-102', 'XQ-FN-103'], 고칠: [], 지울: ['XQ-FN-102'] }] });
    expect(JSON.parse(readFileSync(join(폴더, 'apply.json'), 'utf8'))).toEqual(r.반영?.계획);
  });

  it('지운 케이스만 덮던 요구는 빠짐이 아니다 — 자식의 원장 사본에도 같은 번호가 실린다', () => {
    const r = 부르기(['XQ-FN-102']);
    if ('막힘' in r) throw new Error(r.막힘);
    const 뒤 = main표.replace('| XQ-FN-102 |', '| 제거함(XQ-FN-102) |');
    const 판정 = 원장판정(r.원장, 뒤, new Set(['XQ-FN-101', 'XQ-FN-103']), { ...r.기준, 칸재료: null });
    if (!('대조' in 판정)) throw new Error('대조가 없다');
    expect([판정.대조.빠짐, 판정.대조.제외번호.get('XQ-REQ-002')]).toEqual([[], '사람이 뺌']);
    expect((JSON.parse(readFileSync(join(폴더, 'ledger.json'), 'utf8')) as { 제거함: string[] }).제거함).toEqual(['XQ-REQ-002']);
  });

  it('지울 케이스가 main 에 없거나 칸 모양이 틀리면 자식을 안 띄운다', () => {
    expect(부르기(['XQ-FN-900'])).toEqual({ 막힘: expect.stringContaining('XQ-FN-900') as unknown });
    expect(부르기(null)).toEqual({ 막힘: expect.stringContaining('params.procDelete') as unknown });
  });
});

describe('프롬프트 · PR 머리 줄', () => {
  const 계획: 반영계획 = { ...빈계획, 삭제: ['XQ-FN-102'], 프로시저: [{ ...기준[0]!, 고칠: [], 지울: ['XQ-FN-102'] }] };
  let 트리 = '';
  beforeEach(() => {
    트리 = mkdtempSync(join(tmpdir(), 'apply-proc-tree-'));
    mkdirSync(join(트리, 'tests', 'xq'), { recursive: true });
  });
  afterEach(() => rmSync(트리, { recursive: true, force: true }));
  const 쓰기 = (글: string) => writeFileSync(join(트리, 'tests', 'xq', 'XQ-TP-001.spec.ts'), 글);

  it('반영 절이 지울 케이스 · 프로시저 · 참고 절을 짚고 「PRD 관리」 반영이라고 하지 않는다', () => {
    const 글 = 반영절({ 계획, 사본: '/w/자료/apply.json' }).join('\n');
    expect(글).toContain('케이스 1건을 지운다(XQ-FN-102)');
    expect(글).toContain('XQ-TP-001');
    expect(글).toContain('apply.md §8');
    expect(글).toContain('PLATFORM_ACCOUNTS');
    expect(글).not.toContain('PRD 관리');
  });

  it('보통 반영은 닿는 프로시저가 있을 때만 그 줄을 싣는다', () => {
    expect(반영절({ 계획: { ...빈계획, 프로시저: [{ ...기준[0]!, 고칠: ['XQ-FN-101'], 지울: [] }] }, 사본: '/w/apply.json' }).join('\n')).toContain('통째로 다시 쓰고');
    expect(반영절({ 계획: 빈계획, 사본: '/w/apply.json' }).join('\n')).not.toContain('프로시저');
  });

  it('지울 케이스만 빠졌으면 경고가 없고, 지울 것이 남거나 남길 것이 사라지면 경고한다', () => {
    const 머리 = '프로시저 안 케이스 삭제: 1건(XQ-FN-102) · 프로시저 XQ-TP-001';
    쓰기(프로시저글(구간('본문없음', '본문없음 확인') + 구간('게시확인', '게시확인 확인'), { cases: '[본문없음, 게시확인]', 선언들: 선언('본문없음', 'XQ-FN-101') + 선언('게시확인', 'XQ-FN-103') }));
    expect(반영뒤줄(계획, 트리, 'xq')).toEqual([머리]);
    쓰기(프로시저);
    expect(반영뒤줄(계획, 트리, 'xq')).toEqual([머리, '⚠️ 지울 케이스가 남음 1 — XQ-FN-102']);
    rmSync(join(트리, 'tests', 'xq', 'XQ-TP-001.spec.ts'));
    expect(반영뒤줄(계획, 트리, 'xq')).toEqual([머리, '⚠️ 남길 케이스가 사라짐 2 — XQ-FN-101 · XQ-FN-103']);
  });

  it('보통 반영의 지울 케이스도 프로시저 파일 안에서 찾는다', () => {
    쓰기(프로시저);
    expect(반영뒤줄({ ...빈계획, 지움: [{ 번호: 'XQ-REQ-002', 지울케이스: ['XQ-FN-102'], 남길케이스: [] }] }, 트리, 'xq')[1]).toContain('XQ-FN-102');
  });

  it('자식이 심은 링크는 따라가지 않는다', () => {
    const 밖 = join(트리, 'outside.ts');
    writeFileSync(밖, 프로시저);
    symlinkSync(밖, join(트리, 'tests', 'xq', 'XQ-TP-009.spec.ts'));
    expect([...트리케이스들(트리, 'xq')]).toEqual([]);
  });
});

describe('기대값 고치기 — 프로시저 파일', () => {
  const 기대칸 = (이: string, tcId: string, 값: string) => 선언(이, tcId).replace('expected: null', `expected: z.object({ 문구: z.string().describe('문구').default('${값}') })`);
  const 글 = 프로시저글(구간('본문없음', '본문없음 확인') + 구간('글자수초과', '글자수초과 확인'), { cases: '[본문없음, 글자수초과]', 선언들: 기대칸('본문없음', 'XQ-FN-101', '하나') + 기대칸('글자수초과', 'XQ-FN-102', '둘') });
  const 경로 = 'tests/xq/XQ-TP-001.spec.ts';

  it('그 번호의 선언만 고치고 같은 파일의 다른 케이스는 그대로다', () => {
    const r = 편집계산([{ 경로, 글 }], null, [{ tcId: 'XQ-FN-102', expected: { 문구: '새 둘' } }]);
    if ('사유' in r) throw new Error(r.사유);
    expect(r.줄들).toEqual(["- XQ-FN-102 기대값 문구: '둘' → '새 둘'"]);
    expect(r.쓰기.get(경로)).toBe(글.replace("'둘'", "'새 둘'"));
  });

  it('한 파일의 두 케이스를 같이 고쳐도 둘 다 든다', () => {
    const r = 편집계산([{ 경로, 글 }], null, [{ tcId: 'XQ-FN-102', expected: { 문구: '새 둘' } }, { tcId: 'XQ-FN-101', expected: { 문구: '새 하나' } }]);
    if ('사유' in r) throw new Error(r.사유);
    expect(r.쓰기.get(경로)).toBe(글.replace("'둘'", "'새 둘'").replace("'하나'", "'새 하나'"));
  });

  it('프로시저 안 케이스의 삭제는 파일째 지우지 않고 사유를 낸다', () => {
    expect(편집계산([{ 경로, 글 }], null, [{ tcId: 'XQ-FN-101', delete: true }])).toEqual({ 사유: expect.stringContaining('프로시저 안 케이스') as unknown });
  });
});
