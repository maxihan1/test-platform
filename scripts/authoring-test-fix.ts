// BTS 「테스트 수정」 작성의 다시 돌린 횟수 · 고친 곳 한 줄 · 자동 병합 판정 · 끝내기 result.testFix 를 만든다 (도메인/BTS §3.12 「테스트 수정 바퀴」 2 · 3 · §7)
// 앞 판은 자식이 적은 종료 코드(EXIT 0)를 횟수로 읽어 「다시 돌림 0」이 「3번 돌려 보기」와 어긋났다(2026-11-11 실측 PR #713) — 횟수는 기록에서 센다

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import ts from 'typescript';

import { 테스트고침읽기 } from './authoring-apply.js';
import { 바뀐것 } from './authoring-base-list.js';
import { type 돌린판, 끝기록꼴, 돌린기록들, 판들읽기 } from './authoring-gate3.js';
import type { 보고손 } from './authoring-io.js';
import { 사유거르기 } from './authoring-reverse.js';
import { 흐름풀기 } from './authoring-usage.js';

const 기기이름: Record<string, string> = { desktop: 'PC', mobile: '휴대폰', android: '폰' };

export interface 다시돌림 {
  /** 고친 케이스 · 기기마다 마지막 전체 돌려 보기에서 돈 횟수 가운데 가장 작은 것. 기록이 없으면 0 */
  횟수: number;
  /** 기기마다 가장 작은 횟수 — 「PC 3 · 휴대폰 3」 */
  기기: [string, number][];
}

/** 고친 케이스 파일(`<폴더>/<tcId>.spec.ts`)이 마지막 전체 돌려 보기에서 기기마다 몇 번 돌았나 — 기기마다 가장 늦은 기록으로 센다 */
export function 다시돌림세기(결과폴더: string, tcIds: readonly string[]): 다시돌림 {
  const 이름들 = new Set(tcIds.map((t) => `${t}.spec.ts`));
  const 판들 = 판들읽기(돌린기록들(결과폴더, 끝기록꼴), true)?.판들 ?? new Map<string, 돌린판[]>();
  const 기기 = new Map<string, number>();
  for (const [열쇠, 판목록] of 판들) {
    const [파일, 이름] = 열쇠.split('\0') as [string, string];
    if (!이름들.has(파일.split('/').pop() ?? '') || 판목록.length === 0) continue;
    const 늦은 = 판목록.reduce((a, b) => (b.시작 > a.시작 ? b : a));
    기기.set(이름, Math.min(기기.get(이름) ?? Infinity, 늦은.상태들.length));
  }
  const 줄 = [...기기].sort(([a], [b]) => a.localeCompare(b));
  return { 횟수: 줄.length === 0 ? 0 : Math.min(...줄.map(([, n]) => n)), 기기: 줄 };
}

/** PR 본문 「테스트 고침」 줄의 횟수 칸 */
export function 다시돌림글(돌림: 다시돌림): string {
  if (돌림.기기.length === 0) return '다시 돌림 0번(마지막 전체 돌려 보기 기록 없음)';
  return `다시 돌림 ${String(돌림.횟수)}번(${돌림.기기.map(([k, n]) => `${기기이름[k] ?? k} ${String(n)}`).join(' · ')})`;
}

const 요약상한 = 500;

/** 자식 결과 요약의 `테스트 고침: BTS <키> · … · 고친 곳 <한 줄>` 들에서 고친 곳만 — 이슈 댓글에 실린다(tpx-author apply.md §7). 목록 기호 · 들여쓰기로 적어도 읽는다 */
export function 고친곳읽기(자식출력: string): string {
  const 곳들 = [...자식출력.matchAll(/^[\s>*-]*테스트 고침: BTS .*?· 고친 곳:?\s*(.+)$/gm)].map((m) => m[1]!.trim()).filter((t) => t !== '');
  return 곳들.join(' · ').slice(0, 요약상한);
}

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

/**
 * 케이스 파일의 판정 — verify 문장 수와 기대값 칸들(verify 셋째 · verify.element 넷째 · verify.rates 셋째와 허용 오차, 그리고 실제 값 칸 안의 견주는 값), defineCase 의 expected.
 * defineCase 가 없으면 못 읽은 것이다
 */
export function 판정읽기(글: string): { 수: number; 기대값: string[]; expected: string } | null {
  const sf = ts.createSourceFile('case.ts', 글, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let 수 = 0;
  let expected: string | null = null;
  const 기대값: string[] = [];
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const e = n.expression;
      const 칸 = ts.isIdentifier(e) && e.text === 'verify' ? [2] : ts.isPropertyAccessExpression(e) && ts.isIdentifier(e.expression) && e.expression.text === 'verify' ? { element: [3], rates: [2, 3] }[e.name.text] : undefined;
      if (칸 !== undefined) {
        수 += 1;
        기대값.push(칸.map((i) => (n.arguments[i] === undefined ? '' : 꼴풀기(n.arguments[i]!, sf))).join(' ⟂ '), ...견주는값들(n.arguments[칸[0]! - 1], sf));
      }
      if (ts.isIdentifier(e) && e.text === 'defineCase' && n.arguments[0] !== undefined && ts.isObjectLiteralExpression(n.arguments[0])) {
        const 칸값 = n.arguments[0].properties.find((p) => ts.isPropertyAssignment(p) && p.name.getText(sf) === 'expected');
        expected = 칸값 === undefined ? '' : 꼴풀기((칸값 as ts.PropertyAssignment).initializer, sf);
      }
    }
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  return expected === null ? null : { 수, 기대값, expected };
}

/** 자식 결과 요약의 `테스트 고침 고장 내 보기: <tcId> · 고장 <N> · 그 자리 빨강 <M>` — 같은 케이스가 여럿이면 마지막 줄(tpx-author apply.md §7) */
export function 고장줄읽기(자식출력: string, tcId: string): { 고장: number; 빨강: number } | undefined {
  let 찾은: { 고장: number; 빨강: number } | undefined;
  for (const m of 자식출력.matchAll(/^[\s>*-]*테스트 고침 고장 내 보기:\s*(\S+)\s*·\s*고장\s*(\d+)\s*·\s*그 자리 빨강\s*(\d+)/gm)) if (m[1] === tcId) 찾은 = { 고장: Number(m[2]), 빨강: Number(m[3]) };
  return 찾은;
}

/**
 * 자동 병합 세 조건(도메인/BTS §3.12 「테스트 수정 바퀴」 3) — 걸린 까닭들. 비면 자동 병합한다.
 * 기대값은 고치기 전 것이 하나도 빠지거나 바뀌지 않아야 한다(확인을 더한 것은 괜찮다) · 확인 문장 수는 줄지 않아야 한다 ·
 * 고장 내 보기는 고장을 하나 이상 내 그 자리 문장이 다 빨개졌어야 한다. 고치기 전 · 뒤 파일이나 고장 줄이 없거나 빨강이 고장보다 많으면(숫자가 틀림) 「재지 못함」.
 * 고친 케이스 파일 말고 다른 테스트 파일(다른 케이스 · 화면 부품)도 바뀌었으면(`바뀐` — tests 아래 바뀐 파일 · 못 읽었으면 null) 그것은 재지 않으므로 「재지 못함」
 */
export function 자동병합재기(건들: readonly { tcId: string; 앞: string | null; 뒤: string | null }[], 자식출력: string, 바뀐: readonly string[] | null): 걸린까닭[] {
  const 걸림 = new Set<걸린까닭>();
  if (바뀐 === null || 바뀐.some((f) => !건들.some((건) => f.endsWith(`/${건.tcId}.spec.ts`)))) 걸림.add('NOT_MEASURED');
  for (const 건 of 건들) {
    const 앞 = 건.앞 === null ? null : 판정읽기(건.앞);
    const 뒤 = 건.뒤 === null ? null : 판정읽기(건.뒤);
    if (앞 === null || 뒤 === null) 걸림.add('NOT_MEASURED');
    else {
      const 남은 = [...뒤.기대값];
      const 다있나 = 앞.기대값.every((v) => {
        const i = 남은.indexOf(v);
        return i >= 0 && 남은.splice(i, 1).length === 1;
      });
      if (!다있나 || 앞.expected !== 뒤.expected) 걸림.add('EXPECTED_CHANGED');
      if (뒤.수 < 앞.수) 걸림.add('VERIFY_FEWER');
    }
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
 * 고친 케이스 파일의 고치기 전 · 뒤 글. 고치기 전은 에이전트가 자료 폴더에 둔 기준 tests 목록(`git ls-tree -r -z <기준>`)의 blob 을 읽는다 — 자식이 커밋을 바꿔도 기준은 그대로다.
 * 케이스 파일은 `tests/<폴더>/<tcId>.spec.ts` 다. 없으면 null
 */
export function 고치기전후(기준목록글: string, 트리: string, 깃: (인자: string[]) => { ok: boolean; 낸것: string }, tcId: string): { 앞: string | null; 뒤: string | null } {
  const 항목 = 기준목록글.split('\0').find((x) => x.endsWith(`/${tcId}.spec.ts`) && x.includes('\ttests/'));
  const [머리, 길] = 항목 === undefined ? [] : 항목.split('\t');
  const sha = 머리?.split(' ')[2];
  const 앞 = sha === undefined ? null : 깃(['cat-file', 'blob', sha]);
  const 뒤길 = 길 === undefined ? null : join(트리, 길);
  return { 앞: 앞?.ok === true ? 앞.낸것 : null, 뒤: 뒤길 !== null && existsSync(뒤길) ? readFileSync(뒤길, 'utf8') : null };
}

/**
 * 「테스트 수정」 고침 줄이 DONE 으로 끝나면 result.testFix { summary, reruns, autoMerge, held } 를 싣는다. 다른 줄 · 다른 끝은 그대로다.
 * 고친 곳은 자식이 쓴 글이라 테스트 계정 비밀번호가 섞였으면 싣지 않는다 — 서버가 실패 실행의 비밀값으로 한 번 더 가린다
 */
export function 테스트고침싣는손(
  손: 보고손,
  것: { params?: unknown },
  재료: () => {
    자식출력: string;
    결과폴더: string;
    비밀: readonly string[];
    파일: (tcId: string) => { 앞: string | null; 뒤: string | null };
    바뀐: () => readonly string[] | null;
  },
): 보고손 {
  return {
    ...손,
    끝내기: (몸) => {
      const 고침 = 테스트고침읽기(것);
      if (몸.status !== 'DONE' || 고침 === null || 고침 === undefined) return 손.끝내기(몸);
      const { 자식출력, 결과폴더, 비밀, 파일, 바뀐 } = 재료();
      const 곳 = 고친곳읽기(자식출력);
      const summary = 사유거르기(곳, 비밀) === 곳 ? 곳 : '';
      const 결과 = typeof 몸.result === 'object' && 몸.result !== null ? (몸.result as Record<string, unknown>) : {};
      const tcIds = [...new Set(고침.cases.map((x) => x.tcId))];
      const reruns = 다시돌림세기(결과폴더, tcIds).횟수;
      const held = 자동병합재기(tcIds.map((tcId) => ({ tcId, ...파일(tcId) })), 자식출력, 바뀐());
      return 손.끝내기({ ...몸, result: { ...결과, testFix: { summary, reruns, autoMerge: held.length === 0, held } } });
    },
  };
}

/** 되물을 때 막는 도구 — 파일 고치기 · 명령 실행 · 보조 AI. 검사가 끝난 케이스를 요약 받는 사이에 바꾸지 못하게 */
const 되묻기막을것 = ['Edit', 'Write', 'MultiEdit', 'NotebookEdit', 'Bash', 'Task', 'Agent'];

/** 같은 자식 세션을 이어 부르는 claude 인자 — `--resume` 과 막을 도구를 `--disallowedTools` 자리에 끼운다(가변 인자라 그 자리가 아니면 뒤 것을 삼킨다) */
export function 되묻기인자(인자: readonly string[], 세션: string): string[] {
  const 자리 = 인자.indexOf('--disallowedTools');
  if (자리 < 0) throw new Error('클로드인자에 --disallowedTools 가 없어 되물을 깃발을 끼울 자리가 없다');
  return [...인자.slice(0, 자리), '--resume', 세션, '--disallowedTools', ...되묻기막을것, ...인자.slice(자리 + 1)];
}

/** 빠진 케이스를 짚어 결과 요약만 다시 달라는 말 — 다시 하지 말고 이미 한 일로 적게 한다. 안 했으면 고장 0 이라 「못 잡은 고장」으로 사람에게 간다 */
export function 되묻기글(빠진: readonly string[]): string {
  return [
    '결과 요약 없이 끝났거나 `테스트 고침 고장 내 보기` 줄이 빠졌어요. 파일을 고치거나 명령을 다시 돌리지 말고, 이미 한 일로 결과 요약만 처음부터 다시 적어 주세요.',
    `고친 케이스마다 \`테스트 고침 고장 내 보기: <tcId> · 고장 <N> · 그 자리 빨강 <M>\` 한 줄을 꼭 넣어요(빠진 케이스: ${빠진.join(' · ')}). 고장 내 보기를 하지 않았으면 고장 0 으로 적어요.`,
  ].join('\n');
}

/**
 * 테스트 고침 자식이 결과 요약을 빠뜨리고 끝났으면(고장 내 보기 줄이 없는 케이스가 있으면) 같은 세션을 한 번 이어 불러 요약만 다시 받는다 —
 * BTS-F10-09 시험(MQA-169 · PR #732)에서 자식이 「[단계] 결과 요약」 표지만 찍고 끝나 자동 반영이 「재지 못함」이었다 (도메인/BTS §3.12 「테스트 수정 바퀴」 3).
 * 돌려준 글을 자식 글 뒤에 붙인다. 되묻지 않았으면 빈 글. 그래도 줄이 없으면 판정이 「재지 못함」 그대로다
 */
export async function 요약되받기(
  것: { params?: unknown },
  자식글: string,
  세션: string | undefined,
  부르기: (인자고치기: (인자: readonly string[]) => string[], 글: string) => Promise<string>,
): Promise<string> {
  const 고침 = 테스트고침읽기(것);
  if (고침 === null || 고침 === undefined || 세션 === undefined) return '';
  const 빠진 = [...new Set(고침.cases.map((x) => x.tcId))].filter((tcId) => 고장줄읽기(자식글, tcId) === undefined);
  if (빠진.length === 0) return '';
  return 흐름풀기(await 부르기((인자) => 되묻기인자(인자, 세션), 되묻기글(빠진))).글;
}
