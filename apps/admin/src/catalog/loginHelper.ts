// 웹 로그인 도우미가 화면으로 로그인하면서 kit `로그인이어쓰기` 를 안 부르는지 막는다(K18) — 작성 지침에만 있던 규칙이라 MTW · MTO 가 케이스마다 화면으로 로그인했다

import { sep } from 'node:path';

import ts from 'typescript';

import type { Violation } from './rules.js';

export const K18_WHY = '케이스마다 화면으로 로그인하면 느리고 대상 서버의 로그인 한도에 걸려 작성과 실행이 멈춘다';

const KIT_PARTS = '@platform/kit/parts';
const PW = '@playwright/test';
const 부품 = '로그인이어쓰기';
const 글자넣기 = new Set(['fill', 'pressSequentially', 'type']);

// 작성 지침(`tpx-cases` `5-writing-web.md`)이 로그인 도우미를 이 이름으로 쓰라고 한다.
// ponytail: 파일 이름으로만 고른다 — 다른 이름의 도우미에 적은 화면 로그인은 못 잡는다. 코드만 보고 「이것이 로그인이다」를 가를 수 없어 잘못 막지 않는 쪽으로 좁혔다. 그런 파일이 쌓이면 이름 목록을 넓힌다
const 로그인도우미인가 = (경로: string): boolean => /(^|\/)helpers\/login\.helper\.ts$/.test(경로.split(sep).join('/'));

export function k18(file: string, sf: ts.SourceFile): Violation[] {
  if (!로그인도우미인가(file)) return [];
  // 앱 · 게임 도우미는 kit 의 드라이버만 쓴다. Playwright 를 가져오는 쪽이 웹이다
  let 웹 = false;
  let 부르는이름: string | undefined;
  let 불렀다 = false;
  // 화면으로 로그인한다는 표시 — 화면에 글자를 넣거나 화면 객체를 값으로 가져온다. API 로 로그인하는 도우미에는 둘 다 없다
  let 화면로그인: ts.Node | undefined;

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      const clause = node.importClause;
      const names = clause?.namedBindings !== undefined && ts.isNamedImports(clause.namedBindings) ? clause.namedBindings.elements : [];
      if (from === PW) 웹 = true;
      else if (from === KIT_PARTS) 부르는이름 ??= names.find((e) => (e.propertyName ?? e.name).text === 부품)?.name.text;
      else if (/(^|\/)pages\//.test(from) && clause !== undefined && !clause.isTypeOnly && names.some((e) => !e.isTypeOnly)) 화면로그인 ??= node;
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === 부르는이름) 불렀다 = true;
      else if (ts.isPropertyAccessExpression(callee) && 글자넣기.has(callee.name.text)) 화면로그인 ??= node;
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  if (!웹 || 화면로그인 === undefined || 불렀다) return [];
  return [
    {
      file,
      line: sf.getLineAndCharacterOfPosition(화면로그인.getStart(sf)).line + 1,
      rule: 'K18',
      what: '로그인 도우미가 화면으로 로그인하면서 kit 로그인이어쓰기 를 부르지 않는다',
      why: K18_WHY,
    },
  ];
}
