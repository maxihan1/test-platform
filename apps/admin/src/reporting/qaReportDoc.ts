// QA 리포트 한 버전 읽기와 문서 재료 — 첫 장(summary) · 기능 · UI 항목(첫 장과 같은 실행) · 요구사항 추적 · 화면 · E2E 시나리오 (도메인/리포팅 §3.17)

import type { Pool } from 'pg';

import { 지금판 } from '../prd/store.js';
import { collectRun, type EvidenceItem } from './collect.js';
import { collectScenario, type E2E증적 } from './collectScenario.js';
import { 고른시나리오실행들, 고른실행들 } from './qaReportCases.js';
import type { 첫장 } from './qaReportSummary.js';

export type 리포트AI = { first: string; current: string; editedBy: string | null; editedAt: string | null } | { failed: true } | null;

/** GET /api/qa-reports/:id 응답 (도메인/리포팅 §7 「QA 리포트 통로」) */
export interface 리포트응답 {
  id: number;
  service: string | null;
  env: string;
  buildNo: string | null;
  runId: number | null;
  perfRunId: number | null;
  version: number;
  versions: { id: number; version: number; approvedAt: string | null }[];
  summary: 첫장;
  ai: 리포트AI;
  runIds: number[];
  perfRunIds: number[];
  performers: string[];
  approval: { by: string; byName: string | null; at: string; late: boolean; sha256: string | null } | null;
  updatedAt: string;
}

interface 리포트행 {
  id: string;
  bundle_key: string;
  service_id: string | null;
  prefix: string | null;
  env: string;
  build_no: string | null;
  run_id: string | null;
  perf_run_id: string | null;
  version: number;
  run_ids: string[];
  perf_run_ids: string[];
  performers: string[];
  summary: 첫장;
  ai: 리포트AI;
  approved_by: string | null;
  approved_name: string | null;
  approved_at: Date | null;
  pdf_path: string | null;
  pdf_sha256: string | null;
  updated_at: Date;
}

const 번호 = (v: string | null): number | null => (v === null ? null : Number(v));

/** 리포트 한 버전 — 응답과 함께 문서가 쓸 애플리케이션 번호 · 승인 때 굳힌 PDF 경로를 낸다 */
export async function 리포트읽기(pool: Pool, id: number): Promise<{ 응답: 리포트응답; serviceId: number | null; pdfPath: string | null } | null> {
  const q = (await pool.query<리포트행>('SELECT q.*, s.prefix FROM qa_report q LEFT JOIN service s ON s.id = q.service_id WHERE q.id = $1', [id])).rows[0];
  if (q === undefined) return null;
  const 버전들 = (
    await pool.query<{ id: string; version: number; approved_at: Date | null }>('SELECT id, version, approved_at FROM qa_report WHERE bundle_key = $1 ORDER BY version', [q.bundle_key])
  ).rows;
  let approval: 리포트응답['approval'] = null;
  if (q.approved_at !== null) {
    // 그 빌드의 배포보다 늦게 승인했으면 사후 승인이다. 배포가 없으면 붙이지 않는다 (§3.17 「첫 장」 승인)
    const 배포 = (await pool.query<{ at: Date | null }>('SELECT min(created_at) AS at FROM bts_deploy WHERE run_ids && $1::bigint[]', [q.run_ids])).rows[0]?.at ?? null;
    approval = { by: q.approved_by!, byName: q.approved_name, at: q.approved_at.toISOString(), late: 배포 !== null && q.approved_at > 배포, sha256: q.pdf_sha256 };
  }
  return {
    응답: {
      id: Number(q.id),
      service: q.prefix,
      env: q.env,
      buildNo: q.build_no,
      runId: 번호(q.run_id),
      perfRunId: 번호(q.perf_run_id),
      version: q.version,
      versions: 버전들.map((v) => ({ id: Number(v.id), version: v.version, approvedAt: v.approved_at?.toISOString() ?? null })),
      summary: q.summary,
      ai: q.ai,
      runIds: q.run_ids.map(Number),
      perfRunIds: q.perf_run_ids.map(Number),
      performers: q.performers,
      approval,
      updatedAt: q.updated_at.toISOString(),
    },
    serviceId: 번호(q.service_id),
    pdfPath: q.pdf_path,
  };
}

export interface 요구추적줄 {
  reqId: string;
  /** 지금 판에 없는 번호면 null — 「PRD 에 없음」 */
  text: string | null;
  tcIds: string[];
}

export interface 문서재료 {
  리포트: 리포트응답;
  /** 기능 · UI 항목 — 케이스 × 디바이스마다 첫 장 숫자를 낸 그 실행의 항목(회차 전부) */
  항목: EvidenceItem[];
  종류: Map<string, 'FN' | 'UI'>;
  /** 기능 구획의 요구사항 추적표 — 받는 때의 지도 ① 로 그린다(§3.17 「묶음 · 버전」 실행 때 덮은 요구는 박제하지 않는다) */
  요구: 요구추적줄[];
  /** UI 구획 — 케이스가 거친 화면(지도 ②의 화면 주소, 없으면 화면 파일) */
  화면: Map<string, string[]>;
  시나리오: E2E증적[];
}

/** 리포트 한 버전을 문서로 그릴 재료. 지도 · 판은 받는 때 것이고 첫 장은 만든 때 굳힌 값이다 */
export async function 문서재료읽기(pool: Pool, id: number): Promise<{ 재료: 문서재료; pdfPath: string | null } | null> {
  const 읽음 = await 리포트읽기(pool, id);
  if (읽음 === null) return null;
  const { 응답 } = 읽음;

  const 고른 = await 고른실행들(pool, 응답.runIds);
  const 종류 = new Map(고른.map((g) => [g.tcId, g.kind]));
  const 실행별 = new Map<number, Set<string>>();
  for (const g of 고른) 실행별.set(g.runId, (실행별.get(g.runId) ?? new Set()).add(`${g.tcId}\u0000${g.platform}`));
  const 항목 = (
    await Promise.all(
      [...실행별].map(async ([runId, 열쇠]) =>
        ((await collectRun(runId, true))?.items ?? []).filter((i) => 열쇠.has(`${i.tcId}\u0000${i.platform}`)),
      ),
    )
  ).flat();

  const tcIds = [...종류.keys()];
  const 요구: 요구추적줄[] = [];
  const 화면 = new Map<string, string[]>();
  if (읽음.serviceId !== null && tcIds.length > 0) {
    const 기능 = tcIds.filter((t) => 종류.get(t) === 'FN');
    const [판, 지도, 화면행] = await Promise.all([
      지금판(읽음.serviceId),
      pool.query<{ req_id: string; tc_id: string }>('SELECT DISTINCT req_id, tc_id FROM req_case WHERE service_id = $1 AND tc_id = ANY($2) ORDER BY req_id, tc_id', [
        읽음.serviceId,
        기능,
      ]),
      pool.query<{ tc_id: string; 곳: string }>('SELECT tc_id, COALESCE(screen_url, file) AS 곳 FROM case_screen WHERE tc_id = ANY($1) ORDER BY 곳', [
        tcIds.filter((t) => 종류.get(t) === 'UI'),
      ]),
    ]);
    const 문장 = new Map((판?.items ?? []).map((x) => [x.reqId, x.text]));
    const 요구표 = new Map<string, 요구추적줄>();
    for (const r of 지도.rows) {
      const 줄 = 요구표.get(r.req_id) ?? { reqId: r.req_id, text: 문장.get(r.req_id) ?? null, tcIds: [] };
      줄.tcIds.push(r.tc_id);
      요구표.set(r.req_id, 줄);
    }
    요구.push(...요구표.values());
    for (const r of 화면행.rows) 화면.set(r.tc_id, [...(화면.get(r.tc_id) ?? []), r.곳]);
  }

  const 시나리오 = (await Promise.all((await 고른시나리오실행들(pool, 응답.runIds)).map((runId) => collectScenario(runId)))).filter(
    (d): d is E2E증적 => d !== null,
  );
  return { 재료: { 리포트: 응답, 항목, 종류, 요구, 화면, 시나리오 }, pdfPath: 읽음.pdfPath };
}
