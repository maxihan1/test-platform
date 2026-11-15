// 케이스 파일과 tests/ 아래 케이스가 아닌 .ts 파일(Page Object · 도우미)이 같이 지는 K7 · K15 · K16 을 검사한다

import { readdir } from 'node:fs/promises';
import { join, posix, sep } from 'node:path';

import ts from 'typescript';

import type { Violation } from './rules.js';

export const K7_WHY = '같은 설명이 두 군데 생겨 한쪽이 거짓말을 시작한다';

export function k7(file: string, sf: ts.SourceFile): Violation[] {
  const text = sf.text;
  const lineAt = (pos: number): number => sf.getLineAndCharacterOfPosition(pos).line + 1;
  const out: Violation[] = [];

  // 주석은 토큰 앞의 트리비아로만 붙는다. 문자열·정규식 안의 슬래시는 토큰이 아니므로 여기 걸리지 않는다
  const counted = new Set<number>();
  const visit = (node: ts.Node): void => {
    for (const r of ts.getLeadingCommentRanges(text, node.pos) ?? []) {
      if (counted.has(r.pos)) continue;
      counted.add(r.pos);
      out.push({ file, line: lineAt(r.pos), rule: 'K7', what: '주석이 있다', why: K7_WHY });
    }
    if (ts.isIdentifier(node) && node.text === 'expect') {
      out.push({
        file,
        line: lineAt(node.getStart(sf)),
        rule: 'K7',
        what: 'expect를 직접 쓴다',
        why: '검증 문장이 결과에 남지 않아 증적 문서가 빈다',
      });
    }
    node.getChildren(sf).forEach(visit);
  };
  visit(sf);
  return out;
}

export const K15_WHY = '정해 둔 시간은 느린 망에서는 모자라 흔들리고 빠른 망에서는 시간만 버린다';

// 케이스와 Page Object · 도우미가 이 한 벌을 같이 쓴다.
// 이름(`.waitForTimeout` · `{ waitForTimeout }`)으로도 글자(`page['waitForTimeout']` · `'networkidle'`)로도 잡는다
const 고정대기 = ['waitForTimeout', 'networkidle'];
const ROUTE_CALLS = ['route', 'routeWebSocket'];

// `new Promise((r) => setTimeout(r, …))` · `setTimeout(() => r(), …)` — 실행 함수가 받은 풀기를 타이머가 부르는 약속
function isSleepPromise(node: ts.Node): node is ts.NewExpression {
  if (!ts.isNewExpression(node) || !ts.isIdentifier(node.expression) || node.expression.text !== 'Promise') return false;
  const exec = node.arguments?.[0];
  if (exec === undefined || !(ts.isArrowFunction(exec) || ts.isFunctionExpression(exec))) return false;
  const resolve = exec.parameters[0]?.name;
  if (resolve === undefined || !ts.isIdentifier(resolve)) return false;
  const callsResolve = (n: ts.Node): boolean =>
    (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === resolve.text) || (ts.forEachChild(n, callsResolve) ?? false);
  const visit = (n: ts.Node): boolean => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'setTimeout') {
      const first = n.arguments[0];
      if (first !== undefined && ts.isIdentifier(first) && first.text === resolve.text) return true;
      if (first !== undefined && (ts.isArrowFunction(first) || ts.isFunctionExpression(first)) && callsResolve(first.body)) return true;
    }
    return ts.forEachChild(n, visit) ?? false;
  };
  return visit(exec.body);
}

// 되풀이 조회의 사이 쉬기 · route 안 응답 늦추기 · `Promise.race` 데드라인은 기다림이 아니라 조회 간격이거나 상황을 만드는 것이다.
// 되풀이 조회는 조건으로 도는 `while` · `do` · `for(;;)` 만 친다 — `for … of` 는 항목마다 쉬는 고정 대기다
function allowedSleep(node: ts.Node): boolean {
  let inFunction = false;
  for (let n = node.parent; n !== undefined; n = n.parent) {
    if (!inFunction && (ts.isWhileStatement(n) || ts.isDoStatement(n) || ts.isForStatement(n))) return true;
    if (ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)) {
      const name = n.expression.name.text;
      if (ROUTE_CALLS.includes(name)) return true;
      if (name === 'race' && ts.isIdentifier(n.expression.expression) && n.expression.expression.text === 'Promise') return true;
    }
    if (ts.isFunctionLike(n)) {
      // 따로 정의한 route 처리 함수 — 가장 가까운 함수만 보고, `route: string` 같은 다른 타입은 치지 않는다
      const routeParam = n.parameters.some((p) => p.type?.getText() === 'Route' || (p.type === undefined && ts.isIdentifier(p.name) && p.name.text === 'route'));
      if (!inFunction && routeParam) return true;
      inFunction = true;
    }
  }
  return false;
}

const exported = (node: ts.Node): boolean =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((m) => m.kind === ts.SyntaxKind.ExportKeyword);

// 쉬기만 하는 함수(`const 쉬기 = (ms) => new Promise(…)`)는 정의 대신 같은 파일에서 부르는 자리를 본다.
// 내보내는 쉬기 함수는 정의가 걸린다 — 다른 파일에서 부르는 자리는 따라가지 않는다
// ponytail: 선언과 떨어진 `export { 쉬기 }` 는 못 알아본다. 그 꼴이 나오면 내보내는 이름 목록을 같이 본다
function sleepHelperName(promise: ts.NewExpression): string | undefined {
  let fn: ts.Node = promise.parent;
  if (ts.isAwaitExpression(fn)) fn = fn.parent;
  if (ts.isExpressionStatement(fn) || ts.isReturnStatement(fn)) {
    if (!ts.isBlock(fn.parent) || fn.parent.statements.length !== 1) return undefined;
    fn = fn.parent.parent;
  }
  if (!(ts.isArrowFunction(fn) || ts.isFunctionExpression(fn) || ts.isFunctionDeclaration(fn))) return undefined;
  if (ts.isFunctionDeclaration(fn)) return exported(fn) ? undefined : fn.name?.text;
  const decl = fn.parent;
  if (!ts.isVariableDeclaration(decl) || !ts.isIdentifier(decl.name)) return undefined;
  return exported(decl.parent.parent) ? undefined : decl.name.text;
}

export function k15(file: string, sf: ts.SourceFile): Violation[] {
  const out: Violation[] = [];
  const at = (node: ts.Node, what: string): void => {
    out.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule: 'K15', what, why: K15_WHY });
  };
  const helpers = new Set<string>();
  const sleeps: ts.Node[] = [];
  const calls: ts.CallExpression[] = [];
  const visit = (node: ts.Node): void => {
    if ((ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && 고정대기.includes(node.text)) {
      at(node, `${node.text} 로 기다린다`);
    }
    if (isSleepPromise(node)) {
      const helper = sleepHelperName(node);
      if (helper !== undefined) helpers.add(helper);
      else sleeps.push(node);
    }
    if (ts.isCallExpression(node)) {
      calls.push(node);
      // 앱 드라이버(WebdriverIO)의 `driver.pause(1000)` — 인자 없이도 1초를 쉰다. 다른 것의 인자 없는 `video.pause()` 는 쉬기가 아니다
      const callee = node.expression;
      if (
        ts.isPropertyAccessExpression(callee) &&
        callee.name.text === 'pause' &&
        (node.arguments.length === 1 || (ts.isIdentifier(callee.expression) && ['driver', 'browser'].includes(callee.expression.text)))
      ) {
        sleeps.push(node);
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  for (const c of calls) if (ts.isIdentifier(c.expression) && helpers.has(c.expression.text)) sleeps.push(c);
  for (const s of sleeps) if (!allowedSleep(s)) at(s, '정해 둔 시간을 쉰다');
  return out;
}

export const K16_WHY = '작성한 컴퓨터의 주소라 러너 · 다른 컴퓨터에서는 자기 자신을 가리켜 닿지 않는다';

// 대상 서버 주소는 실행 때 baseURL · 대상 서버 설정으로 받는다. 연결 거절을 일부러 만드는 9번 포트(`127.0.0.1:9`)는 막지 않는다
// ponytail: 내부 주소를 거절하는지 보는 입력값처럼 일부러 적은 글자도 걸린다. 그런 케이스가 생기면 줄 하나를 빼는 표시를 더한다
const 작성주소 = /(?:\blocalhost|host\.docker\.internal|\b127\.0\.0\.1|\b0\.0\.0\.0)\b(?!:9\b)/i;
export function k16(file: string, sf: ts.SourceFile): Violation[] {
  const out: Violation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node) || ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) {
      if (작성주소.test(node.text)) {
        out.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule: 'K16', what: '작성 환경 주소를 적었다', why: K16_WHY });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// 증적 · K6 · K12 는 케이스 파일의 절차 제목과 판정 문장만 읽는다. 다른 파일에 숨은 step · verify 는 결과에서 사라진다
function stepOrVerify(file: string, sf: ts.SourceFile): Violation[] {
  const out: Violation[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isCallExpression(node)) {
      const callee = node.expression;
      const name =
        ts.isPropertyAccessExpression(callee) &&
        ts.isIdentifier(callee.expression) &&
        callee.expression.text === 'test' &&
        callee.name.text === 'step'
          ? 'test.step 을'
          : ts.isIdentifier(callee) && callee.text === 'verify'
            ? 'verify 를'
            : undefined;
      if (name) {
        out.push({
          file,
          line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
          rule: 'K7',
          what: `케이스가 아닌 파일에서 ${name} 부른다`,
          why: '증적과 검사가 케이스 파일만 읽어 이 절차와 판정이 결과에서 빠진다',
        });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// 위의 검사는 이름으로 찾아서 `verify as 확인` · `@platform/kit/runtime` · tests 밖 상대 경로를 못 본다.
// E2E 「만들기」 판별(steps.ts)이 Page Object 를 「판정을 숨길 수 없다」고 믿으므로 가져올 수 있는 곳을 허용 목록으로 좁힌다 —
// 같은 tests 안 파일(그 파일도 이 검사를 받는다) · playwright(test · expect 말고) · kit 의 타입 · kit 공용 부품(`@platform/kit/parts`)뿐이다
const KIT = '@platform/kit';
// 공용 부품만 모은 입구 — 판정 · 절차가 없어 값으로 가져와도 된다(kit `src/parts.ts` 가 그 약속을 지킨다)
const KIT_PARTS = '@platform/kit/parts';
const PW = '@playwright/test';
const IMPORT_WHY = '판정 · 절차를 다른 이름으로 들여오면 위 검사를 피하고, E2E 가 그 절차를 건너뛸 수 있는 준비로 잘못 본다';

function insideTests(file: string, spec: string): boolean {
  if (!spec.startsWith('./') && !spec.startsWith('../')) return false;
  const to = posix.normalize(posix.join(posix.dirname(file.split(sep).join('/')), spec));
  return !to.startsWith('..') && !to.split('/').includes('node_modules');
}

function importRule(file: string, sf: ts.SourceFile): Violation[] {
  const out: Violation[] = [];
  const at = (node: ts.Node, what: string): void => {
    out.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule: 'K7', what, why: IMPORT_WHY });
  };
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const values =
        clause === undefined || clause.isTypeOnly
          ? []
          : [
              ...(clause.name !== undefined ? ['default'] : []),
              ...(bindings !== undefined && ts.isNamespaceImport(bindings) ? ['*'] : []),
              ...(bindings !== undefined && ts.isNamedImports(bindings)
                ? bindings.elements.filter((e) => !e.isTypeOnly).map((e) => (e.propertyName ?? e.name).text)
                : []),
            ];
      if (from === KIT_PARTS) {
        if (values.some((v) => v === '*' || v === 'default')) at(node, 'kit 부품을 통째로 가져온다');
      } else if (from === KIT || from.startsWith(`${KIT}/`)) {
        if (values.length > 0) at(node, 'kit 에서 타입 말고 다른 것을 가져온다');
      } else if (from === PW) {
        if (values.some((v) => ['*', 'default', 'test', 'expect'].includes(v))) at(node, 'playwright 에서 test · expect 를 가져온다');
      } else if (!insideTests(file, from)) {
        at(node, 'tests 밖이나 다른 패키지에서 가져온다');
      }
    } else if (ts.isExportDeclaration(node) && node.moduleSpecifier !== undefined) {
      if (!ts.isStringLiteral(node.moduleSpecifier) || !insideTests(file, node.moduleSpecifier.text)) {
        at(node, 'tests 밖이나 다른 패키지를 다시 내보낸다');
      }
    } else if (ts.isImportEqualsDeclaration(node)) {
      at(node, 'import = require 로 가져온다');
    } else if (ts.isCallExpression(node)) {
      if (node.expression.kind === ts.SyntaxKind.ImportKeyword) at(node, '동적으로 가져온다');
      else if (ts.isIdentifier(node.expression) && node.expression.text === 'require') at(node, 'require 로 가져온다');
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return out;
}

// 케이스가 아니라서 K1·K3 같은 케이스 규칙을 걸면 멀쩡한 파일이 위반으로 찍힌다
export function checkNonCase(file: string, text: string): Violation[] {
  // JS 파일은 타입 검사를 안 받고 import 경로로 풀려 Page Object 자리를 차지할 수 있다
  if (!file.endsWith('.ts')) {
    return [{ file, line: 1, rule: 'K7', what: 'tests 아래 JS 파일이다', why: '타입 검사와 이 검사를 피한 채 import 로 불린다' }];
  }
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return [...k7(file, sf), ...k15(file, sf), ...k16(file, sf), ...stepOrVerify(file, sf), ...importRule(file, sf)].sort((a, b) => a.line - b.line);
}

// JS 파일도 모은다 — checkNonCase 가 그 자체로 위반으로 찍는다. 이름 꼴은 cases-only 가 따로 본다. 여기서 꼴로 거르면 꼴이 어긋난 파일이 K7 을 아예 안 받는다
export async function nonCaseFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries
    .map((p) => p.split(sep).join('/'))
    .filter((p) => /\.(ts|js|mjs|cjs)$/.test(p) && !p.endsWith('.spec.ts') && !p.split('/').includes('node_modules'))
    .map((p) => join(root, p))
    .sort();
}
