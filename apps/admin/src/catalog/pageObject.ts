// 케이스 파일과 tests/ 아래 케이스가 아닌 .ts 파일(Page Object · 도우미)이 같이 지는 K7 을 검사한다

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
// 같은 tests 안 파일(그 파일도 이 검사를 받는다) · playwright(test · expect 말고) · kit 의 타입뿐이다
const KIT = '@platform/kit';
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
      if (from === KIT || from.startsWith(`${KIT}/`)) {
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
  return [...k7(file, sf), ...stepOrVerify(file, sf), ...importRule(file, sf)].sort((a, b) => a.line - b.line);
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
