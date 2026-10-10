// 실행 묶음 한 줄 — 칸 목록과 응답 모양으로 옮기기. queries.ts 가 300줄을 넘어 떼어 냈다 (SPEC 도메인/실행 §7)

import type { ItemStatus } from '@platform/kit';

import type { RunKind } from './runKind.js';
import type { 시나리오실행줄 } from './runSummary.js';
import type { RunSummary } from './runTypes.js';

const iso = (v: Date | null): string | null => (v === null ? null : v.toISOString());

// 실행 묶음 한 줄에 판정 개수까지 붙인다. 없으면 목록 화면이 실행마다 항목을 또 불러야 한다.
// 통과·실패·미실행은 미확정 여부와 상관없이 모든 항목을 센다. 미확정은 「그중 N건」 하나로만 따로 센다 (SPEC 실행 §3.2)
export const RUN_COLUMNS = `
  r.run_id, r.title, r.triggered_by, r.triggered_by_name, r.env, r.base_url, r.service_name,
  r.status, r.started_at, r.finished_at, r.kind,
  count(i.history_id)::int AS total,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'PASS')::int AS pass,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'FAIL')::int AS fail,
  count(i.history_id) FILTER (WHERE i.finished_at IS NOT NULL AND i.status = 'NA')::int AS na,
  count(i.history_id) FILTER (WHERE i.finished_at IS NULL)::int AS running,
  count(i.history_id) FILTER (WHERE i.unconfirmed IS NOT NULL)::int AS u_total`;

export interface RawRun {
  run_id: string;
  title: string;
  triggered_by: string;
  triggered_by_name: string | null;
  env: string;
  base_url: string;
  service_name: string;
  status: string;
  kind: RunKind;
  started_at: Date;
  finished_at: Date | null;
  total: number;
  pass: number;
  fail: number;
  na: number;
  running: number;
  u_total: number;
  grand_total?: number;
}

export function toRun(row: RawRun): RunSummary {
  return {
    runId: Number(row.run_id),
    title: row.title,
    triggeredBy: row.triggered_by,
    triggeredByName: row.triggered_by_name,
    env: row.env,
    baseUrl: row.base_url,
    serviceName: row.service_name,
    status: row.status,
    kind: row.kind,
    startedAt: row.started_at.toISOString(),
    finishedAt: iso(row.finished_at),
    counts: {
      total: row.total,
      pass: row.pass,
      fail: row.fail,
      na: row.na,
      running: row.running,
      unconfirmed: row.u_total,
    },
  };
}

export function to시나리오줄(
  row: RawRun & { scenario_id: string; scenario_version: number; part_count: number; stopped_at: number | null; unconfirmed: boolean; verdict: ItemStatus | null },
): 시나리오실행줄 {
  const { counts: _counts, ...머리 } = toRun(row);
  return {
    ...머리,
    scenarioId: Number(row.scenario_id),
    version: row.scenario_version,
    partCount: row.part_count,
    stoppedAt: row.stopped_at,
    unconfirmed: row.unconfirmed,
    verdict: row.verdict,
  };
}
