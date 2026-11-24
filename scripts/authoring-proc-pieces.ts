// 프로시저 파일을 케이스마다 쪼갠 글로 읽는다 — 「파일 하나 = 케이스 하나」로 읽던 검사들이 이 조각을 받아 그대로 돈다 (도메인/작성 §3.6 「★ 테스트 프로시저 작성」 「관문」)
// 구간을 가르는 일은 스캐너와 같은 함수(catalog/procedure.ts)가 한다 — 둘이 따로 가르면 「이 절차는 어느 케이스 것인가」가 검사와 화면에서 달라진다

import ts from 'typescript';

import { 프로시저글읽기, 프로시저읽기 } from '../apps/admin/src/catalog/procedure.js';
import { 명세글, 케이스tcId } from './authoring-held-apply.js';

export interface 케이스조각 {
  tcId: string;
  /** 옛 꼴은 파일 글 그대로. 프로시저 안 케이스는 그 케이스의 선언 · 준비 구간 · 케이스 구간만 이은 글이다 */
  글: string;
  /** 프로시저 안 케이스만 */
  프로시저?: {
    /** 글자로 못 읽었으면 null */
    procId: string | null;
    /** 프로시저의 precondition */
    전제: string[];
    /** 그 케이스의 선언과 `test.case` 구간만 — 결과 문장 · 확인 문장은 여기서 읽는다. 구간을 못 갈랐으면 선언뿐이다 */
    구간글: string;
  };
}

const 이름 = (p: ts.ObjectLiteralElementLike): string | undefined =>
  ts.isPropertyAssignment(p) && (ts.isIdentifier(p.name) || ts.isStringLiteral(p.name)) ? p.name.text : undefined;
const 칸 = (o: ts.ObjectLiteralExpression | undefined, 키: string): ts.Expression | undefined =>
  o?.properties.find((p): p is ts.PropertyAssignment => 이름(p) === 키)?.initializer;
const 글자 = (n: ts.Expression | undefined): string | null => (n !== undefined && ts.isStringLiteralLike(n) ? n.text : null);
const 글자들 = (n: ts.Expression | undefined): string[] => (n !== undefined && ts.isArrayLiteralExpression(n) ? n.elements.flatMap((e) => 글자(e) ?? []) : []);

/** 맨 위 `const 이름 = defineCase({...})` — 이름 → 선언 문과 그 인자 */
function 케이스선언들(sf: ts.SourceFile): Map<string, { 문: ts.VariableStatement; 인자: ts.ObjectLiteralExpression | undefined }> {
  const 표 = new Map<string, { 문: ts.VariableStatement; 인자: ts.ObjectLiteralExpression | undefined }>();
  for (const s of sf.statements) {
    if (!ts.isVariableStatement(s)) continue;
    for (const d of s.declarationList.declarations) {
      const 값 = d.initializer;
      if (!ts.isIdentifier(d.name) || 값 === undefined || !ts.isCallExpression(값) || !ts.isIdentifier(값.expression) || 값.expression.text !== 'defineCase') continue;
      const 첫 = 값.arguments[0];
      표.set(d.name.text, { 문: s, 인자: 첫 !== undefined && ts.isObjectLiteralExpression(첫) ? 첫 : undefined });
    }
  }
  return 표;
}

export interface 프로시저값 {
  procId: string | null;
  전제: string[];
  /** `cases` 차례대로의 케이스 번호. `cases` 를 글자로 못 읽으면 선언 차례 — 꼴 어긋남은 K19 가 따로 짚는다 */
  케이스: string[];
  조각: 케이스조각[];
}

/** 프로시저 파일이 아니면 null */
export function 프로시저값읽기(글: string): 프로시저값 | null {
  const 읽은 = 프로시저글읽기(글);
  if (읽은 === null) return null;
  const sf = 읽은.sf;
  const 원 = (n: ts.Node): string => n.getText(sf);
  const 선언들 = 케이스선언들(sf);
  const cases식 = 칸(읽은.인자, 'cases');
  const 이름들 =
    cases식 !== undefined && ts.isArrayLiteralExpression(cases식) && cases식.elements.every(ts.isIdentifier)
      ? [...new Set(cases식.elements.map((e) => (e as ts.Identifier).text))]
      : [...선언들.keys()];
  const 구간 = new Map((읽은.구간 ?? []).map((c) => [c.이름, c]));
  const procId = 글자(칸(읽은.인자, 'procId'));
  const 전제 = 글자들(칸(읽은.인자, 'precondition'));
  const 조각 = 이름들.flatMap((이): 케이스조각[] => {
    const 선 = 선언들.get(이);
    const tcId = 글자(칸(선?.인자, 'tcId'));
    if (선 === undefined || tcId === null) return [];
    const 구 = 구간.get(이);
    const 구간글 = [원(선.문), ...(구 === undefined ? [] : [원(구.부름)])].join('\n');
    return [{ tcId, 글: [원(선.문), ...(구?.준비.map(원) ?? []), ...(구 === undefined ? [] : [원(구.부름)])].join('\n'), 프로시저: { procId, 전제, 구간글 } }];
  });
  return { procId, 전제, 케이스: 조각.map((c) => c.tcId), 조각 };
}

/** 케이스 파일 글 → 케이스마다 한 조각. 옛 꼴은 한 조각(tcId 를 못 읽으면 없음), 프로시저 파일은 `cases` 차례대로 케이스마다 */
export function 케이스조각들(글: string): 케이스조각[] {
  const 프 = 프로시저값읽기(글);
  if (프 !== null) return 프.조각;
  const tcId = 케이스tcId(글);
  return tcId === null ? [] : [{ tcId, 글 }];
}

/** 파일의 `defineCase` 인자 전부 — 옛 꼴은 첫 선언 하나(지금 읽는 법 그대로), 프로시저 파일은 맨 위 선언마다. sf 는 부모 고리를 건 것이어야 한다 */
export function 명세글들(sf: ts.SourceFile): ts.ObjectLiteralExpression[] {
  if (프로시저읽기(sf) === null) {
    const 하나 = 명세글(sf);
    return 하나 === undefined ? [] : [하나];
  }
  return [...케이스선언들(sf).values()].flatMap((c) => (c.인자 === undefined ? [] : [c.인자]));
}
