// 빠른 검사의 「확인 하나에 값 하나」 — verify 실제 값이 여러 값을 묶었는지 본다 (tpx-cases 5-writing.md R12 아래)

import ts from 'typescript';

const 벗기기 = (e: ts.Expression): ts.Expression =>
  ts.isParenthesizedExpression(e) || ts.isAwaitExpression(e) || ts.isAsExpression(e) || ts.isSatisfiesExpression(e) || ts.isNonNullExpression(e) || ts.isTypeAssertionExpression(e) ? 벗기기(e.expression) : e;
const 부름이름 = (e: ts.Expression): string | null => (ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) ? e.expression.name.text : null);
/** 값 둘 이상을 한 칸에 — `[a, b]` · `{ a, b }` · `Promise.all([a, b])`. 칸 하나(`[x]` · `[...목록]` · `{ a }`)는 값 하나다 */
const 여럿 = (e: ts.Expression): boolean =>
  (ts.isArrayLiteralExpression(e) && e.elements.length > 1) ||
  (ts.isObjectLiteralExpression(e) && e.properties.length > 1) ||
  (ts.isCallExpression(e) && e.expression.getText() === 'Promise.all' && e.arguments[0] !== undefined && 여럿(벗기기(e.arguments[0])));

/** 여럿을 그대로 넣거나 `.every` · `.some` 으로 true 하나로 줄인 것 — 실패하면 「기대 [true,true] · 실제 [false,true]」만 남아 무엇이 틀렸는지 안 보인다(MKT-FN-307). `[200, 201].includes(값)` · 화면에서 읽은 목록 하나(`allInnerTexts()`)는 값 하나라 아니다 */
export function 묶었나(n: ts.Expression): boolean {
  const e = 벗기기(n);
  const 줄임 = 부름이름(e);
  return 여럿(e) || ((줄임 === 'every' || 줄임 === 'some') && ts.isCallExpression(e) && ts.isPropertyAccessExpression(e.expression) && 여럿(벗기기(e.expression.expression)));
}
