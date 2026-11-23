// 프로시저 파일 글을 케이스 구간으로 가른다 — 검사기(K19 · K20) · 스캐너(구간별 단계 제목 · 화면 연결) · 리포팅(구간 지문)이 같은 이 함수를 쓴다 (카탈로그 §3.1 「케이스 구간」)
// 구간을 두 곳이 따로 가르면 「이 절차는 어느 케이스 것인가」가 화면마다 달라진다

import { createHash } from 'node:crypto';

import ts from 'typescript';

import { isTestCase, isTestCleanup, isVerify } from './steps.js';

export interface 어긋남 {
  rule: 'K1' | 'K6' | 'K8' | 'K19' | 'K20';
  line: number;
  what: string;
}

export interface 케이스구간 {
  /** 맨 위 선언 이름 */
  이름: string;
  선언: ts.VariableStatement;
  /** 앞 케이스 구간 뒤부터(첫 케이스는 본문 시작부터) 이 케이스 구간 앞까지 본문 맨 바깥의 문 — 정리 선언은 뺀다 */
  준비: ts.Statement[];
  /** `test.case(이름, …)` 문 */
  부름: ts.Statement;
}

export interface 읽은프로시저 {
  sf: ts.SourceFile;
  /** defineProcedure 인자 */
  인자: ts.ObjectLiteralExpression | undefined;
  /** 맨 위 `const 이름 = defineCase({...})` 의 인자 — 적힌 차례대로 */
  케이스인자: ts.ObjectLiteralExpression[];
  /** cases 차례대로. 글자로 못 가르면 null — 구간 기준 값(단계 제목 · 화면 연결 · 지문)은 모른다로 둔다 */
  구간: 케이스구간[] | null;
  /** 본문 맨 바깥의 정리 선언 */
  정리: ts.Statement[];
  어긋남: 어긋남[];
}

const 부른이름 = (node: ts.Node, 이름: string): node is ts.CallExpression =>
  ts.isCallExpression(node) && ts.isIdentifier(node.expression) && node.expression.text === 이름;

const 내보냈나 = (s: ts.VariableStatement): boolean => s.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword) ?? false;

const 키 = (p: ts.ObjectLiteralElementLike): string | undefined => (p.name !== undefined && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined);

const 객체인자 = (call: ts.CallExpression): ts.ObjectLiteralExpression | undefined => {
  const 첫 = call.arguments[0];
  return 첫 !== undefined && ts.isObjectLiteralExpression(첫) ? 첫 : undefined;
};

// `await f(…);` · `f(…);` 문에서 부름을 꺼낸다
function 문의부름(s: ts.Statement): ts.CallExpression | undefined {
  if (!ts.isExpressionStatement(s)) return undefined;
  const e = ts.isAwaitExpression(s.expression) ? s.expression.expression : s.expression;
  return ts.isCallExpression(e) ? e : undefined;
}

function 판정수(node: ts.Node): number {
  let n = ts.isCallExpression(node) && isVerify(node) ? 1 : 0;
  node.forEachChild((c) => {
    n += 판정수(c);
  });
  return n;
}

/** 프로시저 파일이 아니면(맨 위에 defineProcedure 선언이 없으면) null. sf 는 부모 고리를 건 것이어야 한다 */
export function 프로시저읽기(sf: ts.SourceFile): 읽은프로시저 | null {
  const 어긋남: 어긋남[] = [];
  // 구간을 가를 수 없게 만드는 어긋남이 하나라도 있으면 구간은 null 이다
  let 가른다 = true;
  const 짚기 = (rule: 어긋남['rule'], n: ts.Node | undefined, what: string, 못가름 = true): void => {
    어긋남.push({ rule, line: n === undefined ? 1 : sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1, what });
    if (못가름) 가른다 = false;
  };

  const 케이스선언 = new Map<string, { 문: ts.VariableStatement; 인자: ts.ObjectLiteralExpression | undefined }>();
  const 프로시저들: { 이름: string; 문: ts.VariableStatement; call: ts.CallExpression }[] = [];
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      if (!ts.isIdentifier(d.name) || d.initializer === undefined) continue;
      if (부른이름(d.initializer, 'defineProcedure')) 프로시저들.push({ 이름: d.name.text, 문: s, call: d.initializer });
      // let · var 로 선언한 케이스는 뒤에서 바꿔 담을 수 있어 맨 위 선언으로 치지 않는다 (K19)
      else if (부른이름(d.initializer, 'defineCase') && (s.declarationList.flags & ts.NodeFlags.Const) !== 0) 케이스선언.set(d.name.text, { 문: s, 인자: 객체인자(d.initializer) });
    }
  }
  if (프로시저들.length === 0) return null;

  const 내보낸 = 프로시저들.filter((p) => p.이름 === 'procedure' && 내보냈나(p.문));
  if (프로시저들.length !== 1 || 내보낸.length !== 1) {
    짚기('K1', 프로시저들[1]?.문 ?? 프로시저들[0]!.문, `export const procedure = defineProcedure(...) 선언이 ${내보낸.length}개다(defineProcedure 선언은 ${프로시저들.length}개). 프로시저 파일에는 정확히 하나다`);
  }
  for (const [이름, c] of 케이스선언) {
    if (내보냈나(c.문)) 짚기('K1', c.문, `케이스 선언 ${이름} 을 내보냈다. 프로시저 파일은 procedure 만 내보낸다`, false);
  }

  const 프 = 내보낸[0] ?? 프로시저들[0]!;
  const 인자 = 객체인자(프.call);
  const cases칸 = 인자?.properties.find((p): p is ts.PropertyAssignment => ts.isPropertyAssignment(p) && 키(p) === 'cases');
  const 차례: string[] = [];
  if (cases칸 === undefined || !ts.isArrayLiteralExpression(cases칸.initializer)) {
    짚기('K19', cases칸 ?? 프.문, 'cases 가 배열 리터럴이 아니다. 같은 파일 맨 위에서 선언한 케이스 이름을 도는 차례대로 적는다');
  } else {
    for (const e of cases칸.initializer.elements) {
      if (!ts.isIdentifier(e) || !케이스선언.has(e.text)) {
        짚기('K19', e, `cases 의 ${e.getText(sf)} 는 이 파일 맨 위에서 const 이름 = defineCase(...) 로 선언한 이름이 아니다`);
      } else if (차례.includes(e.text)) 짚기('K19', e, `cases 에 ${e.text} 를 두 번 넣었다`);
      else 차례.push(e.text);
    }
    for (const [이름, c] of 케이스선언) {
      if (!차례.includes(이름)) 짚기('K19', c.문, `케이스 선언 ${이름} 이 cases 에 없다. 맨 위 defineCase 선언은 모두 cases 에 든다`, false);
    }
  }

  const 테스트들 = sf.statements.flatMap((s) => {
    const c = 문의부름(s);
    return c !== undefined && 부른이름(c, 'test') ? [c] : [];
  });
  // 둘이면 Playwright 도 같은 제목 둘로 수집을 못 하는데 그 오류는 kit 파일을 가리킨다 — 여기서 이 파일의 줄로 짚는다
  if (테스트들.length !== 1) 짚기('K8', 테스트들[1] ?? 프.문, `test(procedure, …) 가 ${테스트들.length}개다. 파일 1개 = 테스트 1개다`);
  const 테스트 = 테스트들[0];
  const 함수 = 테스트?.arguments[1];
  const 본문 = 함수 !== undefined && (ts.isArrowFunction(함수) || ts.isFunctionExpression(함수)) && ts.isBlock(함수.body) ? 함수.body : undefined;
  const 첫인자 = 테스트?.arguments[0];
  if (테스트 !== undefined && (본문 === undefined || 첫인자 === undefined || !ts.isIdentifier(첫인자) || 첫인자.text !== 프.이름)) {
    짚기('K20', 테스트, `test(${프.이름}, 본문) 꼴이 아니다. 첫 인자는 프로시저 선언이고 본문은 그 자리에 적은 함수다`);
  }

  // 본문 맨 바깥의 문을 차례대로 가른다 — 케이스 구간이 나올 때까지 모인 문이 그 케이스의 준비 구간이다
  const 정리: ts.Statement[] = [];
  const 부름들: { 이름: string | undefined; 문: ts.Statement; call: ts.CallExpression; 준비: ts.Statement[] }[] = [];
  let 모인: ts.Statement[] = [];
  for (const s of 본문?.statements ?? []) {
    const c = 문의부름(s);
    if (c !== undefined && isTestCase(c)) {
      const 첫 = c.arguments[0];
      부름들.push({ 이름: 첫 !== undefined && ts.isIdentifier(첫) ? 첫.text : undefined, 문: s, call: c, 준비: 모인 });
      모인 = [];
    } else if (c !== undefined && isTestCleanup(c)) 정리.push(s);
    else 모인.push(s);
  }
  // 마지막 케이스 뒤 정리 선언도 뒤에 둔 코드다 — 정리는 본문 맨 앞에서 부른다
  const 뒤 = 부름들.length === 0 ? [] : (본문?.statements.filter((s) => s.pos >= 부름들.at(-1)!.문.end) ?? []);
  if (뒤.length > 0) {
    짚기('K20', 뒤[0], '마지막 test.case 뒤에 절차나 코드를 두었다. 붙을 케이스가 없어 깨져도 어느 케이스 결과에도 안 남는다 — 끝 정리는 본문 앞에서 test.cleanup 으로 건다');
  }

  const 바깥 = new Set<ts.Node>(부름들.map((b) => b.call));
  const 훑기 = (n: ts.Node): void => {
    if (isTestCase(n) && !바깥.has(n)) {
      짚기('K20', n, 'test.case 를 본문 맨 바깥에서 부르지 않았다. 다른 test.case · test.step · 조건문 · 반복문 · 안쪽 함수 안에서는 부르지 않는다');
    }
    n.forEachChild(훑기);
  };
  훑기(sf);

  for (const b of 부름들) {
    if (b.이름 === undefined || !케이스선언.has(b.이름)) 짚기('K20', b.call, 'test.case 의 첫 인자가 이 파일 맨 위에서 선언한 케이스 이름이 아니다');
    // 파일에 하나만 있으면 판정 없는 케이스가 늘 통과로 남는다
    if (판정수(b.call) === 0) 짚기('K6', b.call, `test.case(${b.이름 ?? '?'}) 구간에 verify 가 하나도 없다`, false);
  }
  for (const 이름 of 차례) {
    const 번 = 부름들.filter((b) => b.이름 === 이름);
    if (번.length === 0) 짚기('K20', 테스트 ?? 프.문, `${이름} 의 test.case 가 없다. cases 의 케이스마다 차례대로 한 번씩 부른다`);
    else if (번.length > 1) 짚기('K20', 번[1]!.call, `test.case(${이름}) 를 두 번 불렀다`);
  }
  const 어긋난자리 = 부름들.findIndex((b, i) => b.이름 !== 차례[i]);
  if (가른다 && 어긋난자리 >= 0) 짚기('K20', 부름들[어긋난자리]!.call, `test.case 차례가 cases 와 다르다. cases 는 ${차례.join(' → ')} 차례다`);

  return {
    sf,
    인자,
    케이스인자: [...케이스선언.values()].flatMap((c) => (c.인자 === undefined ? [] : [c.인자])),
    구간: 가른다 ? 부름들.map((b) => ({ 이름: b.이름!, 선언: 케이스선언.get(b.이름!)!.문, 준비: b.준비, 부름: b.문 })) : null,
    정리,
    어긋남,
  };
}

/** 글에서 바로 읽는다 — 프로시저 파일이 아니면 null */
export function 프로시저글읽기(text: string): 읽은프로시저 | null {
  return 프로시저읽기(ts.createSourceFile('procedure.spec.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS));
}

export interface 구간지문값 {
  /** 자기 구간 — 그 케이스의 선언 · 준비 구간 · 케이스 구간 */
  seg: string;
  /** 앞 흐름 — 프로시저 선언(cases 는 빼고) · 정리 선언 · 앞에 놓인 케이스들의 자기 구간(보류 케이스도 든다) */
  flow: string;
}

/**
 * 케이스마다(cases 차례대로) 지문 둘 — 자기 구간이 바뀌면 「수정」, 앞 흐름만 바뀌면 「앞 흐름이 바뀜」이다 (도메인/리포팅 §3.17 「프로시저 안 케이스의 지문 둘」).
 * 보류와 상관없이 코드에 적힌 자리대로 가른다 — 보류를 풀었다고 옆 케이스의 자기 구간이 바뀌면 안 된다.
 * import 줄과 가져다 쓰는 화면 파일 · 도우미는 어느 쪽에도 안 든다. 프로시저 파일이 아니거나 구간을 못 가르면 null
 */
export function 구간지문(text: string): 구간지문값[] | null {
  const 읽은 = 프로시저글읽기(text);
  if (읽은 === null || 읽은.구간 === null) return null;
  const 글 = (n: ts.Node): string => n.getText(읽은.sf);
  const 지문 = (조각: string[]): string => createHash('sha256').update(조각.join('\n')).digest('hex');
  const 머리 = [...(읽은.인자?.properties.filter((p) => 키(p) !== 'cases').map(글) ?? []), ...읽은.정리.map(글)];
  const 자기 = 읽은.구간.map((c) => 지문([글(c.선언), ...c.준비.map(글), 글(c.부름)]));
  return 자기.map((seg, i) => ({ seg, flow: 지문([...머리, ...자기.slice(0, i)]) }));
}
