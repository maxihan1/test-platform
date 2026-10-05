// 설계 기법 칸(techniques)의 모양 검사 K14 와 케이스 파일 글에서 기법을 읽는 함수

import ts from 'typescript';

import { TECHNIQUES } from '@platform/kit/types';
import type { Technique } from '@platform/kit/types';

import { type BadTag, defineCase인자들, isTagKey } from './unconfirmed.js';

const 낱말들: ReadonlySet<string> = new Set(TECHNIQUES);
// 따옴표 키·리터럴 계산 키도 실행하면 같은 칸이다
const isKey = (name: ts.PropertyName | undefined): boolean => isTagKey(name, 'techniques');

// 펼침·글자가 아닌 계산 키는 K11 이 이미 막는다. 여기서 또 내면 한 자리에 위반 줄이 둘 생긴다.
// UI 케이스인지는 실행한 tcId 로 checkSpec 이 본다 — 여기는 꼴만
export function badTechniques(literal: ts.ObjectLiteralExpression): BadTag[] {
  const p = literal.properties.find((x) => isKey(x.name));
  if (p === undefined) return [];
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

// 작성 쪽이 칸의 기대 기법과 견준다. null 은 「글자로 못 읽었다」 — 「기법 없음」([])과 갈라야 거짓 어긋남이 안 난다
export function 케이스기법(글: string): Technique[] | null {
  const literal = defineCase인자들(글)[0];
  if (literal === undefined) return null;
  const 숨김 = literal.properties.some(
    (p) => ts.isSpreadAssignment(p) || (p.name !== undefined && ts.isComputedPropertyName(p.name) && !ts.isStringLiteralLike(p.name.expression)),
  );
  if (숨김) return null;
  const p = literal.properties.find((x) => isKey(x.name));
  if (p === undefined) return [];
  if (!ts.isPropertyAssignment(p) || !ts.isArrayLiteralExpression(p.initializer)) return null;
  const 글자 = p.initializer.elements.filter(ts.isStringLiteralLike).map((e) => e.text);
  // 목록 밖 낱말도 K14 몫이다 — 버리고 견주면 적힌 낱말을 「없음」으로 안내한다
  if (글자.length !== p.initializer.elements.length || 글자.some((t) => !낱말들.has(t))) return null;
  return TECHNIQUES.filter((t) => 글자.includes(t));
}
