// 케이스 파일에서 믿어도 되는 Page Object 이름을 가려낸다 — steps.ts 가 300줄을 넘어 떼어 냈다 (도메인/시나리오 §3.7 결정 4).
// Page Object 는 믿는다 — 케이스가 아닌 파일은 K7(pageObject.ts)이 판정 · 절차를 들여오는 것까지 막는다

import ts from 'typescript';

export function holdsFunction(node: ts.Node): boolean {
  return ts.isFunctionLike(node) || (node.forEachChild((c) => (holdsFunction(c) ? true : undefined)) ?? false);
}

// 경로를 앞뒤로 못 박는다 — `../` · `./pages/../` 로 Page Object 자리 밖 파일을 끌어오지 못하게. 이름 꼴은 cases-only.mjs 와 같다.
// helpers 도 같은 K7 을 지고, components 에 있던 로그인 · 데이터 도구가 옮겨 간 자리라 똑같이 믿는다 (작성 §3.6 「지도」)
const PAGE_OBJECT =
  /^\.\/(?:pages\/[a-z][a-z0-9-]{0,40}\.page|components\/[a-z][a-z0-9-]{0,40}\.component|helpers\/[a-z][a-z0-9-]{0,40}\.helper)(?:\.js)?$/;

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
export function pageObjects(sf: ts.SourceFile): { trusted: Set<string>; functions: Set<string> } {
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
