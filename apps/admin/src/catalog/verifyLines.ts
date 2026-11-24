// 케이스 파일의 확인 문장을 소스 차례대로 읽는다 — steps.ts 가 300줄을 넘어 떼어 냈다

import ts from 'typescript';

import { 프로시저글읽기 } from './procedure.js';
import { isTestCleanup, isVerify } from './steps.js';

/**
 * 케이스 파일의 `verify('문장', …)` · `verify.element` · `verify.rates` 첫 인자를 소스 차례대로. 문자열이 아닌 첫 인자는 건너뛴다(K6 이 따로 잡는다).
 * 코드를 실행하지 않고 읽는다 — 작성 끝내기가 확인 문장을 싣는 데 쓴다
 */
export function 확인문장들(text: string): string[] {
  const sf = ts.createSourceFile('case.spec.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const 문장들: string[] = [];
  const walk = (node: ts.Node): void => {
    if (ts.isCallExpression(node) && isVerify(node)) {
      const 첫 = node.arguments[0];
      if (첫 !== undefined && ts.isStringLiteralLike(첫)) 문장들.push(첫.text);
    }
    node.forEachChild(walk);
  };
  walk(sf);
  return 문장들;
}

/**
 * 노드 안의 판정 호출 첫 인자(글자 리터럴)를 코드 차례대로 모은다 — 같은 문장은 한 번, 정리(`test.cleanup`) 안은 기대 결과가 아니라 뺀다.
 * 리터럴이 아닌 첫 인자는 건너뛴다
 */
function 판정문장(node: ts.Node): string[] {
  const 문장들: string[] = [];
  const walk = (n: ts.Node): void => {
    if (isTestCleanup(n)) return;
    if (ts.isCallExpression(n) && isVerify(n)) {
      const 첫 = n.arguments[0];
      if (첫 !== undefined && ts.isStringLiteralLike(첫) && !문장들.includes(첫.text)) 문장들.push(첫.text);
    }
    n.forEachChild(walk);
  };
  walk(node);
  return 문장들;
}

/** 옛 꼴 케이스 파일 — `test(spec, 본문)` 본문 안의 확인 문장. test 호출이 없으면 못 읽은 것이라 null */
export function 케이스확인문장(text: string): string[] | null {
  const sf = ts.createSourceFile('case.spec.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const 본문들: ts.Node[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === 'test') {
      if (n.arguments[1] !== undefined) 본문들.push(n.arguments[1]);
      return;
    }
    n.forEachChild(walk);
  };
  walk(sf);
  return 본문들.length === 0 ? null : [...new Set(본문들.flatMap(판정문장))];
}

/**
 * 프로시저 파일의 케이스마다(cases 차례대로) 확인 문장 — 그 케이스의 `test.case` 안 것만이다. 케이스 사이 준비 구간의 확인은 어느 케이스 몫도 아니다.
 * 프로시저 파일이 아니거나 구간을 못 가르면 null
 */
export function 프로시저확인문장(text: string): string[][] | null {
  const 읽은 = 프로시저글읽기(text);
  return 읽은?.구간?.map((c) => 판정문장(c.부름)) ?? null;
}
