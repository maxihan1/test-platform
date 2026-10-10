// 기법 대조 — 요구사항 표 칸의 기대 기법과 케이스 파일 techniques 를 견주는 순수 함수 (작성 §3.6 「설계 기법」 「기법 어긋남」)
// 표 글 · 파일은 모른다 — 부르는 쪽이 읽은 줄과 케이스 글을 넘긴다

import { TECHNIQUES, type Technique } from '@platform/kit/types';

import { TCID, tcId종류 } from '../apps/admin/src/catalog/rules.js';
import { 케이스기법 } from '../apps/admin/src/catalog/techniques.js';
import type { 설계 } from './authoring-design.js';
import { 번호찾기 } from './authoring-ledger.js';
import { type 표줄, 줄상태 } from './authoring-slots.js';

/** 칸의 기대 기법 — 늘 TECHNIQUES 차례 · 중복 없이. 설계 밖 경계 칸도 경계값 분석이다 */
export function 기대기법(축: string, 설계들: readonly (설계 | undefined)[]): Technique[] {
  if (축 === '경계') return ['경계값 분석'];
  if (축 !== '예외') return [];
  const 든 = new Set(설계들.flatMap((설) => 설?.예외.map((e) => e.기법) ?? []));
  return TECHNIQUES.filter((t) => 든.has(t));
}

/** 어긋남 `<tcId> — 「기대」이어야 한다(지금 「실제」)` — tcId 가 표에 처음 나온 줄 차례 */
export function 기법대조(
  원장: readonly { 번호: string; 설계?: 설계 }[],
  줄들: readonly 표줄[],
  케이스글들: ReadonlyMap<string, string>,
  기준줄: ReadonlySet<string>,
): string[] {
  const 설계들 = new Map(원장.map((h) => [h.번호, h.설계]));
  // 기준 줄의 케이스는 이 기능 전 것이라 다 어긋남이 된다 — 같은 칸에 새 줄이 붙어 기준 tcId 를 물려받아도 통째로 뺀다
  const 기준tcId = new Set([...기준줄].map((열쇠) => 열쇠.split('|')[0]));
  // 한 tcId 의 줄이 여럿이면 첫 줄의 칸으로 본다(작성 §3.6) — 다른 칸의 줄은 칸 번호 어긋남이 따로 잡는다.
  // UI 는 K14 가 · 케이스 글이 없으면 빠짐 · 형식 오류가 본다
  const 첫줄 = new Map<string, 표줄>();
  for (const 줄 of [...줄들].sort((가, 나) => 가.차례 - 나.차례)) {
    if (첫줄.has(줄.tcId) || 기준tcId.has(줄.tcId) || !TCID.test(줄.tcId) || tcId종류(줄.tcId) === 'UI') continue;
    첫줄.set(줄.tcId, 줄);
  }
  const 글로 = (목록: readonly string[]) => (목록.length > 0 ? 목록.join(' · ') : '없음');
  const 어긋남: string[] = [];
  for (const [tcId, 줄] of 첫줄) {
    const 글 = 케이스글들.get(tcId);
    // 글자로 못 읽은 것은 K14 가 잡는다 — 여기서 또 내면 거짓 어긋남이다
    const 적은 = 글 === undefined ? null : 케이스기법(글);
    if (적은 === null) continue;
    // 둘 다 TECHNIQUES 차례 · 중복 없이라 글로 견주면 집합 비교다. 오류 추정 줄은 설계가 아니라 점검 목록에서 왔다
    const 기대: Technique[] =
      줄상태(줄.출처) === '오류추정'
        ? ['오류 추정']
        : 기대기법(줄.축.trim(), 번호찾기(줄.출처).번호들.map((번호) => 설계들.get(번호)));
    if (기대.join() !== 적은.join()) 어긋남.push(`${tcId} — 「${글로(기대)}」이어야 한다(지금 「${글로(적은)}」)`);
  }
  return 어긋남;
}
