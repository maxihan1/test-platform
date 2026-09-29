// 반영 때 보류 케이스에 사람이 넣은 값을 적는 순수 함수 — .default(리터럴) · held 빼기 · 표 「제거함」 · 올리기 인자 (도메인/작성 §3.6 「★ 보류 케이스」)
// 껍데기(authoring-held-merge)가 부른다. 여기는 I/O 가 없다

import ts from 'typescript';

import { 올릴브랜치 } from './authoring-chain.js';
import type { 대상 } from './authoring-reverse.js';

export interface 보류입력 {
  params?: Record<string, unknown>;
  expected?: Record<string, unknown>;
  removed?: boolean;
}

export function 보류있나(held: unknown): held is Record<string, 보류입력> {
  return typeof held === 'object' && held !== null && !Array.isArray(held) && Object.keys(held).length > 0;
}

// 한글이 \uXXXX 로 바뀌면 사람이 PR 에서 값을 못 읽는다
const 인쇄기 = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed, neverAsciiEscape: true } as ts.PrinterOptions);

/** 값을 리터럴 노드로 만들어 인쇄한다 — 글자를 이어 붙이면 따옴표·줄바꿈이 코드를 깬다 */
function 리터럴(값: unknown, sf: ts.SourceFile): string | null {
  const f = ts.factory;
  let 노드: ts.Expression;
  if (typeof 값 === 'string') 노드 = f.createStringLiteral(값, true);
  else if (typeof 값 === 'boolean') 노드 = 값 ? f.createTrue() : f.createFalse();
  else if (typeof 값 === 'number' && Number.isFinite(값)) {
    const 수 = f.createNumericLiteral(Math.abs(값));
    노드 = 값 < 0 ? f.createPrefixUnaryExpression(ts.SyntaxKind.MinusToken, 수) : 수;
  } else return null;
  return 인쇄기.printNode(ts.EmitHint.Expression, 노드, sf);
}

function 이름(p: ts.ObjectLiteralElementLike): string | undefined {
  if (!ts.isPropertyAssignment(p)) return undefined;
  return ts.isIdentifier(p.name) || ts.isStringLiteral(p.name) ? p.name.text : undefined;
}

function 명세글(sf: ts.SourceFile): ts.ObjectLiteralExpression | undefined {
  let 찾음: ts.ObjectLiteralExpression | undefined;
  const 걷기 = (n: ts.Node): void => {
    if (찾음 !== undefined) return;
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'defineCase') {
      const 첫 = n.arguments[0];
      if (첫 !== undefined && ts.isObjectLiteralExpression(첫)) 찾음 = 첫;
      return;
    }
    n.forEachChild(걷기);
  };
  걷기(sf);
  return 찾음;
}

function 속성(글: ts.ObjectLiteralExpression, 키: string): ts.PropertyAssignment | undefined {
  return 글.properties.find((p): p is ts.PropertyAssignment => 이름(p) === 키);
}

/** `.메서드(...)` 사슬을 거슬러 올라가며 이름이 맞는 호출을 찾는다 */
function 사슬에서(식: ts.Expression, 메서드: string): ts.CallExpression | undefined {
  let n: ts.Expression = 식;
  while (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
    if (n.expression.name.text === 메서드) return n;
    n = n.expression.expression;
  }
  return undefined;
}

/** params·expected 의 `z.object({...})` 칸들 */
function 칸묶음(명세: ts.ObjectLiteralExpression, 쪽: 'params' | 'expected'): ts.ObjectLiteralExpression | undefined {
  const p = 속성(명세, 쪽);
  const 객체 = p === undefined ? undefined : 사슬에서(p.initializer, 'object');
  const 첫 = 객체?.arguments[0];
  return 첫 !== undefined && ts.isObjectLiteralExpression(첫) ? 첫 : undefined;
}

interface 고침 {
  시작: number;
  끝: number;
  글: string;
}

function 고치기(글: string, 고침들: 고침[]): string {
  return [...고침들].sort((a, b) => b.시작 - a.시작).reduce((acc, g) => acc.slice(0, g.시작) + g.글 + acc.slice(g.끝), 글);
}

function 읽기(글: string): ts.SourceFile {
  return ts.createSourceFile('case.ts', 글, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
}

/**
 * 채운 칸에 `.default(값)` 을 적고(있으면 그 값을 바꾼다) `held` 속성을 뺀다. `unconfirmed` 는 그대로 — 채워도 나머지는 화면 기준이다.
 * 다시 적어도 같은 글이 나온다 — 실패 뒤 다시 누른 반영이 겹쳐 쓰지 않는다
 */
export function 값적기(원문: string, 입력: Pick<보류입력, 'params' | 'expected'>): { 글: string } | { 사유: string } {
  const sf = 읽기(원문);
  const 명세 = 명세글(sf);
  if (명세 === undefined) return { 사유: 'defineCase({...}) 를 코드에서 못 찾았다' };
  const 고침들: 고침[] = [];
  for (const 쪽 of ['params', 'expected'] as const) {
    const 값들 = 입력[쪽] ?? {};
    if (Object.keys(값들).length === 0) continue;
    const 묶음 = 칸묶음(명세, 쪽);
    for (const [키, 값] of Object.entries(값들)) {
      const 칸 = 묶음 === undefined ? undefined : 속성(묶음, 키);
      if (칸 === undefined) return { 사유: `${쪽}.${키} 칸을 코드에서 못 찾았다` };
      const 찍은 = 리터럴(값, sf);
      if (찍은 === null) return { 사유: `${쪽}.${키} 값이 글자·수·참거짓이 아니다` };
      const 있던 = 사슬에서(칸.initializer, 'default')?.arguments[0];
      고침들.push(
        있던 === undefined
          ? { 시작: 칸.initializer.end, 끝: 칸.initializer.end, 글: `.default(${찍은})` }
          : { 시작: 있던.getStart(sf), 끝: 있던.end, 글: 찍은 },
      );
    }
  }
  const held = 속성(명세, 'held');
  if (held !== undefined) {
    // 앞 줄바꿈부터 뒤 쉼표까지 — 줄 하나가 통째로 빠진다
    const 쉼표 = /^\s*,/.exec(원문.slice(held.end));
    고침들.push({ 시작: held.getFullStart(), 끝: held.end + (쉼표?.[0].length ?? 0), 글: '' });
  }
  return { 글: 고치기(원문, 고침들) };
}

export function 보류남음(글: string): boolean {
  const 명세 = 명세글(읽기(글));
  return 명세 !== undefined && 속성(명세, 'held') !== undefined;
}

export function 케이스tcId(글: string): string | null {
  const 명세 = 명세글(읽기(글));
  const 값 = 명세 === undefined ? undefined : 속성(명세, 'tcId')?.initializer;
  return 값 !== undefined && ts.isStringLiteralLike(값) ? 값.text : null;
}

/** params 칸 가운데 `.meta({ secret: true })` 가 붙은 것 — 화면이 안 받고 반영 때 테스트 계정으로 채운다 */
export function 비밀칸들(글: string): string[] {
  const 명세 = 명세글(읽기(글));
  const 묶음 = 명세 === undefined ? undefined : 칸묶음(명세, 'params');
  return (묶음?.properties ?? []).flatMap((p) => {
    if (!ts.isPropertyAssignment(p)) return [];
    const 메타 = 사슬에서(p.initializer, 'meta')?.arguments[0];
    const 비밀 = 메타 !== undefined && ts.isObjectLiteralExpression(메타) ? 속성(메타, 'secret')?.initializer : undefined;
    const 키 = 이름(p);
    return 비밀?.kind === ts.SyntaxKind.TrueKeyword && 키 !== undefined ? [키] : [];
  });
}

/**
 * 3회 실행의 환경 — 러너와 같은 이름(PLATFORM_PARAMS · PLATFORM_BASE_URL)으로 넘긴다. 채운 값은 이미 코드의 기본값이라 비밀값만 싣는다.
 * ponytail: 칸 이름으로 아이디·비밀번호를 가른다. 대상 서버 줄에 계정이 하나라 그 밖의 비밀값은 받을 길이 없다(명세 「남는 한계」)
 */
export function 실행입력(t: 대상, 비밀칸: string[]): { PLATFORM_BASE_URL: string; PLATFORM_PARAMS: string } {
  const params = Object.fromEntries(
    비밀칸.map((키) => [키, /id$|user|email|account/i.test(키) && !/pass|pw/i.test(키) ? (t.loginId ?? '') : (t.loginPassword ?? '')]),
  );
  return { PLATFORM_BASE_URL: t.baseUrl ?? '', PLATFORM_PARAMS: JSON.stringify({ params, expected: {} }) };
}

/** 요구사항 표 줄에서 제거한 tcId 칸만 「제거함(<tcId>)」으로. 본문 글과 비슷한 번호는 안 건드린다 */
export function 표고치기(표: string, 제거: string[]): string {
  return 표
    .split('\n')
    .map((줄) => (줄.trimStart().startsWith('|') ? 제거.reduce((acc, id) => acc.split(`| ${id} |`).join(`| 제거함(${id}) |`), 줄) : 줄))
    .join('\n');
}

/** 반영 커밋에 붙이는 둘째 문단. 제목은 에이전트 커밋 모양 그대로라 이어하기·덮어쓰기 검사가 에이전트 것으로 읽는다 */
export const 반영표시 = '보류 값 반영';

export function 반영커밋인가(본문: string): boolean {
  return 본문.split('\n').some((줄) => 줄.trim() === 반영표시);
}

/** 읽은 머리일 때만 덮어쓴다 — 그 사이 누가 얹었으면 git 이 거절한다 (CLAUDE.md §5 예외 — 자기 author-<뿌리>) */
export function 반영푸시인자(뿌리: number, 옛머리: string): string[] {
  const 브랜치 = `refs/heads/${올릴브랜치(뿌리)}`;
  return ['push', `--force-with-lease=${브랜치}:${옛머리}`, 'origin', `HEAD:${브랜치}`];
}

/** push 뒤 다시 읽은 PR 머리. 옛 머리로 CI 를 기다리면 옛 커밋의 초록으로 병합한다 */
export function 새머리판정(옛: string, 올린: string, 지금: string): { sha: string } | { 아직: true } | { 사유: string } {
  if (지금 === 올린) return { sha: 올린 };
  if (지금 === 옛) return { 아직: true };
  return { 사유: `PR 머리(${지금.slice(0, 7)})가 올린 커밋(${올린.slice(0, 7)})이 아니다 — 누가 그 사이 얹었다. 병합하지 않는다` };
}

interface 보고묶음 {
  file?: string;
  specs?: { file?: string; tests?: { results?: { status?: string; error?: { message?: string } }[] }[] }[];
  suites?: 보고묶음[];
}

const 색글자 = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, 'g');

/** Playwright JSON 보고에서 파일마다 첫 실패 문장. 못 읽으면 null */
export function 실패문장들(낸것: string): string[] | null {
  let 보고: 보고묶음;
  try {
    보고 = JSON.parse(낸것.slice(낸것.indexOf('{'))) as 보고묶음;
  } catch {
    return null;
  }
  const 모음 = new Map<string, string>();
  const 걷기 = (s: 보고묶음): void => {
    for (const spec of s.specs ?? []) {
      for (const r of (spec.tests ?? []).flatMap((t) => t.results ?? [])) {
        if (r.status === 'passed' || r.status === 'skipped' || spec.file === undefined || 모음.has(spec.file)) continue;
        const 첫줄 = (r.error?.message ?? r.status ?? '').replace(색글자, '').split('\n')[0] ?? '';
        모음.set(spec.file, /검증 실패: (.+)$/.exec(첫줄)?.[1] ?? 첫줄.replace(/^Error: /, ''));
      }
    }
    (s.suites ?? []).forEach(걷기);
  };
  걷기(보고);
  return [...모음].map(([파일, 문장]) => `${파일} — ${문장}`);
}
