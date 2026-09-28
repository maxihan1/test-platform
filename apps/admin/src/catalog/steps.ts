// 케이스 소스에서 절차 목록 · 건너뛸 수 있는 「만들기」 절차 · request 사용을 가려낸다 (도메인/시나리오 §3.7 결정 4·6).
// 애매하면 「만들기」로 치지 않는다 — 틀리면 건너뛰기를 못 할 뿐이지만, 거꾸로 틀리면 판정이 말없이 사라진다

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
  // 반복문·도우미 함수 안이거나 본문이 맨 함수를 부른다. 한 제목이 여러 번 돌거나 판정이 소스에서 안 보인다
  unsure: boolean;
}

function isTestStep(node: ts.Node): node is ts.CallExpression {
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

function usesRequestIn(sf: ts.SourceFile): boolean {
  let uses = false;
  const walk = (node: ts.Node): void => {
    if (isTestCall(node)) {
      const fn = node.arguments[1];
      if (fn !== undefined && (ts.isArrowFunction(fn) || ts.isFunctionExpression(fn))) {
        const param = fn.parameters[0];
        if (param !== undefined) {
          // 이름 하나로 받으면 안에서 무엇을 꺼내는지 모른다. 모킹 경고가 빠지는 것보다 뜨는 편이 낫다
          if (!ts.isObjectBindingPattern(param.name)) uses = true;
          else {
            uses ||= param.name.elements.some((e) => {
              const key = e.propertyName ?? e.name;
              return ts.isIdentifier(key) && key.text === 'request';
            });
          }
        }
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);
  return uses;
}

export function caseSteps(text: string): CaseSteps {
  const sf = ts.createSourceFile('case.spec.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: Found[] = [];
  const stack: Found[] = [];

  const walk = (node: ts.Node): void => {
    if (isTestStep(node)) {
      const first = node.arguments[0];
      const literal = first !== undefined && (ts.isStringLiteral(first) || ts.isNoSubstitutionTemplateLiteral(first));
      const step: Found = {
        title: literal ? first.text : undefined,
        line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
        verifies: 0,
        blocker: false,
        unsure: wrapped(node),
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
    if (current !== undefined && ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      if (node.expression.text === 'verify') {
        current.verifies += 1;
        if (isBlocker(node)) current.blocker = true;
      } else {
        current.unsure = true;
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);

  const titled = found.filter((s): s is Found & { title: string } => s.title !== undefined);
  const steps = titled.map((s, i) => {
    const next = titled[i + 1];
    return {
      title: s.title,
      line: s.line,
      skippable: s.verifies === 0 && !s.unsure && next !== undefined && next.blocker,
    };
  });

  return { steps, r16: steps.some((s) => s.skippable), usesRequest: usesRequestIn(sf) };
}
