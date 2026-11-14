// QA 리포트 첫 장 「변경 사항」 — 바로 앞 빌드와 견준 제품(Issue Bunker 이슈 · PR) · 요구사항(PRD 버전) · 테스트(케이스 신규 · 수정 · 삭제)와 이번 빌드에서 사람이 확인한 케이스 (도메인/리포팅 §3.17)

import type { PrdItem } from '@platform/kit';
import type { Pool } from 'pg';

import { 반영안됨 } from '../prd/rules.js';
import { 판정들 } from './failReqs.js';

export interface 요구줄 {
  reqId: string;
  text: string;
}

/** 케이스가 바뀐 까닭 — 앞 빌드 첫 실행 뒤 · 이번 빌드 마지막 실행 전에 병합된 작성 요청. 못 찾으면 null(「사유 기록 없음」) */
export interface 까닭 {
  kind: 'TEST_FIX' | 'EDIT' | 'PRD_APPLY' | 'AUTHOR';
  requestId: number;
  issueKey: string | null;
  prUrl: string | null;
}

export interface 테스트줄 {
  tcId: string;
  name: string;
  reason: 까닭 | null;
}

export interface 변경사항 {
  product:
    | { linked: false }
    | {
        linked: true;
        /** 묶음의 실행을 건 배포. 비면 「연결된 배포 없음」 */
        deploys: { buildNo: string; at: string }[];
        issues: { key: string; type: 'TASK' | 'BUG'; title: string | null; prs: { number: number; url: string; title: string }[] }[];
      };
  /** null 이면 견줄 이전 빌드가 없다 */
  requirements: { from: number | null; to: number | null; added: 요구줄[]; changed: 요구줄[]; removed: 요구줄[] } | null;
  tests:
    | null
    | { recorded: false }
    | {
        recorded: true;
        fromCommit: string | null;
        toCommit: string | null;
        added: 테스트줄[];
        /** file 은 케이스 파일이, expected 는 기대 결과가 바뀌었다 — 기대 결과 변경은 화면이 따로 강조한다 */
        modified: (테스트줄 & { file: boolean; expected: boolean })[];
        removed: 테스트줄[];
      };
  /** 실패 카드에서 사람이 판정한 케이스 — 이번 빌드 실행 것만 */
  confirmed: { tcId: string; runId: number; verdict: 'BUG' | 'SCREEN_RIGHT'; byName: string; at: string }[];
}

export interface 견줄묶음 {
  serviceId: number;
  env: string;
  runIds: number[];
  firstStartedAt: Date;
  lastStartedAt: Date;
  previousBuildNo: string | null;
}

interface 항목줄 {
  tc_id: string;
  tc_name: string;
  case_sha256: string | null;
  tests_commit: string | null;
  expected: unknown;
  started_at: Date;
}

// 케이스마다 그 빌드에서 가장 늦게 시작한 실행의 항목 하나. 테스트 버전이 찍힌 항목을 먼저 고른다
const 항목SQL = (곳: string) => `
  SELECT DISTINCT ON (i.tc_id) i.tc_id, i.tc_name, i.case_sha256, i.tests_commit, i.expected, r.started_at
    FROM test_run r JOIN run_item i ON i.run_id = r.run_id
   WHERE r.kind IN ('UI', 'FN') AND ${곳}
   ORDER BY i.tc_id, (i.case_sha256 IS NOT NULL) DESC, r.started_at DESC, r.run_id DESC, i.history_id`;

const 마지막커밋 = (줄들: 항목줄[]): string | null =>
  줄들.filter((r) => r.tests_commit !== null).sort((a, b) => b.started_at.getTime() - a.started_at.getTime())[0]?.tests_commit ?? null;

async function 제품(pool: Pool, b: 견줄묶음): Promise<변경사항['product']> {
  const 연결 = (
    await pool.query<{ project_id: string; base_url: string; bot_username: string | null }>(
      'SELECT s.project_id, l.base_url, l.bot_username FROM service s JOIN bts_link l ON l.project_id = s.project_id WHERE s.id = $1',
      [b.serviceId],
    )
  ).rows[0];
  if (연결 === undefined) return { linked: false };
  // 배포 번호(커밋 7자 + 시각)는 CI 빌드 번호와 다른 번호라 글자로 맞추지 않고, 배포가 건 실행이 이 묶음에 있는지로 찾는다
  const 배포 = (
    await pool.query<{ id: string; build_no: string; created_at: Date }>(
      'SELECT id, build_no, created_at FROM bts_deploy WHERE project_id = $1 AND run_ids && $2::bigint[] ORDER BY created_at, id',
      [연결.project_id, b.runIds],
    )
  ).rows;
  const 이슈 = (
    await pool.query<{ issue_key: string; issue_type: 'TASK' | 'BUG' }>(
      'SELECT DISTINCT ON (issue_key) issue_key, issue_type FROM bts_claim WHERE deploy_id = ANY($1::bigint[]) ORDER BY issue_key, claimed_at',
      [배포.map((d) => d.id)],
    )
  ).rows;
  const 키들 = 이슈.map((i) => i.issue_key);
  // PR 은 Issue Bunker 규칙 웹훅이 보낸 「PR 병합」 노트 사건에 이미 있다. 제목은 Bunker 에서 다시 읽고, 못 읽으면 노트 사건에 남은 제목을 쓴다
  const 사건 = (
    await pool.query<{ kind: string; k: string; summary: string | null; n: string | null; url: string | null; title: string | null }>(
      `SELECT kind, payload->>'issueKey' AS k, payload->>'summary' AS summary, payload->>'prNumber' AS n, payload->>'prUrl' AS url, payload->>'prTitle' AS title
         FROM project_note_event WHERE project_id = $1 AND payload->>'issueKey' = ANY($2) AND kind IN ('PR_MERGED', 'ISSUE_OPEN', 'ISSUE_CLOSE', 'TASK_DONE')
        ORDER BY id`,
      [연결.project_id, 키들],
    )
  ).rows;
  // 실행 끝 자리에서 고리가 생기지 않게 쓸 때만 부른다(qaReportSummary.ts 의 호환성 결과와 같다)
  const { 이슈읽기 } = await import('../bts/client.js');
  const 자리 = { baseUrl: 연결.base_url, 봇: 연결.bot_username ?? '' };
  const 제목들 = await Promise.all(키들.map((k) => 이슈읽기(자리, k).then((x) => (x.summary === '' ? null : x.summary), () => null)));
  return {
    linked: true,
    deploys: 배포.map((d) => ({ buildNo: d.build_no, at: d.created_at.toISOString() })),
    issues: 이슈.map((i, n) => ({
      key: i.issue_key,
      type: i.issue_type,
      title: 제목들[n] ?? 사건.filter((e) => e.k === i.issue_key && e.kind !== 'PR_MERGED' && e.summary).at(-1)?.summary ?? null,
      prs: [...new Map(사건.filter((e) => e.k === i.issue_key && e.kind === 'PR_MERGED' && e.url).map((e) => [e.url!, { number: Number(e.n), url: e.url!, title: e.title ?? '' }])).values()],
    })),
  };
}

async function 요구사항(pool: Pool, serviceId: number, 앞때: Date, 이번때: Date): Promise<NonNullable<변경사항['requirements']>> {
  const 그때판 = async (때: Date) =>
    (await pool.query<{ version: number; items: PrdItem[] }>('SELECT version, items FROM prd_version WHERE service_id = $1 AND saved_at <= $2 ORDER BY version DESC LIMIT 1', [serviceId, 때]))
      .rows[0] ?? null;
  const [앞, 이번] = [await 그때판(앞때), await 그때판(이번때)];
  const 차이 = 앞?.version === 이번?.version ? { added: [], changed: [], removed: [] } : 반영안됨(앞?.items ?? null, 이번?.items ?? []);
  const 글 = (items: PrdItem[] | undefined, 번호들: string[]): 요구줄[] => {
    const 표 = new Map((items ?? []).map((x) => [x.reqId, x.text]));
    return 번호들.map((reqId) => ({ reqId, text: 표.get(reqId) ?? '' }));
  };
  return {
    from: 앞?.version ?? null,
    to: 이번?.version ?? null,
    added: 글(이번?.items, 차이.added),
    changed: 글(이번?.items, 차이.changed),
    removed: 글(앞?.items, 차이.removed),
  };
}

/** 앞 빌드 첫 실행 뒤 · 이번 빌드 마지막 실행 전에 병합된 작성 요청에서 케이스마다 가장 늦은 것 */
async function 까닭들(pool: Pool, serviceId: number, tcIds: string[], 부터: Date, 까지: Date): Promise<Map<string, 까닭>> {
  if (tcIds.length === 0) return new Map();
  const 목록 = (칸: string) => `jsonb_array_elements(CASE WHEN jsonb_typeof(${칸}) = 'array' THEN ${칸} ELSE '[]'::jsonb END)`;
  const r = await pool.query<{ tc_id: string; root_id: string; kind: string; prd_apply: boolean; issue_key: string | null; pr_url: string | null }>(
    `SELECT DISTINCT ON (c.tc_id) c.tc_id, root.id AS root_id, root.kind, root.params->>'prdApply' IS NOT DISTINCT FROM 'true' AS prd_apply,
            tf.issue_key, COALESCE(s.pr_url, root.pr_url) AS pr_url
       FROM unnest($2::text[]) AS c(tc_id)
       JOIN authoring_request m ON m.service_id = $1 AND m.kind = 'MERGE' AND m.status = 'DONE' AND m.finished_at > $3 AND m.finished_at <= $4
       JOIN authoring_request s ON s.id = m.source_id
       JOIN authoring_request root ON root.id = CASE WHEN s.kind IN ('AUTHOR', 'EDIT') THEN s.id ELSE s.source_id END
       LEFT JOIN bts_test_fix tf ON tf.request_id = root.id AND tf.tc_id = c.tc_id
      WHERE tf.id IS NOT NULL
         OR EXISTS (SELECT 1 FROM ${목록("s.result->'cases'")} x WHERE x->>'tcId' = c.tc_id)
         OR EXISTS (SELECT 1 FROM ${목록("root.params->'edits'")} x WHERE x->>'tcId' = c.tc_id)
      ORDER BY c.tc_id, m.finished_at DESC, m.id DESC`,
    [serviceId, tcIds, 부터, 까지],
  );
  return new Map(
    r.rows.map((x) => [
      x.tc_id,
      {
        kind: x.issue_key !== null ? 'TEST_FIX' : x.kind === 'EDIT' ? 'EDIT' : x.prd_apply ? 'PRD_APPLY' : 'AUTHOR',
        requestId: Number(x.root_id),
        issueKey: x.issue_key,
        prUrl: x.pr_url,
      },
    ]),
  );
}

async function 테스트(pool: Pool, b: 견줄묶음 & { previousBuildNo: string }, 앞때: Date): Promise<NonNullable<변경사항['tests']>> {
  const 이번 = (await pool.query<항목줄>(항목SQL('r.run_id = ANY($1::bigint[])'), [b.runIds])).rows;
  const 앞 = (
    await pool.query<항목줄>(항목SQL("r.service_id = $1 AND r.env = $2 AND r.build_no = $3 AND r.origin <> 'SINGLE' AND r.status <> 'RUNNING'"), [
      b.serviceId,
      b.env,
      b.previousBuildNo,
    ])
  ).rows;
  // 테스트 버전 칸이 생기기 전 실행은 지어내지 않는다 (§3.3 「박제 이전에 쌓인 행」)
  if (!이번.some((r) => r.case_sha256 !== null) || !앞.some((r) => r.case_sha256 !== null)) return { recorded: false };
  const 앞표 = new Map(앞.map((r) => [r.tc_id, r]));
  const 이번표 = new Map(이번.map((r) => [r.tc_id, r]));
  const 살아있는 = new Set(
    (await pool.query<{ tc_id: string }>('SELECT tc_id FROM test_case WHERE tc_id = ANY($1) AND is_active', [앞.map((r) => r.tc_id)])).rows.map((r) => r.tc_id),
  );
  const added = 이번.filter((r) => !앞표.has(r.tc_id));
  // 이번 빌드에 안 돈 케이스는 지워졌을 때만 삭제다 — 살아 있는데 안 돈 것은 「계획 대비 차이」가 적는다
  const removed = 앞.filter((r) => !이번표.has(r.tc_id) && !살아있는.has(r.tc_id));
  const modified = 이번.flatMap((r) => {
    const p = 앞표.get(r.tc_id);
    if (p === undefined) return [];
    const file = p.case_sha256 !== null && r.case_sha256 !== null && p.case_sha256 !== r.case_sha256;
    const expected = JSON.stringify(p.expected) !== JSON.stringify(r.expected);
    return file || expected ? [{ r, file, expected }] : [];
  });
  const 이유 = await 까닭들(pool, b.serviceId, [...added, ...removed, ...modified.map((m) => m.r)].map((r) => r.tc_id), 앞때, b.lastStartedAt);
  const 줄 = (r: 항목줄): 테스트줄 => ({ tcId: r.tc_id, name: r.tc_name, reason: 이유.get(r.tc_id) ?? null });
  return {
    recorded: true,
    fromCommit: 마지막커밋(앞),
    toCommit: 마지막커밋(이번),
    added: added.map(줄),
    modified: modified.map((m) => ({ ...줄(m.r), file: m.file, expected: m.expected })),
    removed: removed.map(줄),
  };
}

async function 확인한케이스(pool: Pool, runIds: number[]): Promise<변경사항['confirmed']> {
  const 실패 = (await pool.query<{ run_id: string; tc_id: string }>("SELECT DISTINCT run_id, tc_id FROM run_item WHERE run_id = ANY($1::bigint[]) AND status = 'FAIL'", [runIds])).rows;
  const 실행별 = new Map<number, string[]>();
  for (const f of 실패) 실행별.set(Number(f.run_id), [...(실행별.get(Number(f.run_id)) ?? []), f.tc_id]);
  const 줄들: 변경사항['confirmed'] = [];
  for (const [runId, tcIds] of 실행별) {
    for (const [tcId, p] of await 판정들(runId, tcIds)) {
      if (p !== null) 줄들.push({ tcId, runId, verdict: p.kind === 'BUG' ? 'BUG' : 'SCREEN_RIGHT', byName: p.byName, at: p.at });
    }
  }
  return 줄들.sort((a, b) => a.at.localeCompare(b.at) || a.tcId.localeCompare(b.tcId));
}

/** 빌드 묶음의 변경 사항. 요구사항 · 테스트는 앞 빌드가 있어야 견주고, 제품 · 확인한 케이스는 이번 빌드만 본다 */
export async function 변경사항을센다(pool: Pool, b: 견줄묶음): Promise<변경사항> {
  const 앞때 =
    b.previousBuildNo === null
      ? null
      : ((
          await pool.query<{ s: Date | null }>(
            `SELECT min(s) AS s FROM (
               SELECT started_at AS s FROM test_run WHERE service_id = $1 AND env = $2 AND build_no = $3 AND origin <> 'SINGLE'
               UNION ALL SELECT COALESCE(started_at, created_at) FROM perf_run WHERE service_id = $1 AND env = $2 AND build_no = $3) x`,
            [b.serviceId, b.env, b.previousBuildNo],
          )
        ).rows[0]?.s ?? null);
  return {
    product: await 제품(pool, b),
    requirements: 앞때 === null ? null : await 요구사항(pool, b.serviceId, 앞때, b.firstStartedAt),
    tests: 앞때 === null || b.previousBuildNo === null ? null : await 테스트(pool, { ...b, previousBuildNo: b.previousBuildNo }, 앞때),
    confirmed: await 확인한케이스(pool, b.runIds),
  };
}
