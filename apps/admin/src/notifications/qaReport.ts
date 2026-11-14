// 알림의 「승인 전 QA 리포트」 줄 — 그 리포트를 지금 승인할 수 있는 admin 에게만, 승인 전 리포트 하나에 한 줄 (도메인/리포팅 §3.17 「승인 전 알림」)
// 읽음 표시가 없다 — 승인되면 줄이 사라지고, 승인 뒤 버전이 오르면 그 버전으로 다시 선다

import { 막는일SQL, 승인막힘 } from '../reporting/qaReportApprove.js';
import type { NoticeService, 보이는서비스 } from './store.js';

export type 승인전줄 = NoticeService & {
  kind: 'qa_report';
  reportId: number;
  buildNo: string | null;
  runId: number | null;
  perfRunId: number | null;
  version: number;
  updatedAt: string;
};

// 알림의 끝난 줄(recent)과 같은 상한이다
const 상한 = 50;

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 서비스들은 이 사람이 배정받은 애플리케이션이다. admin 이 아니면 부르지 않는다 */
export async function 승인전알림(username: string, 서비스들: 보이는서비스[]): Promise<승인전줄[]> {
  if (서비스들.length === 0) return [];
  const 맵 = new Map(서비스들.map((s) => [s.id, s]));
  // 묶음마다 승인 전 버전은 하나뿐이고 늘 마지막 버전이다(승인한 버전 위에만 새 버전이 선다)
  const r = await (await db()).query<{
    id: string;
    service_id: string;
    build_no: string | null;
    run_id: string | null;
    perf_run_id: string | null;
    version: number;
    performers: string[];
    running: number;
    ai_pending: boolean;
    updated_at: Date;
  }>(
    // 빌드 없는 정기 실행 하나의 리포트는 알리지 않는다 — 매일 하나씩 쌓이고, 내보낼 빌드가 없어 승인을 기다리는 일이 아니다(승인은 된다)
    `SELECT q.id, q.service_id, q.build_no, q.run_id, q.perf_run_id, q.version, q.performers, q.updated_at, ${막는일SQL}
       FROM qa_report q
      WHERE q.service_id = ANY($1) AND q.approved_at IS NULL
        AND NOT (q.build_no IS NULL AND (EXISTS (SELECT 1 FROM test_run t WHERE t.run_id = q.run_id AND t.origin = 'SCHEDULED')
                                      OR EXISTS (SELECT 1 FROM perf_run p WHERE p.id = q.perf_run_id AND p.origin = 'SCHEDULED')))
      ORDER BY q.updated_at DESC, q.id DESC
      LIMIT ${상한}`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows
    .filter((q) => 승인막힘(username, { running: q.running, aiPending: q.ai_pending, performers: q.performers }) === null)
    .map((q) => {
      const s = 맵.get(Number(q.service_id))!;
      return {
        kind: 'qa_report',
        serviceId: s.id,
        prefix: s.prefix,
        serviceName: s.name,
        reportId: Number(q.id),
        buildNo: q.build_no,
        runId: q.run_id === null ? null : Number(q.run_id),
        perfRunId: q.perf_run_id === null ? null : Number(q.perf_run_id),
        version: q.version,
        updatedAt: q.updated_at.toISOString(),
      };
    });
}
