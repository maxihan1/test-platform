// 케이스 파일의 확인 문장을 소스 차례대로 읽는다 — steps.ts 가 300줄을 넘어 떼어 냈다

import ts from 'typescript';

import { isVerify } from './steps.js';

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
