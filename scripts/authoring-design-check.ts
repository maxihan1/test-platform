// 설계 대조 — 요구사항 표가 원장 설계가 요구한 경계 · 예외 칸을 덮었는지 보고 PR 머리 줄을 만든다
// 표 글은 모른다 — 읽기는 authoring-ledger-check.ts 가 하고 읽은 줄을 넘긴다(거꾸로 import 하면 순환이 생긴다)

import { type 설계, 설계요약 } from './authoring-design.js';
import { 번호찾기 } from './authoring-ledger.js';
import { type 표줄, 기준줄열쇠, 줄상태 } from './authoring-slots.js';

export interface 설계항목 {
  번호: string;
  설계?: 설계;
}

export interface 설계대조결과 {
  /** 설계가 요구했는데 줄도 거절도 없는 칸 `REQ-… 경계` — 원장 차례, 한 요구 안에서 경계 → 예외 */
  빠짐: string[];
  /** 정식 줄이 설계에 없는 축을 쓴 칸 — 허용하고 보고만 한다 */
  밖: string[];
  /** 「설계 거절」 표로 면제한 칸 */
  거절: string[];
  형식오류: string[];
}

const 칸축 = ['경계', '예외'] as const;
type 칸축 = (typeof 칸축)[number];
const 칸축인가 = (글: string): 글 is 칸축 => (칸축 as readonly string[]).includes(글);

/** 표가 설계 칸을 덮었는지. 칸은 축이 같은 줄이면 상태 · 기준 줄 여부와 상관없이 채운다(오류 추정 줄만 빼고) — 칸을 다뤘는지만 본다. tcId 꼴 · 케이스 파일을 보는 원장대조의 덮음보다 느슨하다 (작성 §3.6 「설계 기법」) */
export function 설계대조(
  원장: 설계항목[],
  줄들: 표줄[],
  거절행들: Record<string, string>[],
  제외번호: ReadonlySet<string>,
  기준줄: ReadonlySet<string>,
): 설계대조결과 {
  const 설계들 = new Map(원장.map((h) => [h.번호, h.설계]));
  const 요구한다 = (번호: string, 축: 칸축) => (설계들.get(번호)?.[축].length ?? 0) > 0;
  const 원장차례로 = (칸들: Set<string>) =>
    원장.flatMap(({ 번호 }) => 칸축.map((축) => `${번호} ${축}`)).filter((칸) => 칸들.has(칸));

  const 형식오류: string[] = [];
  const 거절칸 = new Set<string>();
  for (const 행 of 거절행들) {
    const 요구칸 = (행['요구'] ?? '').trim();
    const 축 = (행['축'] ?? '').trim();
    const [번호, ...더] = 번호찾기(요구칸).번호들;
    const 틀림 = (까닭: string) => 형식오류.push(`설계 거절 줄 「${요구칸}」 — ${까닭}`);
    // 범위 · 여러 번호를 받으면 한 줄로 요구 여럿을 말없이 빼게 된다 — 칸마다 까닭을 남기게 한다
    if (/[~～]/.test(요구칸)) 틀림('범위는 안 된다');
    else if (번호 === undefined || 더.length > 0) 틀림('요구 번호가 하나가 아니다');
    else if (!칸축인가(축)) 틀림('축은 경계 · 예외 중 하나다');
    else if ((행['까닭'] ?? '').trim() === '') 틀림('까닭이 비었다');
    // 설계가 요구하지 않는 칸의 거절은 무시한다 — 앞 실행이 main 에 남긴 거절 줄이 기획서 개정으로 쓸모없어져도 관문 0 을 막지 않게
    else if (요구한다(번호, 축)) 거절칸.add(`${번호} ${축}`);
  }

  const 번호줄 = new Map<string, 표줄[]>();
  for (const 줄 of 줄들) {
    for (const 번호 of new Set(번호찾기(줄.출처).번호들)) 번호줄.set(번호, [...(번호줄.get(번호) ?? []), 줄]);
  }
  const 빠짐: string[] = [];
  for (const { 번호, 설계: 설 } of 원장) {
    const 든줄 = 번호줄.get(번호) ?? [];
    // 줄이 없으면 원장대조가 빠짐으로 세고, 기준 줄만 있으면 사람이 이미 본 요구다 — 여기서 또 몰지 않는다
    if (설 === undefined || 제외번호.has(번호) || 든줄.every((줄) => 기준줄.has(기준줄열쇠(줄)))) continue;
    // 오류 추정 줄은 점검 목록으로 찌른 것이라 설계가 요구한 틀린 입력을 다룬 게 아니다 — 칸을 못 채운다
    const 채운줄 = 든줄.filter((줄) => 줄상태(줄.출처) !== '오류추정');
    for (const 축 of 칸축) {
      if (설[축].length > 0 && !거절칸.has(`${번호} ${축}`) && !채운줄.some((줄) => 줄.축.trim() === 축)) 빠짐.push(`${번호} ${축}`);
    }
  }

  // 설계 밖은 사람이 PR 에서 본다 — 상태 표시 줄 · 기준 줄은 이미 따로 가려졌거나 사람이 본 것이라 안 센다
  const 밖칸 = new Set<string>();
  for (const 줄 of 줄들) {
    const 축 = 줄.축.trim();
    if (!칸축인가(축) || 줄상태(줄.출처) !== '정식' || 기준줄.has(기준줄열쇠(줄))) continue;
    const 출처번호 = 번호찾기(줄.출처).번호들;
    const 든 = 원장.filter((h) => 출처번호.includes(h.번호));
    const [첫] = 든;
    if (첫 !== undefined && !든.some((h) => 요구한다(h.번호, 축))) 밖칸.add(`${첫.번호} ${축}`);
  }

  return { 빠짐, 밖: 원장차례로(밖칸), 거절: 원장차례로(거절칸), 형식오류 };
}

export function 경고줄(이름: string, 목록: string[], 앞수: number, 머리 = '⚠️ '): string[] {
  if (목록.length === 0) return [];
  const 더 = 목록.length > 앞수 ? ' …' : '';
  return [`${머리}${이름} ${String(목록.length)} — ${목록.slice(0, 앞수).join(' · ')}${더}`];
}

/** PR 머리 설계 줄. 요약은 늘 싣는다 — 덜 잡힌 문서(설계가 적게 붙은 요구)가 사람 눈에 보이게 */
export function 설계줄들(원장: 설계항목[], 결과: 설계대조결과 | null): string[] {
  const 요약 = 설계요약(원장);
  if (결과 === null) return [요약];
  return [
    요약,
    ...경고줄('설계 칸 빠짐', 결과.빠짐, 10),
    ...경고줄('설계 거절 형식 오류', 결과.형식오류, 3),
    ...경고줄('설계 거절', 결과.거절, 10, ''),
    ...경고줄('설계 밖 칸', 결과.밖, 10, ''),
  ];
}
