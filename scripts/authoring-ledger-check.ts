// 원장 대조 — 원장의 번호마다 요구사항 표에서 케이스로 덮였는지, 「제외」 표에 사유와 함께 한 줄로 있는지 본다
// 에이전트가 올리기 직전에 부르고(빠지면 올리기 거절), 사람과 자식은 `npm run check:ledger` 로 부른다 (도메인/작성 §3.6 「★ 원장」)

import { type 원장항목, 번호찾기 } from './authoring-ledger.js';

/** 제외 종류 — 닫힌 다섯. **목록의 정본은 여기다** — 명세 · 스킬은 이 목록을 가리킨다 */
export const 제외종류 = ['다음 요청', '되돌릴 수 없음', '자료 없음', '요구 아님', '사람이 뺌'] as const;
export type 제외종류 = (typeof 제외종류)[number];

/** 출처 칸 하나에 몰아 적을 수 있는 번호 수 — 한 줄에 원장을 통째로 적어 대조를 통과하지 못하게 */
const 출처상한 = 10;
const tcId꼴 = /^[A-Z][A-Z0-9]{0,11}-\d+$/;

export interface 셈 {
  총: number;
  케이스: number;
  제외: Partial<Record<제외종류, number>>;
  빠짐: number;
}

export interface 대조결과 {
  빠짐: string[];
  형식오류: string[];
  경고: string[];
  셈: 셈;
}

/** 케이스 파일 글들에서 tcId 를 모은다 — 대조의 `있는케이스` 재료. 파일 이름이 아니라 선언을 본다(K2 가 그것을 지킨다) */
export function tcId들(글들: string[]): Set<string> {
  return new Set(글들.flatMap((글) => [...글.matchAll(/\btcId:\s*['"]([^'"]+)['"]/g)].map((m) => m[1] ?? '')));
}

/** 마크다운 표 한 줄을 칸으로. `\|` 는 칸 가름이 아니다 */
function 칸들(줄: string): string[] {
  return 줄
    .trim()
    .replace(/^\||\|$/g, '')
    .split(/(?<!\\)\|/)
    .map((c) => c.trim());
}

/** `## <제목>` 절 아래 첫 표를 머리 칸 이름으로 읽는다. 절이 없으면 빈 배열 */
function 표읽기(글: string, 제목: string): Record<string, string>[] {
  const 줄들 = 글.split(/\r?\n/);
  const 시작 = 줄들.findIndex((l) => new RegExp(`^##\\s+${제목}\\s*$`).test(l.trim()));
  if (시작 < 0) return [];
  const 행: Record<string, string>[] = [];
  let 머리: string[] | null = null;
  for (const l of 줄들.slice(시작 + 1)) {
    if (/^#{1,2}\s/.test(l)) break;
    if (!l.trim().startsWith('|')) {
      if (머리 !== null) break;
      continue;
    }
    const 칸 = 칸들(l);
    if (머리 === null) {
      머리 = 칸;
      continue;
    }
    if (칸.every((c) => /^:?-+:?$/.test(c))) continue;
    행.push(Object.fromEntries(머리.map((h, i) => [h, 칸[i] ?? ''])));
  }
  return 행;
}

/**
 * 원장을 표와 맞댄다.
 * `있는케이스` — 올릴 트리에 실제로 있는 tcId. 주면 요구 줄의 tcId 파일이 있어야 덮은 것으로 친다(자식이 쓴 표만 믿지 않는다).
 * `에이전트` — 참이면 「사람이 뺌」을 형식 오류로 친다. 작성 에이전트의 자식은 사람 결정을 대신 못 한다
 */
export function 원장대조(
  원장: 원장항목[],
  표글: string,
  선택: { 있는케이스?: Set<string>; 에이전트: boolean },
): 대조결과 {
  const 형식오류: string[] = [];
  const 케이스로 = new Set<string>();
  const 제외로 = new Map<string, 제외종류>();
  const 표번호 = new Set<string>();

  for (const 행 of 표읽기(표글, '요구사항')) {
    const 번호들 = 번호찾기(행['출처'] ?? '').번호들;
    번호들.forEach((b) => 표번호.add(b));
    if (번호들.length > 출처상한) {
      형식오류.push(`요구 줄 출처 칸에 번호가 ${String(번호들.length)}개다 — ${String(출처상한)}개까지`);
      continue;
    }
    const tcId = (행['tcId'] ?? '').trim();
    if (!tcId꼴.test(tcId)) continue;
    if (선택.있는케이스 !== undefined && !선택.있는케이스.has(tcId)) {
      형식오류.push(`요구 줄의 tcId ${tcId} 케이스 파일이 없다`);
      continue;
    }
    번호들.forEach((b) => 케이스로.add(b));
  }

  for (const 행 of 표읽기(표글, '제외')) {
    const 요구 = 행['요구'] ?? '';
    const 종류 = (행['종류'] ?? '').trim();
    const 번호들 = 번호찾기(요구).번호들;
    번호들.forEach((b) => 표번호.add(b));
    const 틀림 = (까닭: string) => 형식오류.push(`제외 줄 「${요구}」 — ${까닭}`);
    if (/[~～]/.test(요구)) {
      틀림('범위는 못 쓴다');
      continue;
    }
    if (번호들.length !== 1) {
      틀림('한 줄에 번호 하나');
      continue;
    }
    if (!(제외종류 as readonly string[]).includes(종류)) {
      틀림(`모르는 종류 「${종류}」`);
      continue;
    }
    if (종류 === '사람이 뺌' && 선택.에이전트) {
      틀림('「사람이 뺌」은 사람 세션만 쓴다');
      continue;
    }
    if ((행['사유'] ?? '').trim() === '') {
      틀림('사유가 비었다');
      continue;
    }
    제외로.set(번호들[0] ?? '', 종류 as 제외종류);
  }

  const 원장번호 = new Set(원장.map((h) => h.번호));
  const 빠짐 = 원장.map((h) => h.번호).filter((b) => !케이스로.has(b) && !제외로.has(b));
  const 밖 = [...표번호].filter((b) => !원장번호.has(b));
  const 제외셈: Partial<Record<제외종류, number>> = {};
  for (const [b, 종류] of 제외로) if (원장번호.has(b) && !케이스로.has(b)) 제외셈[종류] = (제외셈[종류] ?? 0) + 1;
  return {
    빠짐,
    형식오류,
    경고: 밖.length > 0 ? [`원장에 없는 번호가 표에 있다 — ${밖.join(' · ')}`] : [],
    셈: {
      총: 원장.length,
      케이스: 원장.filter((h) => 케이스로.has(h.번호)).length,
      제외: 제외셈,
      빠짐: 빠짐.length,
    },
  };
}

/** 올리기 거절 까닭 — 짧게. 이어받는 자식은 전체 목록 파일을 읽는다 */
export function 까닭글(결과: 대조결과, 목록파일: string): string {
  const 앞 = 결과.빠짐.slice(0, 10).join(' · ');
  const 더 = 결과.빠짐.length > 10 ? ' …' : '';
  return `원장 대조: 빠진 요구 ${String(결과.빠짐.length)}개 · 형식 오류 ${String(결과.형식오류.length)}개 — ${앞}${더} · 전체는 ${목록파일}`;
}

/** PR 본문 머리에 싣는 셈 한 줄 — 에이전트가 센 것이다(자식 요약을 믿지 않는다) */
export function 셈글(셈: 셈, 가족: Record<string, number>): string {
  const 제외수 = Object.values(셈.제외).reduce((a, n) => a + (n ?? 0), 0);
  const 종류별 = Object.entries(셈.제외)
    .map(([k, n]) => `${k} ${String(n)}`)
    .join(' · ');
  const 가족글 = Object.entries(가족)
    .map(([k, n]) => `${k} ${String(n)}`)
    .join(' · ');
  return `원장: 요구 ${String(셈.총)} → 케이스 ${String(셈.케이스)} · 제외 ${String(제외수)}${종류별 === '' ? '' : `(${종류별})`} · 빠짐 ${String(셈.빠짐)}${가족글 === '' ? '' : ` · 번호 가족 ${가족글}`}`;
}
