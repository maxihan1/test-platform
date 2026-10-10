// 표준 기획서 옮기기 — 자식이 쓴 결과를 읽어 판 전체로 합치고 원본 원장과 기계로 대조한다 (도메인/작성 §3.6 「★ 표준 기획서」 「옮기기」)
// 작성의 원장도 여기서 만든다 — 케이스는 표준 기획서만 읽는다(「작성은 표준 기획서만 읽는다」).
// 파일 · 서버를 만지는 껍데기는 authoring-prd-io.ts 다. 같은 결과 파일이면 같은 판 · 같은 대조 · 같은 원장이 나와야 한다

import type { PrdItem } from '@platform/kit/types';

// 서버와 같은 검사를 쓴다 — 항목 하나가 상한을 넘어 판 전체가 거절되지 않게 미리 그 항목만 거른다
import { type 들어온항목, 번호수, 항목검사 } from '../apps/admin/src/prd/rules.js';
import { type 설계, 설계하기 } from './authoring-design.js';
import { 경고줄 } from './authoring-design-check.js';
import { type 원장, type 원장항목, 가족 } from './authoring-ledger.js';

/**
 * 결과 파일의 항목. `임시` 는 번호가 아직 없는 새 항목에 자식이 단 자리 번호(`<접두사>-NEW-001`)다 —
 * 번호는 서버가 올릴 때 매기므로 자식은 이것을 요구사항 표 출처 칸에 적고, 올린 뒤 에이전트가 받은 번호로 바꿔 적는다
 */
export type 옮긴항목 = 들어온항목 & { 임시?: string };

/** 자식이 쓴 결과 파일(`out/prd.json`). 항목 키는 서버 PrdItem 과 같다. 꼴의 정본은 tpx-author `references/prd.md` */
export interface 옮긴것 {
  /** 이번 자료에서 나온 항목. 번호가 있으면 지금 판의 그 항목을 고친 것이다 */
  items: 옮긴항목[];
  /** 이번 자료가 없앤 지금 판 번호. 적지 않은 기존 항목은 남는다 */
  removed: string[];
  /** 원장 번호 가운데 요구가 아닌 것(화면 ID · 오류 코드) — 빠짐으로 안 센다 */
  notRequirements: { ref: string; reason: string }[];
  /** 모양 · 상한을 어겨 뺀 항목 — `<자리>.<칸>` */
  버림: string[];
}

const 글목록 = <T>(값: unknown, 고르기: (x: unknown) => T | null): T[] =>
  Array.isArray(값) ? 값.flatMap((x) => { const v = 고르기(x); return v === null ? [] : [v]; }) : [];

/** 임시 번호 꼴. 원장 번호 꼴(`authoring-ledger` 번호찾기)이라 관문 0 · 번호 명령이 그대로 읽는다. 접두사는 SPEC §2 꼴이라 정규식에 그대로 넣는다 */
export const 임시꼴 = (접두사: string) => new RegExp(`^${접두사}-NEW-(\\d+)$`);

/**
 * 결과 파일을 읽는다. 지울 번호 · 요구 아님은 틀린 줄만 버린다 — 지울 번호를 버리면 항목이 남는 쪽이라 안전하다.
 * **근거가 화면뿐인 항목은 자식이 뭐라 적든 확인 필요다** — 확정은 사람이 판단한 것만이다.
 * 번호도 임시 번호도 없는 새 항목에는 임시 번호를 차례로 단다 — 같은 파일이면 같은 번호라 자식의 원장과 에이전트의 원장이 같다
 */
export function 옮긴것읽기(몸: unknown, 접두사: string): 옮긴것 | { 사유: string } {
  const x = typeof 몸 === 'object' && 몸 !== null && !Array.isArray(몸) ? (몸 as Record<string, unknown>) : null;
  if (x === null || !Array.isArray(x.items)) return { 사유: 'items 목록이 없다' };
  const items: 옮긴항목[] = [];
  const 버림: string[] = [];
  const 본번호 = new Set<string>();
  const 임시 = 임시꼴(접두사);
  for (const [i, 항목] of x.items.entries()) {
    // 임시 번호는 서버 번호 꼴이 아니라 검사 전에 떼어 둔다
    const 날번호 = (항목 as { reqId?: unknown } | null)?.reqId;
    const 임시번호 = typeof 날번호 === 'string' && 임시.test(날번호) ? 날번호 : undefined;
    const 읽음 = 항목검사([임시번호 === undefined ? 항목 : { ...(항목 as object), reqId: undefined }], 접두사);
    const 번호 = 임시번호 ?? ('items' in 읽음 ? 읽음.items[0]?.reqId : undefined);
    if ('error' in 읽음 || (번호 !== undefined && 본번호.has(번호))) {
      버림.push(`${String(i)}.${'error' in 읽음 ? 읽음.detail.replace(/^0\.?/, '') : 'reqId'}`);
      continue;
    }
    const 읽은 = 읽음.items[0]!;
    if (번호 !== undefined) 본번호.add(번호);
    items.push({ ...(읽은.basis.every((b) => b.from === '화면') ? { ...읽은, status: 'NEEDS_CHECK' as const } : 읽은), ...(임시번호 === undefined ? {} : { 임시: 임시번호 }) });
  }
  let 끝 = Math.max(0, ...items.map((i) => Number(임시.exec(i.임시 ?? '')?.[1] ?? 0)));
  for (const i of items) if (i.reqId === undefined && i.임시 === undefined) i.임시 = `${접두사}-NEW-${String(++끝).padStart(3, '0')}`;
  const 문자 = (v: unknown) => (typeof v === 'string' && v.trim() !== '' ? v : null);
  return {
    items,
    removed: 글목록(x.removed, 문자),
    notRequirements: 글목록(x.notRequirements, (r) => {
      const 줄 = (typeof r === 'object' && r !== null ? r : {}) as Record<string, unknown>;
      const ref = 문자(줄.ref);
      return ref === null ? null : { ref, reason: 문자(줄.reason) ?? '까닭 없음' };
    }),
    버림,
  };
}

/**
 * 보낼 판 전체 — 서버는 보내지 않은 번호를 지운다(§7 에이전트 `POST …/:id/prd`).
 * 그래서 지금 판 차례를 지키며 고친 항목은 그 자리에, 지운다고 적은 번호만 빼고, **적지 않은 기존 항목은 그대로 남긴다** —
 * 원본이 일부 기능만 담아도 나머지 기능 항목이 안 지워지고, 자식이 빠뜨려도 항목이 사라지지 않는다(2026-10-10 시작 질문). 새 항목은 끝에.
 * `앞번호` 는 자식 앞 판(기준 판)의 번호 — 그 뒤 지워진 번호는 번호를 단 채 보내 서버가 되살리지 않고 돌려주게 한다
 */
export function 판합치기(
  지금: readonly PrdItem[],
  옮긴: 옮긴것,
  앞번호: ReadonlySet<string> = new Set(),
): { items: 옮긴항목[]; 지운번호: string[]; 모르는번호: string[] } {
  const 있는번호 = new Set(지금.map((i) => i.reqId));
  const 아는번호 = (n: string) => 있는번호.has(n) || 앞번호.has(n);
  // 기준 판에도 지금 판에도 없는 번호는 서버가 PRD_REUSED 로 판 전체를 거절한다 — 그 항목만 번호를 떼어 새 항목으로 돌리고 새 임시 번호를 단다.
  // 뗀 번호를 임시 번호로 삼지 않는다 — 지운 번호면 main 표의 옛 줄에도 있어 바꿔 적을 때 그 줄까지 바뀐다
  let 끝 = Math.max(0, ...옮긴.items.map((i) => Number(/-NEW-(\d+)$/.exec(i.임시 ?? '')?.[1] ?? 0)));
  const 고침 = 옮긴.items.map(({ reqId, ...남은 }) => {
    const 뗀번호 = reqId !== undefined && !아는번호(reqId) ? reqId : undefined;
    const 새임시 = (n: string) => `${n.slice(0, n.lastIndexOf('-REQ-'))}-NEW-${String(++끝).padStart(3, '0')}`;
    const 항목: 옮긴항목 = reqId !== undefined && 뗀번호 === undefined ? { reqId, ...남은 } : 뗀번호 === undefined ? 남은 : { ...남은, 임시: 새임시(뗀번호) };
    return { 항목, 뗀번호 };
  });
  // 기능 묶음과 요구 문장이 같은 새 항목은 지금 판 번호를 물려받는다 — 자식이 번호 달기를 빠뜨려도 같은 원본을 다시 옮길 때 같은 요구가 둘이 되지 않게.
  // 기능 묶음까지 보는 까닭 — 「필수 입력 항목이다」 같은 흔한 문장이 다른 기능 항목을 덮지 않게
  const 열쇠 = (i: { feature: string; text: string }) => `${i.feature.trim()}\n${i.text.trim()}`;
  const 고친번호 = new Set(고침.flatMap(({ 항목 }) => (항목.reqId === undefined ? [] : [항목.reqId])));
  const 문장번호 = new Map(지금.filter((i) => !고친번호.has(i.reqId)).map((i) => [열쇠(i), i.reqId]));
  for (const { 항목 } of 고침) {
    const 번호 = 항목.reqId === undefined ? 문장번호.get(열쇠(항목)) : undefined;
    if (번호 === undefined) continue;
    항목.reqId = 번호;
    문장번호.delete(열쇠(항목));
  }
  // 문장으로 번호를 찾은 항목은 새 항목이 아니다 — 남은 것만 「새 항목으로 올림」이다
  const 모르는번호 = 고침.flatMap(({ 항목, 뗀번호 }) => (뗀번호 !== undefined && 항목.reqId === undefined ? [뗀번호] : []));
  const 자리 = new Map(고침.flatMap(({ 항목 }) => (항목.reqId === undefined ? [] : [[항목.reqId, 항목] as const])));
  const 지움 = new Set(옮긴.removed);
  const 지운번호 = 지금.filter((i) => !자리.has(i.reqId) && 지움.has(i.reqId)).map((i) => i.reqId);
  return {
    items: [
      ...지금.flatMap<옮긴항목>((i) => (자리.has(i.reqId) ? [자리.get(i.reqId)!] : 지움.has(i.reqId) ? [] : [i])),
      // 기준 판 뒤에 지워진 번호 — 서버가 되살리지 않고 keptByPerson 으로 돌려준다
      ...고침.flatMap(({ 항목 }) => (항목.reqId !== undefined && !있는번호.has(항목.reqId) ? [항목] : [])),
      ...고침.flatMap(({ 항목 }) => (항목.reqId === undefined ? [항목] : [])),
    ],
    지운번호,
    모르는번호,
  };
}

export interface 옮기기대조결과 {
  요구수: number;
  빠짐: string[];
  /** `번호(까닭)` */
  요구아님: string[];
  /** `번호 경계 「근거」` · `번호 예외 기법 「근거」` */
  설계잃음: string[];
}

/**
 * ① 원장 번호마다 그 번호를 근거로 단 이번 항목이 있나 ② 원본 글의 경계 값 · 예외 기법이 그 항목 문장들의 설계에 다 있나.
 * 잃은 것만 본다 — 여러 번호를 한 항목에 합치면 남는 칸은 늘 생긴다. 이번 항목만 본다 — 남긴 기존 항목의 문단 번호(`P-001`)는 다른 자료 것일 수 있다
 */
export function 옮기기대조(원장: readonly Pick<원장항목, '번호' | '설계'>[], 옮긴: 옮긴것): 옮기기대조결과 {
  // 항목 설계는 한 번만 계산한다 — 여러 번호를 근거로 단 항목이 번호마다 다시 판정되지 않게
  const 덮은항목 = new Map<string, 설계[]>();
  for (const i of 옮긴.items) {
    const 설 = 설계하기(i.text);
    for (const ref of new Set(i.basis.flatMap((b) => (b.ref === undefined ? [] : [b.ref])))) {
      const 목록 = 덮은항목.get(ref);
      if (목록 === undefined) 덮은항목.set(ref, [설]);
      else 목록.push(설);
    }
  }
  const 아님 = new Map(옮긴.notRequirements.map((r) => [r.ref, r.reason]));
  const 결과: 옮기기대조결과 = { 요구수: 원장.length, 빠짐: [], 요구아님: [], 설계잃음: [] };
  for (const { 번호, 설계: 원 } of 원장) {
    const 설계들 = 덮은항목.get(번호);
    if (설계들 === undefined) {
      const 까닭 = 아님.get(번호);
      if (까닭 === undefined) 결과.빠짐.push(번호);
      else 결과.요구아님.push(`${번호}(${까닭})`);
      continue;
    }
    if (원 === undefined) continue;
    const 값들 = new Set(설계들.flatMap((s) => s.경계.flatMap((b) => b.값)));
    // ponytail: 예외는 기법 이름으로만 견준다 — 같은 기법의 두 번째 근거만 잃으면 못 본다. 잦으면 판정 함수가 근거 갈래를 돌려주게 한다
    const 기법들 = new Set(설계들.flatMap((s) => s.예외.map((e) => e.기법)));
    for (const b of 원.경계) if (b.값.some((v) => !값들.has(v))) 결과.설계잃음.push(`${번호} 경계 「${b.근거}」`);
    for (const 기법 of new Set(원.예외.map((e) => e.기법))) {
      if (!기법들.has(기법)) 결과.설계잃음.push(`${번호} 예외 ${기법} 「${원.예외.find((e) => e.기법 === 기법)!.근거}」`);
    }
  }
  return 결과;
}

/** PR 본문 머리의 대조 줄. 원장이 없는 원본(PDF · 피그마)은 대조를 건너뛴다 */
export function 대조줄들(r: 옮기기대조결과 | { 없음: string }): string[] {
  if ('없음' in r) return [`⚠️ 옮기기 대조 없음 — ${r.없음}`];
  return [
    `옮기기 대조: 요구 ${String(r.요구수)} 중 빠짐 ${String(r.빠짐.length)} · 요구 아님 ${String(r.요구아님.length)} · 설계 잃음 ${String(r.설계잃음.length)}`,
    ...경고줄('옮기기 빠짐', r.빠짐, 10),
    ...경고줄('설계 잃음', r.설계잃음, 10),
    ...경고줄('요구 아님', r.요구아님, 10, ''),
  ];
}

/** PR 본문 머리의 판 줄. 사람이 고쳐 서버가 남긴 번호(keptByPerson)는 사람이 문서와 맞춰 볼 것이다 (§3.6 「사람이 고친 항목」) */
export function 판줄들(
  판: number,
  옮긴: 옮긴것,
  합친: { 지운번호: string[]; 모르는번호: string[] },
  사람것: string[],
): string[] {
  const 확인 = 옮긴.items.filter((i) => i.status === 'NEEDS_CHECK').length;
  return [
    `표준 기획서: 판 ${String(판)} · 이번 자료 항목 ${String(옮긴.items.length)}(확인 필요 ${String(확인)}) · 지움 ${String(합친.지운번호.length)}`,
    ...경고줄('사람이 고친 항목과 새 문서가 다름', 사람것, 10),
    ...경고줄('번호를 모르는 항목 — 새 항목으로 올림', 합친.모르는번호, 10),
    ...경고줄('표준 기획서 항목을 버림', 옮긴.버림, 10),
  ];
}

/** 서버에 보낼 항목 — 임시 번호는 자식과 에이전트 사이의 자리라 떼어 보낸다 */
export const 보낼항목 = (items: readonly 옮긴항목[]): 들어온항목[] => items.map(({ 임시: _, ...남은 }) => 남은);

/**
 * 작성의 원장 — 표준 기획서 항목이 곧 요구 목록이다(늘 번호 모드 · §3.6 「작성은 표준 기획서만 읽는다」).
 * 번호가 아직 없는 새 항목은 임시 번호로 든다. 설계(경계 · 예외)는 요구 문장으로 판정한다 — 원본 글이 아니다.
 * 확인 필요 항목은 표시해 둔다 — 그 항목을 덮는 줄은 화면 기준이라 미확정 표시를 단다(PRD-F4-02 전까지)
 */
export function 표준원장(items: readonly 옮긴항목[]): 원장 | { 없음: string } {
  const 항목: 원장항목[] = items.flatMap((i) => {
    const 번호 = i.reqId ?? i.임시;
    if (번호 === undefined) return [];
    const 설 = 설계하기(i.text);
    return [{
      번호,
      자료: '표준 기획서',
      문장: i.text,
      ...(i.status === 'NEEDS_CHECK' ? { 확인필요: true as const } : {}),
      ...(설.경계.length + 설.예외.length > 0 ? { 설계: 설 } : {}),
    }];
  });
  if (항목.length === 0) return { 없음: '표준 기획서에 항목이 없다' };
  const 가족들: Record<string, number> = {};
  for (const h of 항목) 가족들[가족(h.번호)] = (가족들[가족(h.번호)] ?? 0) + 1;
  return { 항목, 가족: 가족들, 모드: { '표준 기획서': '번호' }, 경고: [], 빠진자료: [], 꼴: {} };
}

/**
 * 올린 뒤 임시 번호 → 서버가 준 번호. 서버는 보낸 차례대로 새 번호를 매기고 판을 번호 차례로 둔다(`apps/admin/src/prd/rules.ts` 옮기기판).
 * 그래서 저장된 판에서 보낸 번호 · 사람이 남긴 항목을 뺀 것이 새 항목이고 번호 차례가 보낸 차례다.
 * 수나 요구 문장이 안 맞으면 사유 — 그 사이 다른 저장이 끼었다. 그때 바꿔 적으면 표가 엉뚱한 요구를 가리킨다
 */
export function 새번호맞추기(보낸: readonly 옮긴항목[], 저장: readonly PrdItem[]): Map<string, string> | { 사유: string } {
  const 맞춤 = new Map(보낸.flatMap((i) => (i.reqId !== undefined && i.임시 !== undefined ? [[i.임시, i.reqId] as const] : [])));
  const 보낸번호 = new Set(보낸.flatMap((i) => (i.reqId === undefined ? [] : [i.reqId])));
  const 새것 = 보낸.filter((i) => i.reqId === undefined);
  const 받은것 = 저장.filter((i) => !보낸번호.has(i.reqId) && i.byPerson !== true).sort((a, b) => 번호수(a.reqId) - 번호수(b.reqId));
  if (받은것.length !== 새것.length) return { 사유: `새 항목 ${String(새것.length)}개를 보냈는데 판에 ${String(받은것.length)}개가 새로 있다` };
  const 같다 = (a: { feature: string; text: string }, b: { feature: string; text: string }) => a.feature.trim() === b.feature.trim() && a.text.trim() === b.text.trim();
  for (const [k, i] of 새것.entries()) {
    const 받은 = 받은것[k]!;
    if (!같다(i, 받은)) return { 사유: `${받은.reqId} 의 요구 문장이 보낸 것과 다르다` };
    if (i.임시 !== undefined) 맞춤.set(i.임시, 받은.reqId);
  }
  return 맞춤;
}
