// QA 리포트 한 버전 읽기와 문서 재료 — 첫 장(summary) · 기능 · UI 항목(첫 장과 같은 실행) · 요구사항 추적 · 화면 · E2E 시나리오 (도메인/리포팅 §3.17)

import type { Pool, PoolClient } from 'pg';

import { 지금판 } from '../prd/store.js';
import { collectRun, type EvidenceItem } from './collect.js';
import { 심은절차들 } from './generate.js';
import { collectScenario, type E2E증적 } from './collectScenario.js';
import { 고른시나리오실행들, 고른실행들 } from './qaReportCases.js';
import { 비기능재료읽기, type 비기능재료 } from './qaReportNonFunc.js';
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
  ai_status: string | null;
  approved_by: string | null;
  approved_name: string | null;
  approved_at: Date | null;
  pdf_path: string | null;
  pdf_sha256: string | null;
  updated_at: Date;
}

const 번호 = (v: string | null): number | null => (v === null ? null : Number(v));

/** 그 빌드의 배포보다 늦게 승인했으면 사후 승인이다. 배포가 없으면 붙이지 않는다 (§3.17 「첫 장」 승인) — 굳힐 PDF 와 GET 응답이 같이 쓴다 */
export async function 사후승인(pool: Pool | PoolClient, runIds: readonly (string | number)[], 승인때: Date): Promise<boolean> {
  const 배포 = (await pool.query<{ at: Date | null }>('SELECT min(created_at) AS at FROM bts_deploy WHERE run_ids && $1::bigint[]', [runIds])).rows[0]?.at ?? null;
  return 배포 !== null && 승인때 > 배포;
}

/** 리포트 한 버전 — 응답과 함께 문서가 쓸 애플리케이션 번호 · 승인 때 굳힌 PDF 경로를 낸다 */
export async function 리포트읽기(pool: Pool | PoolClient, id: number): Promise<{ 응답: 리포트응답; serviceId: number | null; pdfPath: string | null } | null> {
  const q = (await pool.query<리포트행>('SELECT q.*, s.prefix, j.status AS ai_status FROM qa_report q LEFT JOIN service s ON s.id = q.service_id LEFT JOIN perf_ai_job j ON j.id = q.ai_job_id WHERE q.id = $1', [id])).rows[0];
  if (q === undefined) return null;
  const 버전들 = (
    await pool.query<{ id: string; version: number; approved_at: Date | null }>('SELECT id, version, approved_at FROM qa_report WHERE bundle_key = $1 ORDER BY version', [q.bundle_key])
  ).rows;
  let approval: 리포트응답['approval'] = null;
  if (q.approved_at !== null) {
    approval = { by: q.approved_by!, byName: q.approved_name, at: q.approved_at.toISOString(), late: await 사후승인(pool, q.run_ids, q.approved_at), sha256: q.pdf_sha256 };
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
      // 실패는 저장하지 않고 일 상태로 낸다 — 오래 쥔 일 닫기 · 재료 실패도 리포트를 고치지 않고 「만들지 못했습니다」가 선다
      ai: q.ai ?? (q.ai_status === 'FAILED' ? { failed: true } : null),
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
  /** 「비기능 검증」 구획 — 호환성 격자 · 성능 목표 · 안정화 오류 종류 */
  비기능: 비기능재료;
}

/** 리포트 한 버전을 문서로 그릴 재료. 지도 · 판은 받는 때 것이고 첫 장은 만든 때 굳힌 값이다 */
export async function 문서재료읽기(pool: Pool, 읽음: { 응답: 리포트응답; serviceId: number | null }): Promise<문서재료> {
  const { 응답 } = 읽음;
  const 고른 = await 고른실행들(pool, 응답.runIds);
  const 종류 = new Map(고른.map((g) => [g.tcId, g.kind]));
  const 실행별 = new Map<number, string[]>();
  for (const g of 고른) 실행별.set(g.runId, [...(실행별.get(g.runId) ?? []), `${g.tcId} ${g.platform}`]);
  // 고른 케이스 × 디바이스만 읽는다 — 다시 돈 실행에서 몇 건만 고른 경우가 흔해 실행 전부를 읽으면 대부분 버린다
  const 항목 = (await Promise.all([...실행별].map(async ([runId, 열쇠]) => (await collectRun(runId, 열쇠))?.items ?? []))).flat();

  const tcIds = [...종류.keys()];
  const 요구: 요구추적줄[] = [];
  const 화면 = new Map<string, string[]>();
  // 화면 기록은 케이스 번호로 읽어 애플리케이션이 지워진 리포트도 그린다. 지도 ① · 판은 애플리케이션에 붙어 있어 그때는 비운다
  const 화면행 = await pool.query<{ tc_id: string; 곳: string }>('SELECT tc_id, COALESCE(screen_url, file) AS 곳 FROM case_screen WHERE tc_id = ANY($1) ORDER BY 곳', [
    tcIds.filter((t) => 종류.get(t) === 'UI'),
  ]);
  for (const r of 화면행.rows) 화면.set(r.tc_id, [...(화면.get(r.tc_id) ?? []), r.곳]);
  if (읽음.serviceId !== null && tcIds.length > 0) {
    const [판, 지도] = await Promise.all([
      지금판(읽음.serviceId),
      pool.query<{ req_id: string; tc_id: string }>('SELECT DISTINCT req_id, tc_id FROM req_case WHERE service_id = $1 AND tc_id = ANY($2) ORDER BY req_id, tc_id', [
        읽음.serviceId,
        tcIds.filter((t) => 종류.get(t) === 'FN'),
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
  }

  // 비기능 재료는 시나리오 증적과 서로 안 기대 같이 읽는다
  const [시나리오들, 비기능] = await Promise.all([
    고른시나리오실행들(pool, 응답.runIds).then((ids) => Promise.all(ids.map((runId) => collectScenario(runId)))),
    비기능재료읽기(pool, 응답),
  ]);
  const 시나리오 = 시나리오들.filter((d): d is E2E증적 => d !== null);
  return { 리포트: 응답, 항목, 종류, 요구, 화면, 시나리오, 비기능 };
}

// 사진은 문서 안에 심는다(증적과 같다 — generate.ts). UI 구획은 실패 항목의 사진만 싣는다 (§3.17 결정 8 「UI = 화면별(실패만 사진)」)
export async function 사진심은(재료: 문서재료): Promise<문서재료> {
  const 항목 = await Promise.all(
    재료.항목.map(async (i) => {
      const 뺀다 = 재료.종류.get(i.tcId) === 'UI' && i.status !== 'FAIL';
      return { ...i, steps: 뺀다 ? i.steps.map((x) => ({ ...x, screenshotPath: null })) : await 심은절차들(i.steps) };
    }),
  );
  const 시나리오 = await Promise.all(
    재료.시나리오.map(async (doc) => ({
      ...doc,
      parts: await Promise.all(doc.parts.map(async (d) => (d.item === null ? d : { ...d, item: { ...d.item, steps: await 심은절차들(d.item.steps) } }))),
    })),
  );
  return { ...재료, 항목, 시나리오 };
}
