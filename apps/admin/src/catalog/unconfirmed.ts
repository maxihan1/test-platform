// 미확정·보류 꼬리표(unconfirmed·held)의 모양 검사 K11·K13

import ts from 'typescript';

export interface BadTag {
  node: ts.Node;
  what: string;
}

// 따옴표 키('unconfirmed')·계산된 리터럴 키(['unconfirmed'])도 실행하면 같은 꼬리표다. 이름만 보면 변수 사유가 빠져나간다
export function isTagKey(name: ts.PropertyName | undefined, tag = 'unconfirmed'): boolean {
  if (name === undefined) return false;
  const key = ts.isComputedPropertyName(name) ? name.expression : name;
  return (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && key.text === tag;
}

// K6 의 TITLE_KINDS 와 같은 기준이다 — 문자열 리터럴이나 치환 없는 템플릿만 글자로 읽힌다
export function badTag(literal: ts.ObjectLiteralExpression, tag: 'unconfirmed' | 'held'): BadTag | undefined {
  for (const p of literal.properties) {
    // 펼친 객체 안에 꼬리표가 숨어 있을 수 있는데 검사기는 그 글자를 못 읽는다
    if (ts.isSpreadAssignment(p)) return { node: p, what: `펼침(...)이 있어 ${tag} 사유를 글자로 읽을 수 없다` };
    if (p.name !== undefined && ts.isComputedPropertyName(p.name) && !ts.isStringLiteralLike(p.name.expression)) {
      return { node: p, what: `계산된 키가 있어 ${tag} 사유를 글자로 읽을 수 없다` };
    }
    if (!isTagKey(p.name, tag)) continue;
    if (!ts.isPropertyAssignment(p) || !ts.isStringLiteralLike(p.initializer)) {
      return { node: p, what: `${tag}가 문자열 리터럴이 아니다` };
    }
    // defineCase 는 공백뿐인 사유를 확정으로 싣는다. 모양만 보고 통과시키면 미확정이 정식에 섞인다
    if (p.initializer.text.trim() === '') return { node: p, what: `${tag}가 비어 있다` };
  }
  return undefined;
}

// 꼬리표 · 기법 읽기가 한 걷기를 쓴다 — 따로 두면 한쪽만 고쳐져 둘이 다른 인자를 읽는다(#158 에 두 벌이었다).
// 인자 안으로 안 들어가는 까닭: 케이스의 명세는 바깥 defineCase 호출이고, 인자 안의 호출은 그 값일 뿐이다
export function defineCase인자들(text: string): ts.ObjectLiteralExpression[] {
  const sf = ts.createSourceFile('x.ts', text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const found: ts.ObjectLiteralExpression[] = [];
  const walk = (node: ts.Node): void => {
    if (ts.isObjectLiteralExpression(node) && ts.isCallExpression(node.parent)) {
      const callee = node.parent.expression;
      if (ts.isIdentifier(callee) && callee.text === 'defineCase') {
        found.push(node);
        return;
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);
  return found;
}
