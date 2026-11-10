// 작성 관문의 케이스 모양 검사 — 11-09 규칙 리뷰에서 자주 걸린 꼴(기다림 · 케이스 안 화면 요소 · 문구)을 이번에 바뀐 케이스에서 잡는다
// 리뷰 지적 1,128건 가운데 783건이 관문 검사가 없는 규칙에서 나왔다(PR #697). 코드 모양으로 보이는 것만 본다 — 문장과 코드의 뜻이 같은지(R12)는 못 본다

import ts from 'typescript';

export type 모양갈래 = '기다림' | '화면 요소' | '문구';
export interface 모양지적 {
  갈래: 모양갈래;
  줄: number;
  글: string;
}

const 찾기 = new Set(['getByRole', 'getByText', 'getByTestId', 'getByLabel', 'getByPlaceholder', 'getByAltText', 'getByTitle', 'locator']);
const 조작 = new Set(['click', 'dblclick', 'fill', 'press', 'pressSequentially', 'type', 'check', 'uncheck', 'selectOption', 'setInputFiles', 'tap', 'hover', 'clear', 'goto']);
// 값을 안 기다리는 읽기 — `5-writing.md` R13 표 「아무것도 안 기다린다」
const 바로읽기 = new Set(['count', 'isVisible', 'isHidden', 'isEnabled', 'isDisabled', 'isChecked', 'allInnerTexts', 'allTextContents', 'isDisplayed']);
// Page Object 메서드는 이름에 「기다」 · 「때까지」를 넣어 기다림을 알린다(`키저장하고목록기다리기` · `댓글수가될때까지`).
// 주소 · 정해 둔 시간은 앵커가 아니다(R13 · K15) — 주소는 먼저 바뀌고 화면은 나중에 그려진다
const 앵커아님 = new Set(['waitForURL', 'waitForTimeout']);
const 기다림인가 = (이름: string): boolean => (이름.startsWith('waitFor') && !앵커아님.has(이름)) || 이름.includes('기다') || 이름.includes('때까지');

const 부른이름 = (n: ts.CallExpression): string | null => (ts.isPropertyAccessExpression(n.expression) ? n.expression.name.text : ts.isIdentifier(n.expression) ? n.expression.text : null);
const 받는쪽 = (n: ts.CallExpression, sf: ts.SourceFile): string | null => (ts.isPropertyAccessExpression(n.expression) ? n.expression.expression.getText(sf) : null);
const 줄번호 = (n: ts.Node, sf: ts.SourceFile): number => sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1;
const 짧게 = (n: ts.Node, sf: ts.SourceFile): string => {
  const 글 = n.getText(sf).replace(/\s+/g, ' ');
  return 글.length > 80 ? `${글.slice(0, 77)}…` : 글;
};

function 부름들(n: ts.Node): ts.CallExpression[] {
  const 모음: ts.CallExpression[] = [];
  const 훑기 = (x: ts.Node): void => {
    if (ts.isCallExpression(x)) 모음.push(x);
    ts.forEachChild(x, 훑기);
  };
  훑기(n);
  return 모음;
}

const verify안인가 = (n: ts.Node): boolean => {
  for (let p = n.parent; p !== undefined; p = p.parent) if (ts.isCallExpression(p) && ts.isIdentifier(p.expression) && p.expression.text === 'verify') return true;
  return false;
};

/** 절차 하나의 기다림 — 조작 뒤 기다림 없이 바로 읽기 · 기다린 locator 를 그대로 판정 (R13) */
/** 절차 하나의 기다림 — 상태는 다음 절차로 이어진다(누르는 절차 · 확인하는 절차를 나눠 쓰는 꼴) */
function 절차기다림(몸: ts.Block, sf: ts.SourceFile, 상태: { 조작뒤: boolean; 기다린: Set<string> }): 모양지적[] {
  const 지적: 모양지적[] = [];
  for (const 문 of 몸.statements) {
    const 부름 = 부름들(문);
    const 기다림 = 부름.some((c) => 기다림인가(부른이름(c) ?? ''));
    const 읽기 = 부름.filter((c) => 바로읽기.has(부른이름(c) ?? ''));
    const 짚은 = new Set<ts.CallExpression>();
    if (상태.조작뒤 && !기다림 && 읽기[0] !== undefined) {
      지적.push({ 갈래: '기다림', 줄: 줄번호(읽기[0], sf), 글: `「${짧게(읽기[0], sf)}」 — 조작 뒤 기다림 없이 바로 읽는다. 바뀔 값으로 waitFor 를 먼저 둔다(R13)` });
      짚은.add(읽기[0]);
      상태.조작뒤 = false;
    }
    for (const c of 읽기) {
      const 쪽 = 받는쪽(c, sf);
      if (!짚은.has(c) && 쪽 !== null && 상태.기다린.has(쪽) && verify안인가(c))
        지적.push({ 갈래: '기다림', 줄: 줄번호(c, sf), 글: `「${짧게(c, sf)}」 — 기다린 그 요소를 그대로 판정한다. 뜨는 것 자체가 판정이면 waitFor({ timeout: 10_000 }).then(() => true, () => false) 값을 판정한다(R13)` });
    }
    const 조작함 = 부름.some((c) => 조작.has(부른이름(c) ?? '') && 받는쪽(c, sf) !== null);
    // 조작 뒤에는 앞서 기다린 것이 다시 바뀔 수 있어 「기다린 그 요소」가 아니다
    if (조작함) 상태.기다린.clear();
    for (const c of 부름) if (기다림인가(부른이름(c) ?? '') && 받는쪽(c, sf) !== null) 상태.기다린.add(받는쪽(c, sf) as string);
    if (기다림) 상태.조작뒤 = false;
    else if (조작함) 상태.조작뒤 = true;
  }
  return 지적;
}

/** 케이스 파일의 코드 모양 — 절차마다 기다림, 파일 전체의 화면 요소 찾기 */
export function 코드모양(sf: ts.SourceFile): 모양지적[] {
  const 지적: 모양지적[] = [];
  const 상태 = { 조작뒤: false, 기다린: new Set<string>() };
  const 훑기 = (n: ts.Node): void => {
    if (ts.isCallExpression(n)) {
      const 이름 = 부른이름(n);
      const 쪽 = 받는쪽(n, sf);
      const 함수 = n.arguments[1];
      if (이름 === 'step' && 쪽 === 'test' && 함수 !== undefined && (ts.isArrowFunction(함수) || ts.isFunctionExpression(함수)) && ts.isBlock(함수.body)) 지적.push(...절차기다림(함수.body, sf, 상태));
      if (쪽 !== null && ((이름 !== null && 찾기.has(이름)) || (이름 === 'goto' && 쪽 === 'page')))
        지적.push({ 갈래: '화면 요소', 줄: 줄번호(n, sf), 글: `「${짧게(n, sf)}」 — 화면 요소 찾기 · 화면 주소는 Page Object 에 둔다(4-selector.md)` });
    }
    ts.forEachChild(n, 훑기);
  };
  훑기(sf);
  return 지적.sort((a, b) => a.줄 - b.줄);
}

// 「~하면 · ~으면」 — 「화면 · 정면」처럼 「면」으로 끝나는 낱말은 뺀다(「사라지면」의 「지면」은 조건이라 두지 않는다)
const 조건 = /(?<![화전측정표평장단양앞뒷겉옆])면[\s,]/;

/** 기능 케이스 문구 — 이름은 「<조작>하면 <결과>」, 이름 밖 판정 문장은 결과만 (`wording.md` 「자리마다 꼴」). 갈래 글자가 없는 옛 번호는 UI 인지 몰라 안 본다 */
export function 문구모양(c: { tcId: string; name: string | null; 판정: readonly string[] }): 모양지적[] {
  if (!/-FN-\d{3}$/.test(c.tcId) || c.name === null) return [];
  const 지적: 모양지적[] = [];
  if (!조건.test(c.name)) 지적.push({ 갈래: '문구', 줄: 0, 글: `name 「${c.name}」 — 기능 케이스 이름은 「<조작>하면 <결과>」 꼴이다` });
  for (const 문장 of new Set(c.판정)) if (문장 !== c.name && 조건.test(문장)) 지적.push({ 갈래: '문구', 줄: 0, 글: `「${문장}」 — 이름 밖 판정 문장은 결과만 쓴다. 조작은 절차 제목에 있다` });
  return 지적;
}

/** 관문 줄 — `볼` 이 있으면 그 tcId 만(이번 작성이 바꾼 케이스). 앞 작성의 케이스는 이번 요청 밖이라 고치게 하지 않는다 */
export function 모양확인들(케이스들: readonly { tcId: string; 모양: readonly 모양지적[] }[], 볼?: ReadonlySet<string>): string[] {
  return 케이스들.filter((c) => 볼 === undefined || 볼.has(c.tcId)).flatMap((c) => c.모양.map((x) => `${c.tcId} ${x.줄 > 0 ? `${x.줄}줄 ` : ''}[${x.갈래}] ${x.글}`));
}
