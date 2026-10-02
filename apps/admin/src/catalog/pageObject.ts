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

// 케이스가 아니라서 K1·K3 같은 케이스 규칙을 걸면 멀쩡한 파일이 위반으로 찍힌다
export function checkNonCase(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return [...k7(file, sf), ...stepOrVerify(file, sf)].sort((a, b) => a.line - b.line);
}

// 이름 꼴은 cases-only 가 따로 본다. 여기서 꼴로 거르면 꼴이 어긋난 파일이 K7 을 아예 안 받는다
export async function nonCaseFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries
    .map((p) => p.split(sep).join('/'))
    .filter((p) => p.endsWith('.ts') && !p.endsWith('.spec.ts') && !p.split('/').includes('node_modules'))
    .map((p) => join(root, p))
    .sort();
}
