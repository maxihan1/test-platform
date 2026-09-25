// 미확정 꼬리표(unconfirmed)의 모양 검사 K11 과 「이미 있던 케이스에 새로 단 꼬리표」 판별

import ts from 'typescript';

export interface BadTag {
  node: ts.Node;
  what: string;
}

// K6 의 TITLE_KINDS 와 같은 기준이다 — 문자열 리터럴이나 치환 없는 템플릿만 글자로 읽힌다
export function badTag(literal: ts.ObjectLiteralExpression): BadTag | undefined {
  for (const p of literal.properties) {
    // 펼친 객체 안에 꼬리표가 숨어 있을 수 있는데 검사기는 그 글자를 못 읽는다
    if (ts.isSpreadAssignment(p)) return { node: p, what: '펼침(...)이 있어 unconfirmed 사유를 글자로 읽을 수 없다' };
    if (p.name === undefined || !ts.isIdentifier(p.name) || p.name.text !== 'unconfirmed') continue;
    if (!ts.isPropertyAssignment(p) || !ts.isStringLiteralLike(p.initializer)) {
      return { node: p, what: 'unconfirmed가 문자열 리터럴이 아니다' };
    }
    // defineCase 는 공백뿐인 사유를 확정으로 싣는다. 모양만 보고 통과시키면 미확정이 정식에 섞인다
    if (p.initializer.text.trim() === '') return { node: p, what: 'unconfirmed가 비어 있다' };
  }
  return undefined;
}

