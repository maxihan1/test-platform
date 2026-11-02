// MCP 실행 도구 둘 — 실행 찾기(run_search)와 실행 결과 보기(run_result). 화면 실행 통로와 같은 권한을 거친다 (도메인/BTS §3.12 「맥락 — MCP 조회 도구」 · §7 「MCP」)

import { 문판정 } from '../auth/gate.js';
import { 필요권한 } from '../auth/routeTable.js';
import { 서비스없음, 자원의서비스, 케이스의서비스 } from '../auth/scope.js';
import type { 사용자 } from '../auth/store.js';
import { findRun } from '../execution/queries.js';
import { 글상한, 막힘, 문막힘, 안목록, 없음, 열기, 자르기, 최대줄, type 도구답 } from './tools.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

// 실행 찾기는 최근 몇 개만 — 자동 AI 는 가장 늦은 실패 하나 둘을 보면 된다
const 최대실행 = 10;

export type 실행찾을것 = { tcId?: string; issueKey?: string };

/**
 * 실행 찾기 — 케이스 번호나 이슈 키로 그 케이스가 든 최근 케이스 실행 (GET /api/runs 와 같은 권한).
 * 자동 AI 가 run_result 에 넣을 실행 번호를 얻는 길이다. 이슈 키는 실패를 BTS 에 올릴 때 남긴 짝 기록(bts_issue_case)으로 케이스를 찾는다
 */
export async function 실행찾기(사람: 사용자, service: string, 찾을것: 실행찾을것): Promise<도구답> {
  const 번호 = 열기(사람, '/api/runs', service);
  if (typeof 번호 !== 'number') return 번호;
  const pool = await db();
  let 케이스들: string[];
  if (찾을것.tcId !== undefined) {
    // 다른 애플리케이션 케이스 번호를 이 애플리케이션 권한으로 찾지 못하게 머리를 맞춘다. 지운 케이스도 지난 실행은 찾는다
    if (케이스의서비스(찾을것.tcId) !== service) return 막힘(찾을것.tcId);
    케이스들 = [찾을것.tcId];
  } else if (찾을것.issueKey !== undefined) {
    // 닫힌 짝도 본다 — 수정 AI 는 같은 버그가 전에 어떻게 실패했는지 봐야 한다
    const r = await pool.query<{ tc_id: string }>('SELECT DISTINCT tc_id FROM bts_issue_case WHERE service_id = $1 AND issue_key = $2 ORDER BY tc_id', [번호, 찾을것.issueKey]);
    케이스들 = r.rows.map((x) => x.tc_id);
    if (케이스들.length === 0) return { ok: true, data: { runs: [], empty: `${찾을것.issueKey} 에 짝 지은 ${service} 케이스가 없다` } };
  } else {
    return { ok: false, error: 'BAD_INPUT', detail: 'tcId · issueKey 중 하나' };
  }

  // 하나 더 읽어 넘쳤는지 안다. 시나리오 실행은 run_item 이 없어 저절로 빠진다
  const 실행 = await pool.query<{ run_id: string; title: string; status: string; env: string | null; started_at: Date; finished_at: Date | null }>(
    `SELECT r.run_id, r.title, r.status, r.env, r.started_at, r.finished_at FROM test_run r
      WHERE r.service_id = $1 AND EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = r.run_id AND i.tc_id = ANY($2))
      ORDER BY r.started_at DESC, r.run_id DESC LIMIT $3`,
    [번호, 케이스들, 최대실행 + 1],
  );
  const 실을것 = 실행.rows.slice(0, 최대실행);
  if (실을것.length === 0) return { ok: true, data: { runs: [], empty: `${케이스들.slice(0, 안목록).join(' · ')} 가 든 실행이 없다` } };
  const 항목 = await pool.query<{ run_id: string; tc_id: string; platform: string; attempt: number; status: string; finished_at: Date | null }>(
    `SELECT run_id, tc_id, platform, attempt, status, finished_at FROM run_item
      WHERE run_id = ANY($1) AND tc_id = ANY($2) ORDER BY run_id, tc_id, platform, attempt`,
    [실을것.map((x) => x.run_id), 케이스들],
  );
  return {
    ok: true,
    data: {
      runs: 실을것.map((x) => {
        const 줄 = 항목.rows.filter((i) => i.run_id === x.run_id);
        return {
          runId: Number(x.run_id),
          title: x.title,
          status: x.status,
          env: x.env,
          startedAt: x.started_at,
          finishedAt: x.finished_at,
          items: 줄.slice(0, 안목록).map((i) => ({ tcId: i.tc_id, platform: i.platform, attempt: i.attempt, status: i.status, finishedAt: i.finished_at })),
          ...(줄.length > 안목록 && { moreItems: 줄.length - 안목록 }),
        };
      }),
      ...(실행.rows.length > 최대실행 && { truncated: true }),
    },
  };
}

/** 입력값 하나 — 글은 그대로 재고, 목록 · 묶음은 JSON 글로 재서 넘으면 잘린 JSON 글로 바꾼다 */
function 값자르기(v: unknown): unknown {
  if (typeof v === 'string') return 자르기(v, 글상한.입력값);
  const 글 = JSON.stringify(v) ?? '';
  return 글.length > 글상한.입력값 ? 자르기(글, 글상한.입력값) : v;
}

/** 실행 결과 보기 — 판단에 쓰는 칸만. 통과는 숫자로, 실패 · 미실행만 줄로 page 마다 30줄 (GET /api/runs/:runId 와 같은 권한 · 도메인/BTS §7 「MCP」 run_result) */
export async function 실행보기(사람: 사용자, runId: number, page = 0): Promise<도구답> {
  const 서비스 = await 자원의서비스({ 종류: '실행', 번호: runId });
  if (서비스 === 서비스없음) return 막힘(String(runId));
  if (서비스 === null) return 없음(String(runId));
  const 판정 = 문판정(사람, 필요권한('/api/runs/:runId', 'GET'), [서비스]);
  if (판정 !== null) return 문막힘(판정);
  const 실행 = await findRun(runId);
  // 시나리오 실행은 케이스 실행 모양이 아니다 — 1차는 케이스 실행만
  if (실행 === null) return 없음(String(runId));
  // 회귀 실행은 항목이 수천 줄이다 — 통과는 counts 숫자로 충분하고, AI 가 볼 것은 실패 · 미실행이다. 다 보려면 화면을 연다
  // 빼는 칸 — 입력 칸 모양 · 기록 번호 · 원래 결과 · 깔린 앱 · 서버 안 증적 경로는 판단에 안 쓰고, itemsTotal 은 counts.total 과 같다
  const { items: 전부, evidence, installedApps: _깔린, triggeredBy, triggeredByName, ...머리 } = 실행;
  // 도는 중인 항목(NA · 끝난 때 없음)은 미실행이 아니다 — counts.running 으로만 센다
  const 못통과 = 전부.filter((i) => i.status !== 'PASS' && i.finishedAt !== null).sort((a, b) => (a.status === b.status ? 0 : a.status === 'FAIL' ? -1 : 1));
  const items = 못통과.slice(page * 최대줄, (page + 1) * 최대줄).map((i) => ({
    tcId: i.tcId,
    tcName: i.tcName,
    platform: i.platform,
    status: i.status,
    attempt: i.attempt,
    durationMs: i.durationMs,
    error:
      i.error === null
        ? null
        : { message: 자르기(i.error.message, 글상한.오류), ...(i.error.stack !== undefined && { stack: 자르기(i.error.stack, 글상한.stack) }) },
    params: Object.fromEntries(Object.entries(i.params).map(([k, v]) => [k, 값자르기(v)])),
    unconfirmed: i.unconfirmed,
    ...(i.rerun !== null && { rerunRunId: i.rerun.runId }),
  }));
  return {
    ok: true,
    data: {
      ...머리,
      triggeredBy: triggeredByName ?? triggeredBy,
      items,
      ...(못통과.length > (page + 1) * 최대줄 && { truncated: true }),
      evidence: evidence.map((e) => ({ id: e.id, format: e.format, status: e.status, error: e.error === null ? null : 자르기(e.error, 글상한.오류), generatedAt: e.generatedAt })),
    },
  };
}
