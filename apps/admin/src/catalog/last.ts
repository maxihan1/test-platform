// 케이스 목록 · 엑셀의 「마지막 결과」 거르기 재료 — 판정은 실행 쪽이 주고 카탈로그는 그것으로 tcId 만 거른다 (카탈로그 §7 `?last=`)

import type { ItemStatus, Platform } from '@platform/kit';

import { lastByCase, type LastResult } from '../execution/history.js';
import { 케이스판정 } from '../prd/trace.js';

/** 케이스 하나의 판정 — 지원하는 기기만 본다. 뺀 기기의 옛 결과가 판정에 들면 목록 · 엑셀 · 추적표가 갈린다 */
export type 판정함수 = (tcId: string, platforms: Platform[]) => ItemStatus;

const 낱말: Record<string, ItemStatus> = { pass: 'PASS', fail: 'FAIL', na: 'NA' };

// 빈 값은 거르지 않는다. 모르는 값은 null — 거르지 않고 전부 내면 거른 줄 알고 틀린 목록을 믿는다(?technique= 와 같은 까닭)
export function 마지막읽기(값: string | undefined): ItemStatus | undefined | null {
  if (값 === undefined || 값 === '') return undefined;
  return 낱말[값] ?? null;
}

export const 모르는마지막 = (값: string | undefined) => ({ error: 'BAD_LAST', detail: `마지막 결과는 pass · fail · na 중 하나입니다 — ${String(값)}` });

/** 그 서비스의 (케이스, 기기) 마지막 결과를 케이스마다 모은다 — 엑셀 칸과 거르기가 같은 한 번의 질의를 쓴다 */
export async function 기기별결과(service: string): Promise<Map<string, LastResult[]>> {
  const 모음 = new Map<string, LastResult[]>();
  for (const l of await lastByCase([service])) 모음.set(l.tcId, [...(모음.get(l.tcId) ?? []), l]);
  return 모음;
}

export function 판정으로(기기별: Map<string, LastResult[]>): 판정함수 {
  return (tcId, platforms) => 케이스판정(platforms.map((p) => 기기별.get(tcId)?.find((l) => l.platform === p)?.status));
}
