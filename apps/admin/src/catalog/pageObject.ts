// 케이스 파일과 Page Object · Component 파일이 같이 지는 K7(주석·expect 금지)을 검사한다

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

// Page Object 는 케이스가 아니라서 K1·K3 같은 케이스 규칙을 걸면 멀쩡한 파일이 위반으로 찍힌다
export function checkPageObject(file: string, text: string): Violation[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  return k7(file, sf).sort((a, b) => a.line - b.line);
}

// tests/<폴더>/pages/<이름>.page.ts · tests/<폴더>/components/<이름>.component.ts 자리만 Page Object 다
const PAGE_OBJECT = /^[^/]+\/(?:pages\/[^/]+\.page|components\/[^/]+\.component)\.ts$/;

export async function pageObjectFiles(root: string): Promise<string[]> {
  const entries = await readdir(root, { recursive: true });
  return entries
    .filter((p) => PAGE_OBJECT.test(p.split(sep).join('/')))
    .map((p) => join(root, p))
    .sort();
}
