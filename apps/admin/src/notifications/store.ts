// 알림 통로가 읽는 질의 — 도는 실행 · 작성 요청과 최근 7일 안에 끝난 것을 서비스를 가로질러 모은다
// 서비스 경계는 호출부가 넘긴 서비스 목록이 전부다. 여기서는 그 밖의 서비스 행을 읽지 않는다

import { 사슬식 } from '../authoring/history.js';
import { 작성예상 } from '../authoring/eta.js';
import { 작성제목 } from '../authoring/notify.js';
import { 실행남은시간 } from '../execution/eta.js';
import { RUN_COLUMNS, toRun, type RawRun } from '../execution/runRow.js';
import type { RunCounts, RunSummary } from '../execution/runTypes.js';
import { 지금판 } from '../prd/store.js';
import { 확인필요 } from '../prd/rules.js';

export interface NoticeService {
  serviceId: number;
  prefix: string;
  serviceName: string;
}

export type NoticeRunning =
  | (NoticeService & {
      kind: 'run';
      runId: number;
      title: string;
      total: number;
      done: number;
      counts: RunCounts;
      startedAt: string;
      remainingMs: number | null;
    })
  | (NoticeService & {
      kind: 'authoring';
      requestId: number;
      title: string;
      status: 'PENDING' | 'RUNNING';
      stage: string | null;
      startedAt: string | null;
      expected: { ms: number; samples: number } | null;
    });

export type NoticeRecent =
  | (NoticeService & {
      kind: 'run';
      runId: number;
      title: string;
      status: RunSummary['status'];
      counts: RunCounts;
      finishedAt: string;
    })
  | (NoticeService & {
      kind: 'authoring';
      requestId: number;
      title: string;
      status: 'DONE' | 'FAILED' | 'STOPPED';
      finishedAt: string;
      caseFiles: number | null;
      prUrl: string | null;
      error: string | null;
      prdNeedsCheck: number;
    });

export interface 보이는서비스 {
  id: number;
  prefix: string;
  name: string;
}

const 최근날수 = 7;
const 최근상한 = 50;

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

const 서비스칸 = (맵: Map<number, 보이는서비스>, id: number): NoticeService => {
  const s = 맵.get(id)!;
  return { serviceId: s.id, prefix: s.prefix, serviceName: s.name };
};

// 실행 칸 — 항목 집계가 목록(RUN_COLUMNS)과 같은 식이라 줄의 counts 가 실행 기록 화면과 어긋나지 않는다
async function 실행들(서비스들: 보이는서비스[], 조건: string): Promise<(RawRun & { service_id: string })[]> {
  const r = await (await db()).query<RawRun & { service_id: string }>(
    `SELECT ${RUN_COLUMNS}, r.service_id
       FROM test_run r LEFT JOIN run_item i USING (run_id)
      WHERE ${조건}
      GROUP BY r.run_id
      ORDER BY COALESCE(r.finished_at, r.started_at) DESC, r.run_id DESC`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows;
}

interface 작성행 {
  root_id: string;
  root_kind: string;
  service_id: string;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'STOPPED' | 'DRAFT';
  stage: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  progress: { caseFiles?: unknown } | null;
  pr_url: string | null;
  error: string | null;
}

/** 뿌리마다 가장 최근 실행 한 줄 — 작성 목록(authoring/history.ts 한쪽)이 줄로 삼는 것과 같다. 폐기한 요청은 뺀다 */
async function 작성들(서비스들: 보이는서비스[], 조건: string): Promise<작성행[]> {
  const r = await (await db()).query<작성행>(
    `WITH RECURSIVE ${사슬식('service_id = ANY($1) AND source_id IS NULL')},
     최신 AS (
       SELECT DISTINCT ON (사슬.root_id) 사슬.root_id,
              (SELECT r.kind FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_kind,
              a.service_id, a.status, a.stage, a.started_at, a.finished_at, a.progress, a.pr_url, a.error, a.discarded_at
         FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
        ORDER BY 사슬.root_id, a.id DESC
     )
     SELECT * FROM 최신 WHERE discarded_at IS NULL AND ${조건}
      ORDER BY COALESCE(finished_at, started_at) DESC NULLS LAST, root_id DESC`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows;
}

const 첫줄 = (글: string | null): string | null => (글 === null ? null : (글.split('\n')[0] ?? '').slice(0, 200));

export async function 알림(
  실행서비스: 보이는서비스[],
  작성서비스: 보이는서비스[],
): Promise<{ running: NoticeRunning[]; recent: NoticeRecent[] }> {
  const 서비스맵 = new Map([...실행서비스, ...작성서비스].map((s) => [s.id, s]));
  const 비었다 = <T>(목록: 보이는서비스[], 읽기: () => Promise<T[]>) => (목록.length === 0 ? Promise.resolve([] as T[]) : 읽기());

  const [도는실행, 끝난실행, 도는작성, 끝난작성] = await Promise.all([
    비었다(실행서비스, () => 실행들(실행서비스, "r.service_id = ANY($1) AND r.status = 'RUNNING'")),
    비었다(실행서비스, () =>
      실행들(
        실행서비스,
        `r.run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1) AND status <> 'RUNNING'
                         AND finished_at >= now() - interval '${최근날수} days'
                       ORDER BY finished_at DESC LIMIT ${최근상한})`,
      ),
    ),
    비었다(작성서비스, () => 작성들(작성서비스, "status IN ('PENDING', 'RUNNING')")),
    비었다(작성서비스, () =>
      작성들(작성서비스, `status IN ('DONE', 'FAILED', 'STOPPED') AND finished_at >= now() - interval '${최근날수} days'`),
    ),
  ]);

  const running: NoticeRunning[] = [];
  for (const 줄 of 도는실행) {
    const 실행 = toRun(줄);
    running.push({
      ...서비스칸(서비스맵, Number(줄.service_id)),
      kind: 'run',
      runId: 실행.runId,
      title: 실행.title,
      total: 실행.counts.total,
      done: 실행.counts.total - 실행.counts.running,
      counts: 실행.counts,
      startedAt: 실행.startedAt,
      // 시나리오 실행은 항목이 없어 어림할 근거가 없다
      remainingMs: 실행.kind === 'SCENARIO' ? null : await 실행남은시간(실행.runId),
    });
  }

  // 서비스마다 한 번만 계산한다 — 같은 서비스의 요청이 여럿이어도 질의는 하나다
  const 예상 = new Map<number, { ms: number; samples: number } | null>();
  for (const 줄 of 도는작성) {
    const 서비스 = Number(줄.service_id);
    if (!예상.has(서비스)) 예상.set(서비스, await 작성예상(서비스));
    running.push({
      ...서비스칸(서비스맵, 서비스),
      kind: 'authoring',
      requestId: Number(줄.root_id),
      title: 작성제목(줄.root_kind),
      status: 줄.status as 'PENDING' | 'RUNNING',
      stage: 줄.stage,
      startedAt: 줄.started_at?.toISOString() ?? null,
      expected: 예상.get(서비스) ?? null,
    });
  }

  // 지금 PRD 의 확인 필요 수 — 끝난 작성이 있는 서비스만 서비스마다 한 번 읽는다
  const 확인수 = new Map<number, number>();
  for (const 줄 of 끝난작성) {
    const 서비스 = Number(줄.service_id);
    if (줄.status !== 'DONE' || 확인수.has(서비스)) continue;
    const 판 = await 지금판(서비스);
    확인수.set(서비스, 판 === null ? 0 : 확인필요(판.items).count);
  }

  const recent: NoticeRecent[] = [
    ...끝난실행.map((줄): NoticeRecent => {
      const 실행 = toRun(줄);
      return {
        ...서비스칸(서비스맵, Number(줄.service_id)),
        kind: 'run',
        runId: 실행.runId,
        title: 실행.title,
        status: 실행.status,
        counts: 실행.counts,
        finishedAt: 실행.finishedAt!,
      };
    }),
    ...끝난작성.map((줄): NoticeRecent => {
      const 서비스 = Number(줄.service_id);
      return {
        ...서비스칸(서비스맵, 서비스),
        kind: 'authoring',
        requestId: Number(줄.root_id),
        title: 작성제목(줄.root_kind),
        status: 줄.status as 'DONE' | 'FAILED' | 'STOPPED',
        finishedAt: 줄.finished_at!.toISOString(),
        caseFiles: typeof 줄.progress?.caseFiles === 'number' ? 줄.progress.caseFiles : null,
        prUrl: 줄.pr_url,
        error: 첫줄(줄.error),
        prdNeedsCheck: 확인수.get(서비스) ?? 0,
      };
    }),
  ]
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0))
    .slice(0, 최근상한);

  return { running, recent };
}
