// 테스트 고침의 자동 병합 판정 재기 — 고치기 전 · 뒤 케이스의 기대값 · 확인 문장 수와 고장 내 보기 줄 (도메인/BTS §3.12 「테스트 수정 바퀴」 3 · 게임 §3.10 「실패 자동 수정」 4)
// 재는 단위는 케이스다 — 프로시저 파일은 케이스마다 조각으로 잰다 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「수정 AI」)

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import type { 기준프로시저 } from './authoring-apply-proc.js';
import { 바뀐것 } from './authoring-base-list.js';
import { 프로시저값읽기 } from './authoring-proc-pieces.js';

export type 걸린까닭 = 'EXPECTED_CHANGED' | 'VERIFY_FEWER' | 'MUTATION_MISSED' | 'NOT_MEASURED';

/** 기대값 칸을 꼴만 다르게 쓴 것(줄바꿈 · 주석 · 끝 쉼표)은 같은 값으로 본다 — 낱말로 끊어 견주므로 글자 안의 쉼표 · 빈칸은 그대로다 */
function 꼴풀기(n: ts.Node, sf: ts.SourceFile): string {
  const 훑개 = ts.createScanner(ts.ScriptTarget.Latest, true, ts.LanguageVariant.Standard, n.getText(sf));
  const 낱: string[] = [];
  for (let t = 훑개.scan(); t !== ts.SyntaxKind.EndOfFileToken; t = 훑개.scan()) 낱.push(훑개.getTokenText());
  return 낱.filter((x, i) => !(x === ',' && [']', '}', ')'].includes(낱[i + 1] ?? ''))).join(' ');
}

/** 화면 요소 찾기 · 누르기 같은 부르기의 인자(옵션 객체 칸 포함)인 글자 · 숫자 — 기대값이 아니라 요소 주소 · 데이터라 고쳐도 된다 */
function 부르기인자인가(n: ts.Node): boolean {
  let p = n.parent;
  if (ts.isPropertyAssignment(p) && ts.isObjectLiteralExpression(p.parent)) p = p.parent.parent;
  return ts.isCallExpression(p) || ts.isNewExpression(p);
}

/** 실제 값 칸(둘째 인자) 안에서 견주는 값 — `합계 === 300` · `slot === 'Weapon'` 처럼 기대값을 실제 값 쪽에 쓴 케이스가 있다 */
function 견주는값들(n: ts.Node | undefined, sf: ts.SourceFile): string[] {
  const 값: string[] = [];
  const 훑기 = (x: ts.Node): void => {
    if ((ts.isStringLiteralLike(x) || ts.isNumericLiteral(x)) && !부르기인자인가(x)) 값.push(`값 ${꼴풀기(x, sf)}`);
    ts.forEachChild(x, 훑기);
  };
  if (n !== undefined) 훑기(n);
  return 값;
}

/** 부르기 이름 — `waitFor(…)` · `game.waitFor(…)` 둘 다 */
const 부른이름 = (e: ts.Expression): string | undefined => (ts.isIdentifier(e) ? e.text : ts.isPropertyAccessExpression(e) ? e.name.text : undefined);

/** 옵션 객체 인자의 칸 하나 — 객체가 아니거나 칸이 없으면 undefined */
function 옵션칸(n: ts.Node | undefined, 이름: string): ts.Expression | undefined {
  if (n === undefined || !ts.isObjectLiteralExpression(n)) return undefined;
  const 칸 = n.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) && p.name.text === 이름);
  return 칸?.initializer;
}

/**
 * 게임 케이스의 기다리는 값 — `waitFor` 의 text · `waitForValue` 의 값 · `repeatUntil` 의 goal. 그 값이 될 때까지 기다리는 문장이 확인 노릇을 해서 기대값처럼 잰다.
 * 얼마나 기다리나(timeoutMs · stallMs)와 무엇을 기다리나(주소)는 고쳐도 된다 (도메인/게임 §3.10 「실패 자동 수정」 3 의 4 · 4)
 */
function 기다리는값(n: ts.CallExpression, sf: ts.SourceFile): string | undefined {
  const 이름 = 부른이름(n.expression);
  const 값 = 이름 === 'waitFor' ? 옵션칸(n.arguments[1], 'text') : 이름 === 'waitForValue' ? n.arguments[2] : 이름 === 'repeatUntil' ? 옵션칸(n.arguments[1], 'goal') : undefined;
  return 값 === undefined ? undefined : `기다림 ${이름 ?? ''} ${꼴풀기(값, sf)}`;
}

/**
 * 케이스 파일의 판정 — verify 문장 수와 기대값 칸들(verify 셋째 · verify.element 넷째 · verify.rates 셋째와 허용 오차, 그리고 실제 값 칸 안의 견주는 값), 게임 케이스의 기다리는 값, defineCase 의 expected.
 * 보류(held)는 켜면 그 케이스가 안 돈다 — 값이 바뀌었는지 보려고 글을 담는다. defineCase 가 없으면 못 읽은 것이다
 */
export function 판정읽기(글: string): { 수: number; 기대값: string[]; expected: string; 보류: string } | null {
  const sf = ts.createSourceFile('case.ts', 글, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let 수 = 0;
  // 프로시저 파일은 선언이 여럿이고 한 문에 둘을 적을 수도 있다 — 마지막 것만 담으면 앞 선언이 바뀐 것을 못 본다
  const expected: string[] = [];
  const 보류: string[] = [];
  const 기대값: string[] = [];
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const 기다림 = 기다리는값(n, sf);
      if (기다림 !== undefined) 기대값.push(기다림);
      const e = n.expression;
      const 칸 = ts.isIdentifier(e) && e.text === 'verify' ? [2] : ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'verify' ? { element: [3], rates: [2, 3], log: [2] }[e.name.text] : undefined;
      if (칸 !== undefined) {
        수 += 1;
        기대값.push(칸.map((i) => (n.arguments[i] === undefined ? '' : 꼴풀기(n.arguments[i]!, sf))).join(' ⟂ '), ...견주는값들(n.arguments[칸[0]! - 1], sf));
      }
      if (ts.isIdentifier(e) && e.text === 'defineCase' && n.arguments[0] !== undefined && ts.isObjectLiteralExpression(n.arguments[0])) {
        const 인자 = n.arguments[0];
        const 칸글 = (이름: string): string => {
          const 칸값 = 옵션칸(인자, 이름);
          return 칸값 === undefined ? '' : 꼴풀기(칸값, sf);
        };
        expected.push(칸글('expected'));
        보류.push(칸글('held'));
      }
    }
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  return expected.length === 0 ? null : { 수, 기대값, expected: expected.join(' ⟂ '), 보류: 보류.join(' ⟂ ') };
}

/** 자식 결과 요약의 `테스트 고침 고장 내 보기: <tcId> · 고장 <N> · 그 자리 빨강 <M>` — 같은 케이스가 여럿이면 마지막 줄(tpx-author apply.md §7) */
export function 고장줄읽기(자식출력: string, tcId: string): { 고장: number; 빨강: number } | undefined {
  let 찾은: { 고장: number; 빨강: number } | undefined;
  for (const m of 자식출력.matchAll(/^[\s>*-]*테스트 고침 고장 내 보기:\s*(\S+)\s*·\s*고장\s*(\d+)\s*·\s*그 자리 빨강\s*(\d+)/gm)) if (m[1] === tcId) 찾은 = { 고장: Number(m[2]), 빨강: Number(m[3]) };
  return 찾은;
}

/** 고친 케이스 하나 — 그 케이스가 든 파일의 고치기 전 · 뒤 글 */
export interface 잴건 {
  tcId: string;
  앞: string | null;
  뒤: string | null;
  /** 프로시저 안 케이스만 — 그 프로시저 파일(저장소 기준 경로) */
  파일?: string;
}

/** 글 둘의 판정을 견준다 — 고치기 전 기대값이 하나도 빠지거나 바뀌지 않았나(더한 것은 괜찮다) · 확인 문장이 줄지 않았나 · 보류를 켜거나 끄지 않았나 */
function 판정견주기(앞글: string | null, 뒤글: string | null): 걸린까닭[] {
  const 앞 = 앞글 === null ? null : 판정읽기(앞글);
  const 뒤 = 뒤글 === null ? null : 판정읽기(뒤글);
  // 보류를 켜면 그 케이스를 건너뛰어 앞을 막던 케이스를 꺼 버릴 수 있다 — 사람이 본다
  if (앞 === null || 뒤 === null || 앞.보류 !== 뒤.보류) return ['NOT_MEASURED'];
  const 남은 = [...뒤.기대값];
  const 다있나 = 앞.기대값.every((v) => {
    const i = 남은.indexOf(v);
    return i >= 0 && 남은.splice(i, 1).length === 1;
  });
  return [...(!다있나 || 앞.expected !== 뒤.expected ? (['EXPECTED_CHANGED'] as const) : []), ...(뒤.수 < 앞.수 ? (['VERIFY_FEWER'] as const) : [])];
}

/**
 * 파일 하나를 잰다. 프로시저 파일은 케이스마다 — 파일 하나를 고치므로 고치지 않은 케이스의 구간도 같이 바뀔 수 있고, 확인을 다른 케이스 구간으로 옮긴 것은 파일 전체로는 안 보인다.
 * 파일 전체도 한 번 더 본다 — 어느 케이스 것도 아닌 자리(정리 · 파일 안 도우미 함수)의 확인 · 기다리는 값이다.
 * `cases` 의 케이스나 차례가 바뀌었거나 구간을 못 갈랐으면 「재지 못함」
 */
function 파일재기(앞글: string | null, 뒤글: string | null): 걸린까닭[] {
  const 앞 = 앞글 === null ? null : 프로시저값읽기(앞글);
  const 뒤 = 뒤글 === null ? null : 프로시저값읽기(뒤글);
  if (앞 === null && 뒤 === null) return 판정견주기(앞글, 뒤글);
  if (앞 === null || 뒤 === null || 앞.케이스.join() !== 뒤.케이스.join() || [...앞.조각, ...뒤.조각].some((c) => c.프로시저?.갈림 !== true)) return ['NOT_MEASURED'];
  return [...앞.조각.flatMap((c, i) => 판정견주기(c.글, 뒤.조각[i]!.글)), ...판정견주기(앞글, 뒤글)];
}

/**
 * 자동 병합 세 조건(도메인/BTS §3.12 「테스트 수정 바퀴」 3) — 걸린 까닭들. 비면 자동 병합한다.
 * 기대값 · 확인 문장 수는 고친 케이스가 든 파일에서 잰다(프로시저면 같은 프로시저의 다른 케이스까지) ·
 * 고장 내 보기는 고친 케이스마다 고장을 하나 이상 내 그 자리 문장이 다 빨개졌어야 한다. 고치기 전 · 뒤 파일이나 고장 줄이 없거나 빨강이 고장보다 많으면(숫자가 틀림) 「재지 못함」.
 * 고친 케이스가 든 파일 말고 다른 테스트 파일(다른 케이스 · 화면 부품)도 바뀌었으면(`바뀐` — tests 아래 바뀐 파일 · 못 읽었으면 null) 그것은 재지 않으므로 「재지 못함」
 */
export function 자동병합재기(건들: readonly 잴건[], 자식출력: string, 바뀐: readonly string[] | null): 걸린까닭[] {
  const 걸림 = new Set<걸린까닭>();
  const 고친것 = (f: string) => 건들.some((건) => (건.파일 === undefined ? f.endsWith(`/${건.tcId}.spec.ts`) : f === 건.파일));
  if (바뀐 === null || !바뀐.every(고친것)) 걸림.add('NOT_MEASURED');
  for (const 건 of 건들) {
    for (const 까닭 of 파일재기(건.앞, 건.뒤)) 걸림.add(까닭);
    const 고장 = 고장줄읽기(자식출력, 건.tcId);
    if (고장 === undefined || 고장.빨강 > 고장.고장) 걸림.add('NOT_MEASURED');
    else if (고장.고장 < 1 || 고장.빨강 < 고장.고장) 걸림.add('MUTATION_MISSED');
  }
  return [...걸림].sort();
}

/** 기준과 견줘 바뀐 tests 아래 파일들 — 못 읽었으면 null */
export function 고친테스트파일들(트리: string, 기준목록경로: string): string[] | null {
  const r = 바뀐것(트리, 기준목록경로);
  return Array.isArray(r) ? r : null;
}

/**
 * 고친 케이스가 든 파일의 고치기 전 · 뒤 글. 고치기 전은 에이전트가 자료 폴더에 둔 기준 tests 목록(`git ls-tree -r -z <기준>`)의 blob 을 읽는다 — 자식이 커밋을 바꿔도 기준은 그대로다.
 * 옛 꼴 케이스 파일은 `tests/<폴더>/<tcId>.spec.ts`, 프로시저 안 케이스는 기준 판에서 그 케이스가 든 프로시저 파일이다. 없으면 null
 */
export function 고치기전후(기준목록글: string, 트리: string, 깃: (인자: string[]) => { ok: boolean; 낸것: string }, tcId: string, 프로시저들: readonly 기준프로시저[] = []): Omit<잴건, 'tcId'> {
  const 파일 = 프로시저들.find((p) => p.케이스.includes(tcId))?.파일;
  const 항목 = 기준목록글.split('\0').find((x) => (파일 === undefined ? x.endsWith(`/${tcId}.spec.ts`) && x.includes('\ttests/') : x.endsWith(`\t${파일}`)));
  const [머리, 길] = 항목 === undefined ? [] : 항목.split('\t');
  const sha = 머리?.split(' ')[2];
  const 앞 = sha === undefined ? null : 깃(['cat-file', 'blob', sha]);
  const 뒤길 = 길 === undefined ? null : join(트리, 길);
  return { 앞: 앞?.ok === true ? 앞.낸것 : null, 뒤: 뒤길 !== null && existsSync(뒤길) ? readFileSync(뒤길, 'utf8') : null, ...(파일 === undefined ? {} : { 파일 }) };
}
