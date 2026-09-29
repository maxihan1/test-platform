// 케이스 엑셀에 실을 자료를 모은다 — 케이스 · 마지막 결과 · 보류 처리 기록 (카탈로그 §7 GET /api/catalog/export)
// 권한 판단은 부르는 쪽(routes.ts)이 끝내고 여기는 그 결과만 받는다

import type { Platform } from '@platform/kit';

import { 보류들, type 보류입력 } from '../authoring/held.js';
import { 사슬식 } from '../authoring/history.js';
import { lastByCase, type LastResult } from '../execution/history.js';
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

function 결과칸(l: LastResult | undefined): ExportCase['lastResult'] {
  return l === undefined ? null : { status: l.status, at: 한국시각(l.finishedAt) };
}

export async function 엑셀자료(입력: {
  service: string;
  serviceId: number;
  q: string;
  platform?: Platform;
  activeOnly: boolean;
  canSeeRuns: boolean;
  canSeeAuthoring: boolean;
}): Promise<ExportInput> {
  const 목록 = await listCases({
    service: 입력.service,
    q: 입력.q,
    platform: 입력.platform,
    activeOnly: 입력.activeOnly,
    page: 1,
    pageSize: null,
  });

  // 기기가 둘이면 더 최근에 끝난 쪽 하나를 싣는다 — 칸이 하나다
  const 마지막 = new Map<string, LastResult>();
  if (입력.canSeeRuns) {
    for (const l of await lastByCase([입력.service])) {
      const 이미 = 마지막.get(l.tcId);
      if (이미 === undefined || l.finishedAt > 이미.finishedAt) 마지막.set(l.tcId, l);
    }
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
      lastResult: 결과칸(마지막.get(c.tcId)),
      filledBy: 채운이.get(c.tcId) ?? null,
    })),
    held,
    canSeeRuns: 입력.canSeeRuns,
    canSeeAuthoring: 입력.canSeeAuthoring,
  };
}
