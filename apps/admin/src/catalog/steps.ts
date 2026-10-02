// 케이스 소스에서 절차 목록 · 건너뛸 수 있는 「만들기」 절차 · request 사용을 가려낸다 (도메인/시나리오 §3.7 결정 4·6).
// 애매하면 「만들기」로 치지 않는다 — 틀리면 건너뛰기를 못 할 뿐이지만, 거꾸로 틀리면 판정이 말없이 사라진다
// Page Object 는 믿는다 — 케이스가 아닌 파일은 K7(pageObject.ts)이 판정 · 절차를 들여오는 것까지 막는다

import ts from 'typescript';

export interface CaseStep {
  title: string;
  line: number;
  skippable: boolean;
}

export interface CaseSteps {
  steps: CaseStep[];
  r16: boolean;
  usesRequest: boolean;
}

interface Found {
  title: string | undefined;
  line: number;
  verifies: number;
  blocker: boolean;
  // 소스만 보고는 이 절차 안에서 무엇이 도는지 다 알 수 없다. 한 제목이 여러 번 돌거나 판정이 다른 곳에 숨었을 수 있다
  unsure: boolean;
  // 이 절차 안에서 fixture 로 만든 변수. 함수를 담지 않았으니 부르더라도 판정을 숨길 수 없다
  locals: Set<string>;
}

export function isTestStep(node: ts.Node): node is ts.CallExpression {
  if (!ts.isCallExpression(node)) return false;
  const callee = node.expression;
  return (
    ts.isPropertyAccessExpression(callee) &&
    callee.name.text === 'step' &&
    ts.isIdentifier(callee.expression) &&
    callee.expression.text === 'test'
  );
}

function isTestCall(node: ts.Node): node is ts.CallExpression {
  return ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 'test';
}

function isInlineFunction(node: ts.Node | undefined): node is ts.ArrowFunction | ts.FunctionExpression {
  return node !== undefined && (ts.isArrowFunction(node) || ts.isFunctionExpression(node));
}

// 넷째 인자가 객체 리터럴이고 blocker: true 일 때만. 변수로 넘기면 모른다 — 모르면 blocker 가 아니다
function isBlocker(call: ts.CallExpression): boolean {
  const options = call.arguments[3];
  if (options === undefined || !ts.isObjectLiteralExpression(options)) return false;
  return options.properties.some(
    (p) =>
      ts.isPropertyAssignment(p) &&
      ts.isIdentifier(p.name) &&
      p.name.text === 'blocker' &&
      p.initializer.kind === ts.SyntaxKind.TrueKeyword,
  );
}

// 절차 호출에서 위로 올라가며 test(spec, …) 본문 사이에 반복문이나 다른 함수가 끼었는지 본다
function wrapped(step: ts.CallExpression): boolean {
  let node: ts.Node = step;
  while (node.parent !== undefined) {
    const parent: ts.Node = node.parent;
    if (ts.isIterationStatement(parent, false)) return true;
    if (ts.isFunctionLike(parent)) {
      const call: ts.Node | undefined = parent.parent;
      if (call !== undefined && isTestCall(call)) return false;
      if (call === undefined || !isTestStep(call)) return true;
    }
    node = parent;
  }
  return false;
}

// page.getByRole(…).fill 처럼 점·괄호·호출을 벗겨 맨 앞 이름을 찾는다
function rootName(expr: ts.Expression): string | undefined {
  let e: ts.Expression = expr;
  for (;;) {
    if (ts.isPropertyAccessExpression(e) || ts.isElementAccessExpression(e) || ts.isCallExpression(e) || ts.isNewExpression(e)) {
      e = e.expression;
    }
    else if (ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isNonNullExpression(e)) e = e.expression;
    else return ts.isIdentifier(e) ? e.text : undefined;
  }
}

function holdsFunction(node: ts.Node): boolean {
  return ts.isFunctionLike(node) || (node.forEachChild((c) => (holdsFunction(c) ? true : undefined)) ?? false);
}

// 경로를 앞뒤로 못 박는다 — `../` · `./pages/../` 로 Page Object 자리 밖 파일을 끌어오지 못하게. 이름 꼴은 cases-only.mjs 와 같다
const PAGE_OBJECT = /^\.\/(?:pages\/[a-z][a-z0-9-]{0,40}\.page|components\/[a-z][a-z0-9-]{0,40}\.component)(?:\.js)?$/;

function declaredName(node: ts.Node): string | undefined {
  if (
    (ts.isVariableDeclaration(node) ||
      ts.isParameter(node) ||
      ts.isBindingElement(node) ||
      ts.isFunctionDeclaration(node) ||
      ts.isClassDeclaration(node) ||
      ts.isImportSpecifier(node) ||
      ts.isImportClause(node) ||
      ts.isNamespaceImport(node)) &&
    node.name !== undefined &&
    ts.isIdentifier(node.name)
  ) {
    return node.name.text;
  }
  return undefined;
}

// 이름만 보고 믿으므로 그 이름이 파일 어디서든 Page Object 만 담을 때 믿는다. 다시 담거나 다른 것으로 덮으면 믿지 않는다.
// 절차 밖에서 함수를 담은 이름도 모은다 — Page Object 메서드에 넘기면 그 안의 판정이 어느 절차에도 안 세진다
function pageObjects(sf: ts.SourceFile): { trusted: Set<string>; functions: Set<string> } {
  const classes = new Set<string>();
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (!PAGE_OBJECT.test(stmt.moduleSpecifier.text) || bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const e of bindings.elements) classes.add(e.name.text);
  }

  const good = new Set<string>(classes);
  const bad = new Set<string>();
  const madeFrom = new Map<string, string>();
  const functions = new Set<string>();
  const visit = (node: ts.Node): void => {
    const name = declaredName(node);
    if (name !== undefined && !(ts.isImportSpecifier(node) && classes.has(name))) {
      const made =
        ts.isVariableDeclaration(node) &&
        (ts.getCombinedNodeFlags(node) & ts.NodeFlags.Const) !== 0 &&
        node.initializer !== undefined &&
        ts.isNewExpression(node.initializer) &&
        ts.isIdentifier(node.initializer.expression) &&
        classes.has(node.initializer.expression.text);
      (made ? good : bad).add(name);
      if (made) madeFrom.set(name, (node.initializer.expression as ts.Identifier).text);
      if (
        ts.isFunctionDeclaration(node) ||
        ts.isClassDeclaration(node) ||
        (ts.isVariableDeclaration(node) && node.initializer !== undefined && holdsFunction(node.initializer))
      ) {
        functions.add(name);
      }
    }
    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken && ts.isIdentifier(node.left)) {
      bad.add(node.left.text);
    }
    node.forEachChild(visit);
  };
  visit(sf);

  // 판정 · 절차 함수를 값으로 쓰면(넘기기 · 옮겨 담기 · globalThis 에 걸기) Page Object 가 받아 부를 수 있다 — 그 파일은 아무것도 믿지 않는다
  const kit = new Set<string>();
  let poisoned = false;
  for (const stmt of sf.statements) {
    if (!ts.isImportDeclaration(stmt) || !ts.isStringLiteral(stmt.moduleSpecifier)) continue;
    const from = stmt.moduleSpecifier.text;
    if (from !== '@platform/kit' && !from.startsWith('@platform/kit/')) continue;
    const bindings = stmt.importClause?.namedBindings;
    if (bindings !== undefined && ts.isNamespaceImport(bindings)) poisoned = true;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;
    for (const e of bindings.elements) {
      if (['verify', 'test'].includes((e.propertyName ?? e.name).text)) kit.add(e.name.text);
    }
  }

  // 믿는 이름은 부르는 자리에만 와야 한다. 대입 · 인자 · 값으로 쓰면 메서드를 바꿔치거나 판정이 든 곳으로 흘러간다
  const calledOnly = (id: ts.Identifier, step: boolean): boolean => {
    if (ts.isNewExpression(id.parent) && id.parent.expression === id) return !step;
    let cur: ts.Expression = id;
    let depth = 0;
    while (ts.isPropertyAccessExpression(cur.parent) && cur.parent.expression === cur) {
      cur = cur.parent;
      depth += 1;
    }
    return (step ? depth <= 1 : depth >= 1) && ts.isCallExpression(cur.parent) && cur.parent.expression === cur;
  };
  const uses = (node: ts.Node): void => {
    if (ts.isIdentifier(node) && declaredName(node.parent) !== node.text && !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)) {
      if (kit.has(node.text) && !calledOnly(node, true)) poisoned = true;
      if (good.has(node.text) && !calledOnly(node, false)) bad.add(node.text);
    }
    node.forEachChild(uses);
  };
  uses(sf);
  for (const [name, cls] of madeFrom) if (bad.has(cls)) bad.add(name);
  return { trusted: poisoned ? new Set() : new Set([...good].filter((n) => !bad.has(n))), functions };
}

export function caseSteps(text: string): CaseSteps {
  const sf = ts.createSourceFile('case.spec.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: Found[] = [];
  const stack: Found[] = [];
  const fixtures = new Set<string>();
  const { trusted, functions } = pageObjects(sf);
  let usesRequest = false;

  const walk = (node: ts.Node): void => {
    if (isTestCall(node)) {
      const fn = node.arguments[1];
      const param = isInlineFunction(fn) ? fn.parameters[0] : undefined;
      // 무엇을 꺼내 쓰는지 모르면 쓴다고 본다. 모킹 경고가 빠지는 것보다 뜨는 편이 낫다
      if (!isInlineFunction(fn)) usesRequest = true;
      else if (param !== undefined && ts.isIdentifier(param.name)) {
        usesRequest = true;
        fixtures.add(param.name.text);
      } else if (param !== undefined && ts.isObjectBindingPattern(param.name)) {
        for (const e of param.name.elements) {
          const key = e.propertyName ?? e.name;
          if (e.dotDotDotToken !== undefined || !ts.isIdentifier(key) || key.text === 'request') usesRequest = true;
          if (ts.isIdentifier(e.name)) fixtures.add(e.name.text);
        }
      }
    }
    // page.request 도 브라우저 컨텍스트의 route 를 안 거친다
    if (ts.isPropertyAccessExpression(node) && node.name.text === 'request') usesRequest = true;

    if (isTestStep(node)) {
      const first = node.arguments[0];
      const step: Found = {
        title: first !== undefined && ts.isStringLiteralLike(first) ? first.text : undefined,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        verifies: 0,
        blocker: false,
        unsure: wrapped(node) || !isInlineFunction(node.arguments[1]),
        locals: new Set(),
      };
      // 바깥 절차를 건너뛰면 안쪽 절차가 통째로 안 돈다
      const outer = stack[stack.length - 1];
      if (outer !== undefined) outer.unsure = true;
      found.push(step);
      stack.push(step);
      node.forEachChild(walk);
      stack.pop();
      return;
    }

    const current = stack[stack.length - 1];
    if (current !== undefined) {
      if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name)) {
        if (node.initializer === undefined || !holdsFunction(node.initializer)) current.locals.add(node.name.text);
      } else if (ts.isNewExpression(node)) {
        if (!ts.isIdentifier(node.expression) || !trusted.has(node.expression.text)) current.unsure = true;
      } else if (
        ts.isIdentifier(node) &&
        functions.has(node.text) &&
        !current.locals.has(node.text) &&
        !(ts.isPropertyAccessExpression(node.parent) && node.parent.name === node)
      ) {
        current.unsure = true;
      } else if (ts.isCallExpression(node)) {
        if (ts.isIdentifier(node.expression) && node.expression.text === 'verify') {
          current.verifies += 1;
          if (isBlocker(node)) current.blocker = true;
        } else {
          // 맨 함수 · kit.verify · 도우미 객체는 안에서 판정을 부를 수 있다. fixture 에서 시작하는 호출만 믿는다
          const root = ts.isIdentifier(node.expression) ? undefined : rootName(node.expression);
          if (root === undefined || (!fixtures.has(root) && !current.locals.has(root) && !trusted.has(root))) current.unsure = true;
        }
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);

  // 제목을 글자로 못 읽는 절차가 하나라도 있으면 러너가 무엇을 건너뛸지 소스로 장담할 수 없다
  const readable = found.every((s) => s.title !== undefined);
  const steps = found.flatMap((s, i) => {
    if (s.title === undefined) return [];
    const next = found[i + 1];
    const skippable = readable && s.verifies === 0 && !s.unsure && next !== undefined && next.blocker;
    return [{ title: s.title, line: s.line, skippable }];
  });

  return { steps, r16: steps.some((s) => s.skippable), usesRequest };
}
