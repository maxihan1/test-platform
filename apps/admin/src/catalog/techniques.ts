// 설계 기법 칸(techniques)의 모양 검사 K14 와 케이스 파일 글에서 기법을 읽는 함수

import ts from 'typescript';

import { TECHNIQUES } from '@platform/kit/types';
import type { Technique } from '@platform/kit/types';

import type { BadTag } from './unconfirmed.js';

const 낱말들: ReadonlySet<string> = new Set(TECHNIQUES);

// unconfirmed 의 isTagKey 와 같은 기준 — 따옴표 키·리터럴 계산 키도 실행하면 같은 칸이다
function isKey(name: ts.PropertyName | undefined): boolean {
  if (name === undefined) return false;
  const key = ts.isComputedPropertyName(name) ? name.expression : name;
  return (ts.isIdentifier(key) || ts.isStringLiteralLike(key)) && key.text === 'techniques';
}

// 펼침·글자가 아닌 계산 키는 K11 이 이미 막는다. 여기서 또 내면 한 자리에 위반 줄이 둘 생긴다
export function badTechniques(literal: ts.ObjectLiteralExpression, ui: boolean): BadTag[] {
  const p = literal.properties.find((x) => isKey(x.name));
  if (p === undefined) return [];
  // UI 목록에는 고르개가 없어 빈 배열이라도 아무도 못 본다
  if (ui) return [{ node: p, what: 'UI 케이스에는 techniques 를 달지 않는다' }];
  if (!ts.isPropertyAssignment(p) || !ts.isArrayLiteralExpression(p.initializer)) {
    return [{ node: p, what: 'techniques 가 배열 리터럴이 아니다' }];
  }
  const out: BadTag[] = [];
  const seen = new Set<string>();
  for (const e of p.initializer.elements) {
    if (!ts.isStringLiteralLike(e)) out.push({ node: e, what: 'techniques 원소가 문자열 리터럴이 아니다' });
    else if (!낱말들.has(e.text)) out.push({ node: e, what: `techniques 원소 「${e.text}」은 목록에 없다` });
    else if (seen.has(e.text)) out.push({ node: e, what: `techniques 에 「${e.text}」가 두 번 있다` });
    else seen.add(e.text);
  }
  return out;
}

// unconfirmed 의 hasTag 와 같은 꼴로 defineCase 인자를 찾는다
function 명세인자(글: string): ts.ObjectLiteralExpression | undefined {
  const sf = ts.createSourceFile('x.ts', 글, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let found: ts.ObjectLiteralExpression | undefined;
  const walk = (node: ts.Node): void => {
    if (found !== undefined) return;
    if (ts.isObjectLiteralExpression(node) && ts.isCallExpression(node.parent)) {
      const callee = node.parent.expression;
      if (ts.isIdentifier(callee) && callee.text === 'defineCase') {
        found = node;
        return;
      }
    }
    node.forEachChild(walk);
  };
  walk(sf);
  return found;
}

// 작성 쪽이 칸의 기대 기법과 견준다. null 은 「글자로 못 읽었다」 — 「기법 없음」([])과 갈라야 거짓 어긋남이 안 난다
export function 케이스기법(글: string): Technique[] | null {
  const literal = 명세인자(글);
  if (literal === undefined) return null;
  const 숨김 = literal.properties.some(
    (p) => ts.isSpreadAssignment(p) || (p.name !== undefined && ts.isComputedPropertyName(p.name) && !ts.isStringLiteralLike(p.name.expression)),
  );
  if (숨김) return null;
  const p = literal.properties.find((x) => isKey(x.name));
  if (p === undefined) return [];
  if (!ts.isPropertyAssignment(p) || !ts.isArrayLiteralExpression(p.initializer)) return null;
  const 글자 = p.initializer.elements.filter(ts.isStringLiteralLike);
  if (글자.length !== p.initializer.elements.length) return null;
  return 글자.map((e) => e.text).filter((t): t is Technique => 낱말들.has(t));
}
