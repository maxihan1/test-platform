// 대시보드 「AI 품질」 두 숫자와 수정 AI PR 의 병합 · 닫힘 적기 — 사람이 고른 결과로 센다 (도메인/BTS 「품질 숫자」 · BTS-F8-01)

import type { Pool } from 'pg';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface AI품질 {
  draft: { picked: number; written: number };
  fix: { merged: number; opened: number };
}

/** 수정 AI 가 연 PR 가운데 아직 병합 · 닫힘을 안 적은 것 — PR 하나에 행 하나. 작성 에이전트가 1분에 한 번 GitHub 에서 읽는다 */
export async function 수정PR볼것(서비스: number): Promise<{ id: number; prUrl: string }[]> {
  const r = await (await db()).query<{ id: string; pr_url: string }>(
    `SELECT DISTINCT ON (pr_url) id, pr_url FROM authoring_request
      WHERE service_id = $1 AND kind = 'BUGFIX' AND pr_url IS NOT NULL AND result ? 'bugfix' AND result->'bugfix'->>'prState' IS NULL
      ORDER BY pr_url, id DESC`,
    [서비스],
  );
  return r.rows.map((x) => ({ id: Number(x.id), prUrl: x.pr_url }));
}

/** 그 PR 이 병합 · 닫힘으로 끝났다고 적는다 — 같은 애플리케이션에서 같은 PR 을 가리키는 수정 행 전부. 없는 행이면 false */
export async function 수정PR상태적기(id: number, 상태: 'MERGED' | 'CLOSED'): Promise<boolean> {
  const r = await (await db()).query(
    `UPDATE authoring_request SET result = jsonb_set(result, '{bugfix,prState}', to_jsonb($2::text))
      WHERE kind = 'BUGFIX' AND result ? 'bugfix'
        AND (service_id, pr_url) = (SELECT service_id, pr_url FROM authoring_request WHERE id = $1 AND kind = 'BUGFIX' AND pr_url IS NOT NULL)`,
    [id, 상태],
  );
  return (r.rowCount ?? 0) > 0;
}

/**
 * 고른 범위의 두 숫자 — 범위에 BTS 를 이은 프로젝트가 없으면 null. 이은 프로젝트의 애플리케이션만 센다. 날 창과 상관없이 지금까지 전부 센다(건수가 작아 며칠로 자르면 0/0 이 잦다).
 * 초안은 카드에서 진행한(버리기 포함) 것만, 수정 PR 은 병합 · 닫힘으로 끝난 것만 분모에 든다
 */
export async function AI품질읽기(서비스ids: number[]): Promise<AI품질 | null> {
  if (서비스ids.length === 0) return null;
  const r = await (await db()).query<{ linked: boolean; picked: string; written: string; merged: string; opened: string }>(
    `SELECT EXISTS (SELECT 1 FROM service s JOIN bts_link l ON l.project_id = s.project_id WHERE s.id = ANY($1::bigint[])) AS linked,
            COALESCE(SUM(jsonb_array_length(result->'picked'->'rows')) FILTER (WHERE kind = 'PRD_DRAFT'), 0) AS picked,
            COALESCE(SUM(jsonb_array_length(COALESCE(result->'draft'->'rows', '[]'::jsonb))) FILTER (WHERE kind = 'PRD_DRAFT'), 0) AS written,
            COUNT(DISTINCT pr_url) FILTER (WHERE kind = 'BUGFIX' AND result->'bugfix'->>'prState' = 'MERGED') AS merged,
            COUNT(DISTINCT pr_url) FILTER (WHERE kind = 'BUGFIX' AND result->'bugfix'->>'prState' IN ('MERGED', 'CLOSED')) AS opened
       FROM authoring_request
      WHERE service_id = ANY($1::bigint[])
        -- 연결을 끊은 프로젝트의 옛 줄은 섞지 않는다 — 고른 범위에 따라 숫자가 흔들린다
        AND service_id IN (SELECT s.id FROM service s JOIN bts_link l ON l.project_id = s.project_id)
        AND ((kind = 'PRD_DRAFT' AND result ? 'picked') OR (kind = 'BUGFIX' AND pr_url IS NOT NULL))`,
    [서비스ids],
  );
  const 줄 = r.rows[0]!;
  if (!줄.linked) return null;
  return { draft: { picked: Number(줄.picked), written: Number(줄.written) }, fix: { merged: Number(줄.merged), opened: Number(줄.opened) } };
}
