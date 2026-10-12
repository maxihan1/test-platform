// 케이스 엑셀에 실을 자료를 모은다 — 케이스 · 마지막 결과 · 보류 처리 기록 (카탈로그 §7 GET /api/catalog/export)
// 권한 판단은 부르는 쪽(routes.ts)이 끝내고 여기는 그 결과만 받는다

import type { Platform, Technique } from '@platform/kit';

import { 보류들, type 보류입력 } from '../authoring/held.js';
import { 사슬식 } from '../authoring/history.js';
import { lastByCase, type LastResult } from '../execution/history.js';
import { 케이스판정 } from '../prd/trace.js';
import type { 맥락조건 } from './context.js';
import type { ExportCase, ExportHeld, ExportInput } from './export.js';
import { listCases } from './store.js';

/** 표에 적는 시각 — 서버가 어느 시간대에 떠 있든 한국 시각으로 적는다. sv-SE 가 `YYYY-MM-DD HH:mm:ss` 모양을 준다 */
export function 한국시각(iso: string): string {
  return new Date(iso).toLocaleString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(0, 16);
}

async function 보류기록(serviceId: number): Promise<ExportHeld[]> {
  const { pool } = await import('../db/index.js');
  // 뿌리마다 가장 최근에 끝난 작성 실행 한 건 — 보류 입력은 이어받을 때 옮겨 적혀 실행마다 겹친다 (카탈로그 §7)
  const r = await pool.query<{ root_id: string; result: unknown; held_input: 보류입력 | null; merged: boolean }>(
    `WITH RECURSIVE ${사슬식("service_id = $1 AND kind = 'AUTHOR'")},
     최신 AS (
       SELECT DISTINCT ON (사슬.root_id) 사슬.root_id, a.result, a.held_input, a.discarded_at
         FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
        WHERE a.kind <> 'MERGE' AND a.status = 'DONE'
        ORDER BY 사슬.root_id, a.id DESC
     ),
     표 AS (
       SELECT 최신.*, EXISTS (
                SELECT 1 FROM 사슬 JOIN authoring_request m ON m.id = 사슬.id
                 WHERE 사슬.root_id = 최신.root_id AND m.kind = 'MERGE' AND m.status = 'DONE'
              ) AS merged
         FROM 최신
     )
     -- 폐기는 뿌리 통째로 찍힌다(stop.ts). 폐기한 뿌리는 납품 기록이 아니지만, 이미 반영됐으면 코드에 들어갔으니 싣는다
     SELECT root_id, result, held_input, merged FROM 표
      WHERE discarded_at IS NULL OR merged
      ORDER BY root_id`,
    [serviceId],
  );
  return r.rows.flatMap((row) =>
    보류들(row.result).map((h) => {
      const input = row.held_input?.[h.tcId] ?? null;
      return {
        rootId: Number(row.root_id),
        held: h,
        input: input === null ? null : { ...input, at: 한국시각(input.at) },
        merged: row.merged,
      };
    }),
  );
}

/**
 * 케이스 하나의 마지막 결과 칸. 판정은 추적표 · 목록과 같은 규칙(기기 한쪽만 깨져도 실패)이고 시각은 가장 늦게 끝난 기기 것이다.
 * 더 최근에 끝난 기기 하나만 실으면 PC 실패 · 휴대폰 통과가 엑셀은 통과, 추적표는 실패로 갈린다 (PRD-F9-09).
 * 케이스가 지금 지원하는 기기만 본다 — 뺀 기기의 옛 결과는 판정에도 시각에도 안 든다. 돈 기기가 없으면 빈칸
 */
export function 결과칸(platforms: Platform[], 기기별: LastResult[]): ExportCase['lastResult'] {
  const 지원 = 기기별.filter((l) => platforms.includes(l.platform));
  if (지원.length === 0) return null;
  const 늦은 = 지원.reduce((a, b) => (b.finishedAt > a.finishedAt ? b : a));
  return { status: 케이스판정(platforms.map((p) => 지원.find((l) => l.platform === p)?.status)), at: 한국시각(늦은.finishedAt) };
}

export async function 엑셀자료(입력: 맥락조건 & {
  service: string;
  serviceId: number;
  q: string;
  platform?: Platform;
  activeOnly: boolean;
  kind?: 'UI' | 'FN';
  technique?: Technique | 'none';
  canSeeRuns: boolean;
  canSeeAuthoring: boolean;
}): Promise<ExportInput> {
  const 목록 = await listCases({
    feature: 입력.feature,
    screen: 입력.screen,
    part: 입력.part,
    axis: 입력.axis,
    req: 입력.req,
    service: 입력.service,
    q: 입력.q,
    platform: 입력.platform,
    activeOnly: 입력.activeOnly,
    kind: 입력.kind,
    technique: 입력.technique,
    page: 1,
    pageSize: null,
  });

  // 기기가 둘이어도 칸이 하나다 — 기기별 결과를 모아 결과칸 이 한 판정으로 접는다
  const 마지막 = new Map<string, LastResult[]>();
  if (입력.canSeeRuns) {
    for (const l of await lastByCase([입력.service])) 마지막.set(l.tcId, [...(마지막.get(l.tcId) ?? []), l]);
  }

  const held = 입력.canSeeAuthoring ? await 보류기록(입력.serviceId) : null;
  // 반영된 뿌리에서 사람이 값을 넣은 케이스. 뿌리가 여럿이면 뒤의 것(최근 뿌리)이 이긴다
  const 채운이 = new Map<string, { rootId: number; by: string }>();
  for (const h of held ?? []) {
    if (h.merged && h.input !== null && h.input.removed !== true) 채운이.set(h.held.tcId, { rootId: h.rootId, by: h.input.by });
  }

  return {
    generatedAt: new Date().toISOString(),
    cases: 목록.items.map((c) => ({
      tcId: c.tcId,
      name: c.name,
      platforms: c.platforms,
      precondition: c.precondition,
      paramSchema: c.paramSchema,
      expectedSchema: c.expectedSchema,
      unconfirmed: c.unconfirmed,
      lastResult: 결과칸(c.platforms, 마지막.get(c.tcId) ?? []),
      filledBy: 채운이.get(c.tcId) ?? null,
      techniques: c.techniques,
      feature: c.feature,
      reqIds: [...new Set(c.reqs.map((r) => r.reqId))],
    })),
    held,
    kind: 입력.kind,
    canSeeRuns: 입력.canSeeRuns,
    canSeeAuthoring: 입력.canSeeAuthoring,
  };
}
