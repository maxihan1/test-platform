// 케이스 파일과 tests/ 아래 케이스가 아닌 .ts 파일(Page Object · 도우미)이 같이 지는 K7 을 검사한다

import { readdir } from 'node:fs/promises';
import { join, sep } from 'node:path';

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

// 위의 검사는 이름으로 찾아서 `verify as 확인` · `kit.verify` 를 못 본다. E2E 「만들기」 판별(steps.ts)이
// Page Object 를 「판정을 숨길 수 없다」고 믿으므로 kit 의 판정 · 절차를 들여오는 자리 자체를 막는다
const KIT = '@platform/kit';
const KIT_WHY = '판정 · 절차를 이름을 바꿔 부르면 위 검사를 피하고, E2E 가 그 절차를 건너뛸 수 있는 준비로 잘못 본다';

function kitImport(file: string, sf: ts.SourceFile): Violation[] {
  const out: Violation[] = [];
  const at = (node: ts.Node, what: string): void => {
    out.push({ file, line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1, rule: 'K7', what, why: KIT_WHY });
  };
  const fromKit = (spec: ts.Expression | undefined): boolean =>
    spec !== undefined && ts.isStringLiteralLike(spec) && spec.text === KIT;
  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && fromKit(node.moduleSpecifier)) {
      const bindings = node.importClause?.namedBindings;
      if (bindings !== undefined && ts.isNamespaceImport(bindings)) at(node, 'kit 을 통째로 가져온다');
      else if (bindings !== undefined) {
        const banned = bindings.elements.some((e) => ['verify', 'test'].includes((e.propertyName ?? e.name).text));
        if (banned) at(node, 'kit 에서 verify · test 를 가져온다');
      }
    } else if (ts.isExportDeclaration(node) && fromKit(node.moduleSpecifier)) {
      at(node, 'kit 을 다시 내보낸다');
    } else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword && fromKit(node.arguments[0])) {
      at(node, 'kit 을 동적으로 가져온다');
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
  return [...k7(file, sf), ...stepOrVerify(file, sf), ...kitImport(file, sf)].sort((a, b) => a.line - b.line);
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
