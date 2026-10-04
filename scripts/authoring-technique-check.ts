// 기법 대조 — 요구사항 표 칸의 기대 기법과 케이스 파일 techniques 를 견주는 순수 함수 (작성 §3.6 「설계 기법」 「기법 어긋남」)
// 표 글 · 파일은 모른다 — 부르는 쪽이 읽은 줄과 케이스 글을 넘긴다

import { TECHNIQUES, type Technique } from '@platform/kit/types';

import { TCID, tcId종류 } from '../apps/admin/src/catalog/rules.js';
import { 케이스기법 } from '../apps/admin/src/catalog/techniques.js';
import type { 설계 } from './authoring-design.js';
import { 번호찾기 } from './authoring-ledger.js';
import { type 표줄, 기준줄열쇠 } from './authoring-slots.js';

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
  // 기준 줄은 이 기능 전 케이스라 다 어긋남이 된다 · UI 는 K14 가 · 케이스 글이 없으면 빠짐 · 형식 오류가 본다
  const 칸들 = new Map<string, { 축: string; 번호들: Set<string> }>();
  for (const 줄 of [...줄들].sort((가, 나) => 가.차례 - 나.차례)) {
    if (기준줄.has(기준줄열쇠(줄)) || !TCID.test(줄.tcId) || tcId종류(줄.tcId) === 'UI' || !케이스글들.has(줄.tcId)) continue;
    const 칸 = 칸들.get(줄.tcId) ?? { 축: 줄.축.trim(), 번호들: new Set<string>() };
    // 축이 다른 줄은 칸 번호 어긋남이 따로 잡는다 — 그 줄 설계를 섞으면 정상 줄의 예외 기법이 기대에 든다 (2026-10-05 계획 대조)
    if (줄.축.trim() !== 칸.축) continue;
    for (const 번호 of 번호찾기(줄.출처).번호들) 칸.번호들.add(번호);
    칸들.set(줄.tcId, 칸);
  }
  const 글로 = (목록: readonly string[]) => (목록.length > 0 ? 목록.join(' · ') : '없음');
  const 어긋남: string[] = [];
  for (const [tcId, { 축, 번호들 }] of 칸들) {
    const 적은 = 케이스기법(케이스글들.get(tcId) ?? '');
    // 글자로 못 읽은 것은 K14 가 잡는다 — 여기서 또 내면 거짓 어긋남이다
    if (적은 === null) continue;
    const 기대 = 기대기법(축, [...번호들].map((번호) => 설계들.get(번호)));
    // 둘 다 TECHNIQUES 차례 · 중복 없이 맞춰 글로 견주면 집합 비교다
    const 지금 = TECHNIQUES.filter((t) => 적은.includes(t));
    if (기대.join() !== 지금.join()) 어긋남.push(`${tcId} — 「${글로(기대)}」이어야 한다(지금 「${글로(지금)}」)`);
  }
  return 어긋남;
}
