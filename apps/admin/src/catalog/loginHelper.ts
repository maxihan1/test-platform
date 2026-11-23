// 웹 로그인 도우미가 화면으로 로그인하면서 kit `로그인이어쓰기` 를 안 부르는지 막는다(K18) — 작성 지침에만 있던 규칙이라 MTW · MTO 가 케이스마다 화면으로 로그인했다

import ts from 'typescript';

import type { Violation } from './rules.js';

export const K18_WHY = '케이스마다 화면으로 로그인하면 느리고 대상 서버의 로그인 한도에 걸려 작성과 실행이 멈춘다';

const KIT_PARTS = '@platform/kit/parts';
const PW = '@playwright/test';
const 부품 = '로그인이어쓰기';
const 글자넣기 = new Set(['fill', 'pressSequentially', 'type']);

// 작성 지침(`tpx-cases` `5-writing-web.md`)이 로그인 도우미를 이 이름으로 쓰라고 한다. 윈도 경로(역슬래시)도 같은 파일로 본다.
// ponytail: 파일 이름으로만 고른다 — 다른 이름의 도우미에 적은 화면 로그인은 못 잡는다. 코드만 보고 「이것이 로그인이다」를 가를 수 없어 잘못 막지 않는 쪽으로 좁혔다. 그런 파일이 쌓이면 이름 목록을 넓힌다
const 로그인도우미인가 = (경로: string): boolean => /(^|[\\/])helpers[\\/]login\.helper\.ts$/.test(경로);

// ponytail: 파일 하나만 보고 파일 단위로 가른다 — 부품을 한 번이라도 부르면 그 파일의 다른 화면 로그인 함수는 통과하고(MTW 의 둘째 창 로그인이 그렇게 쓴다),
// 다른 도우미 파일을 거쳐 부품을 부르거나 글자 넣기를 다른 도우미 파일에 두는 것은 따라가지 않는다. 그 꼴로 새는 일이 생기면 `로그인` 콜백에서 닿는지까지 본다
export function k18(file: string, sf: ts.SourceFile): Violation[] {
  if (!로그인도우미인가(file)) return [];
  // 앱 · 게임 도우미는 kit 의 드라이버만 쓴다. Playwright 를 가져오는 쪽이 웹이다
  let 웹 = false;
  let 부르는이름: string | undefined;
  let 불렀다 = false;
  let 글자넣는곳: ts.Node | undefined;
  let 화면객체: ts.Node | undefined;
  let API호출 = false;

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const from = node.moduleSpecifier.text;
      const clause = node.importClause;
      const bindings = clause?.namedBindings;
      const names = bindings !== undefined && ts.isNamedImports(bindings) ? bindings.elements : [];
      const 값을가져온다 =
        clause !== undefined &&
        !clause.isTypeOnly &&
        (clause.name !== undefined || (bindings !== undefined && ts.isNamespaceImport(bindings)) || names.some((e) => !e.isTypeOnly));
      if (from === PW) 웹 = true;
      else if (from === KIT_PARTS) 부르는이름 ??= names.find((e) => (e.propertyName ?? e.name).text === 부품)?.name.text;
      else if (/(^|\/)pages\//.test(from) && 값을가져온다) 화면객체 ??= node;
    } else if (ts.isCallExpression(node)) {
      const callee = node.expression;
      if (ts.isIdentifier(callee) && callee.text === 부르는이름) 불렀다 = true;
      else if (ts.isPropertyAccessExpression(callee)) {
        // 화면 동작은 기다린다(`await ….fill(…)`) — 배열의 `fill` 같은 것과 가른다
        if (글자넣기.has(callee.name.text) && ts.isAwaitExpression(node.parent)) 글자넣는곳 ??= node;
        else if (callee.name.text === 'post') API호출 = true;
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);

  // 화면으로 로그인한다는 표시는 둘이다 — 화면에 글자를 넣는다 · 화면 객체를 값으로 가져오는데 API 로 로그인하는 호출이 없다(화면 객체의 로그인 함수에 맡기는 꼴).
  // API 로 로그인한 뒤 화면 객체를 돌려주기만 하는 도우미는 걸지 않는다
  const 화면로그인 = 글자넣는곳 ?? (API호출 ? undefined : 화면객체);
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
