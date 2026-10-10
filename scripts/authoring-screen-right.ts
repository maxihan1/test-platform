// 옮기지 않는 요청(이어 작성 · 반영 · 화면이 맞음)의 자식 뒤 — 반영 PR 머리 줄을 달고, 화면이 맞음이면 결과 파일에서 그 번호만 골라 올린다
// (도메인/작성 §3.6 「화면이 맞음」). 다른 번호 · 새 항목 · 지움은 버린다. 확정 · byPerson 은 서버가 단다(§7 에이전트 `POST …/:id/prd`)

import type { PrdItem } from '@platform/kit/types';

import { 요구같나 } from '../apps/admin/src/prd/rules.js';
import type { 사본 } from './authoring-copy.js';
import { 부른다 } from './authoring-io.js';
import type { 원장 } from './authoring-ledger.js';
import type { 기준결정 } from './authoring-ledger-check.js';
import { type 기준표, 기준결정만들기 } from './authoring-ledger-io.js';
import { type 옮긴것, 보낼항목, 옛번호지도, 표준원장 } from './authoring-prd.js';
import { type 서버, type 앞판, 거절말고, 결과읽기, 지금판읽기, 통로 } from './authoring-prd-io.js';
import { type 반영입력, 반영뒤줄, 화면이맞음줄 } from './authoring-apply.js';

// authoring-run.ts 가 300줄이라 가져오는 줄을 늘리지 않으려고 여기서 다시 내보낸다
export { 반영요청인가, 화면이맞음읽기 } from './authoring-apply.js';

type 뒤결과 = { 줄: string[]; 원장: 원장 | { 없음: string }; 기준: 기준결정 } | { 거절: string; 줄: string[] };

/**
 * 결과 파일에서 화면이 맞음 번호만 골라 판 자리에 넣는다. 판과 요구(기능 묶음 · 문장 · 근거)가 같은 번호는 고친 것이 아니다 — 서버와 같은 판정(`요구같나`).
 * 고친 항목은 확정 · 사람이 고친 것으로 둔다 — 서버가 그렇게 달아 원장도 같게(확인 필요 표시가 안 붙게)
 */
export function 화면대로합치기(판: readonly PrdItem[], 옮긴: 옮긴것, 번호들: readonly string[]): { items: PrdItem[]; 고친: string[] } {
  const 맡은 = new Set(번호들);
  const 판것 = new Map(판.map((i) => [i.reqId, i]));
  const 고침 = new Map<string, PrdItem>();
  for (const { reqId, feature, text, basis } of 옮긴.items) {
    const 앞것 = reqId === undefined ? undefined : 판것.get(reqId);
    if (reqId === undefined || !맡은.has(reqId) || 앞것 === undefined || 요구같나({ feature, text, basis }, 앞것)) continue;
    고침.set(reqId, { reqId, feature, text, basis, status: 'CONFIRMED', byPerson: true });
  }
  return { items: 판.map((i) => 고침.get(i.reqId) ?? i), 고친: 번호들.filter((n) => 고침.has(n)) };
}

/**
 * 옮기지 않는 요청의 자식 뒤. 반영이면 PR 머리 줄, 화면이 맞음이면 고친 번호를 올리고 원장을 다시 짓는다.
 * **결과 파일이 없거나 고친 번호가 없으면 올리지 않는다** — 요구는 맞고 케이스만 틀렸다. 못 올리거나 비밀값이 들면 올리기 거절이다
 */
export async function 안옮김뒤(
  서버: 서버,
  서비스: string,
  번호: number,
  자리: 사본,
  앞: 앞판,
  원장: { 원장: 원장 | { 없음: string }; 기준: 기준결정; 기준표: 기준표 | null; 반영?: 반영입력 },
  비밀: { 피그마?: string; 계정?: string | null },
  폴더: string,
): Promise<뒤결과> {
  if (원장.반영 === undefined) return { 줄: [], 원장: 원장.원장, 기준: 원장.기준 };
  const 반영줄 = 반영뒤줄(원장.반영.계획, 자리.트리, 폴더);
  const 화면 = 원장.반영.계획.화면이맞음;
  if (화면 === undefined) return { 줄: 반영줄, 원장: 원장.원장, 기준: 원장.기준 };
  const 그대로 = { 줄: [...반영줄, 화면이맞음줄(화면, [])], 원장: 원장.원장, 기준: 원장.기준 };
  const 읽음 = 결과읽기(자리, 서비스, 비밀);
  if (읽음 === null) return 그대로;
  if ('거절' in 읽음) return { 거절: 읽음.거절, 줄: 반영줄 };
  const 번호들 = 화면.번호들.map((x) => x.번호);
  const 못함 = (까닭: string) => ({ 거절: `표준 기획서를 못 올렸다 — ${까닭}`, 줄: 반영줄 });
  try {
    // 반영 요청의 통로는 집을 때 읽은 판을 준다 — 서버가 그 뒤 사람이 고친 항목을 남기고 화면이 맞음 번호만 덮는다
    const 판 = await 지금판읽기(서버, 서비스, 번호);
    if ('까닭' in 판) return 못함(`지금 판을 못 읽었다 (${판.까닭})`);
    const 합침 = 화면대로합치기(판.items, 읽음.옮긴, 번호들);
    if (합침.고친.length === 0) return 그대로;
    const 답 = await 부른다(서버.주소기지, 서버.토큰, 통로(번호, 서비스), { method: 'POST', body: { baseVersion: 앞.version, items: 보낼항목(합침.items) } });
    const 받음 = 답.몸 as { version?: unknown; error?: unknown; detail?: unknown } | null;
    if (답.status !== 200 || typeof 받음?.version !== 'number') {
      const 까닭 = [받음?.error, 받음?.detail].filter((v) => typeof v === 'string').join(' ');
      return 못함(`${String(답.status)}${까닭 === '' ? '' : ` ${까닭}`}`);
    }
    // 원장은 자식이 본 것과 같게 — 자식 앞 판(가린 항목)에 고친 번호를 넣는다. 올리기 판정이 새 문장으로 표를 본다
    const 항목들 = 화면대로합치기(앞.items, 읽음.옮긴, 합침.고친).items;
    const 원장값 = 표준원장(항목들);
    return {
      줄: [...반영줄, 화면이맞음줄(화면, 합침.고친)],
      원장: 원장값,
      기준: 기준결정만들기(원장.기준표 === null ? null : { ...원장.기준표, 접두사: 서비스 }, '없음' in 원장값 ? [] : 원장값.항목.map((h) => h.번호), 옛번호지도(항목들)),
    };
  } catch (err) {
    return 못함(거절말고(err));
  }
}
