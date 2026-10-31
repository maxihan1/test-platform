// 알림 통로가 읽는 질의 — 도는 실행 · 작성 요청과 최근 7일 안에 끝난 것을 서비스를 가로질러 모은다
// 서비스 경계는 호출부가 넘긴 서비스 목록이 전부다. 여기서는 그 밖의 서비스 행을 읽지 않는다

import { 다섯단계인가, 작성예상 } from '../authoring/eta.js';
import { 사슬식, 오류첫줄 } from '../authoring/history.js';
import { 작성제목 } from '../authoring/notify.js';
import { 실행남은시간 } from '../execution/eta.js';
import { RUN_COLUMNS, toRun, type RawRun } from '../execution/runRow.js';
import { 종류조건 } from '../execution/runKind.js';
import type { RunCounts, RunSummary } from '../execution/runTypes.js';
import { 지금항목 } from '../execution/single.js';
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
      env: string;
      testKind: 'UI' | 'FN' | null;
      total: number;
      done: number;
      counts: RunCounts;
      startedAt: string;
      remainingMs: number | null;
    })
  | (NoticeService & {
      // E2E 시나리오 실행 — 러너가 끝에 결과를 한꺼번에 돌려줘 도중 진척 · 남은 시간이 없다
      kind: 'scenario';
      runId: number;
      title: string;
      parts: number;
      startedAt: string;
    })
  | (NoticeService & {
      kind: 'authoring';
      requestId: number;
      title: string;
      status: 'PENDING' | 'RUNNING';
      stage: string | null;
      startedAt: string | null;
      /** 다섯 단계(준비 · 자료 · 스크립트 작성 · 저장 · 완료)를 밟는 작성인가. 머지 · 고치기 · 고치기 다시 적용은 아니다 */
      fiveSteps: boolean;
      /** fiveSteps 가 false 면 null */
      expected: { ms: number; samples: number } | null;
    });

export type NoticeRecent =
  | (NoticeService & {
      kind: 'run';
      runId: number;
      title: string;
      env: string;
      testKind: 'UI' | 'FN' | null;
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
       FROM test_run r LEFT JOIN LATERAL ${지금항목('o.run_id = r.run_id')} i ON true
      WHERE ${조건}
      GROUP BY r.run_id
      ORDER BY COALESCE(r.finished_at, r.started_at) DESC, r.run_id DESC`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows;
}

// 도는 E2E 실행 — 부품 행은 실행을 만들 때 한꺼번에 박혀 단계 수가 곧 부품 행 수다
async function 도는시나리오들(서비스들: 보이는서비스[]) {
  const r = await (await db()).query<{ run_id: string; title: string; service_id: string; started_at: Date; parts: string }>(
    `SELECT r.run_id, r.title, r.service_id, r.started_at,
            (SELECT count(*) FROM scenario_run_part p WHERE p.run_id = r.run_id) AS parts
       FROM test_run r
      WHERE r.service_id = ANY($1) AND r.status = 'RUNNING' AND ${종류조건('scenario')}
      ORDER BY r.run_id DESC`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows;
}

interface 작성행 {
  root_id: string;
  root_kind: string;
  service_id: string;
  latest_kind: string;
  params: unknown;
  status: 'PENDING' | 'RUNNING' | 'DONE' | 'FAILED' | 'STOPPED' | 'DRAFT';
  stage: string | null;
  started_at: Date | null;
  finished_at: Date | null;
  progress: { caseFiles?: unknown } | null;
  pr_url: string | null;
  error: string | null;
}

const 도는상태 = "status IN ('PENDING', 'RUNNING')";
const 끝난상태 = `status IN ('DONE', 'FAILED', 'STOPPED') AND finished_at >= now() - interval '${최근날수} days'`;
const 알림대상 = `(${도는상태} OR (${끝난상태}))`;

/**
 * 뿌리마다 가장 최근 실행 한 줄 — 작성 목록(authoring/history.ts 한쪽)이 줄로 삼는 것과 같다. 폐기한 요청 · PRD 초안은 뺀다.
 * 지금 도는 것과 최근 7일 안에 끝난 것만 볼 뿐이라 거기서 출발해 위로 뿌리를 찾고, 그 뿌리의 사슬만 따라 내려온다 —
 * 서비스의 모든 뿌리를 훑지 않는다. 가장 최근 행이 대상이 아니면 그 뿌리의 어떤 행도 대상이 아니라 놓치는 줄이 없다
 */
async function 작성들(서비스들: 보이는서비스[]): Promise<작성행[]> {
  const r = await (await db()).query<작성행>(
    `WITH RECURSIVE 위(id, source_id) AS (
       SELECT id, source_id FROM authoring_request WHERE service_id = ANY($1) AND kind <> 'PRD_DRAFT' AND ${알림대상}
       UNION
       SELECT a.id, a.source_id FROM authoring_request a JOIN 위 ON a.id = 위.source_id
     ), ${사슬식('id IN (SELECT id FROM 위 WHERE source_id IS NULL)')},
     최신 AS (
       SELECT DISTINCT ON (사슬.root_id) 사슬.root_id,
              (SELECT r.kind FROM authoring_request r WHERE r.id = 사슬.root_id) AS root_kind,
              a.kind AS latest_kind, a.params,
              a.service_id, a.status, a.stage, a.started_at, a.finished_at, a.progress, a.pr_url, a.error, a.discarded_at
         FROM 사슬 JOIN authoring_request a ON a.id = 사슬.id
        ORDER BY 사슬.root_id, a.id DESC
     )
     SELECT * FROM 최신 WHERE discarded_at IS NULL AND ${알림대상}
      ORDER BY COALESCE(finished_at, started_at) DESC NULLS LAST, root_id DESC`,
    [서비스들.map((s) => s.id)],
  );
  return r.rows;
}

export async function 알림(
  실행서비스: 보이는서비스[],
  작성서비스: 보이는서비스[],
): Promise<{ running: NoticeRunning[]; recent: NoticeRecent[] }> {
  const 서비스맵 = new Map([...실행서비스, ...작성서비스].map((s) => [s.id, s]));
  const 비었다 = <T>(목록: 보이는서비스[], 읽기: () => Promise<T[]>) => (목록.length === 0 ? Promise.resolve([] as T[]) : 읽기());
  // 시나리오 실행은 항목이 없어 집계가 늘 0 이다 — 케이스 실행 칸에서 빼고, 도는 것만 따로 담는다 (공통/5-화면공통 §8 「알림」).
  // 한 건 실행은 실행으로 서지 않아 알림에 없다 — 끝은 건 사람의 진행 창이 알린다 (도메인/실행 §3.2)
  const 케이스실행 = `${종류조건('case')} AND r.origin <> 'SINGLE'`;

  const [도는실행, 도는시나리오, 끝난실행, 작성줄] = await Promise.all([
    비었다(실행서비스, () => 실행들(실행서비스, `r.service_id = ANY($1) AND r.status = 'RUNNING' AND ${케이스실행}`)),
    비었다(실행서비스, () => 도는시나리오들(실행서비스)),
    비었다(실행서비스, () =>
      실행들(
        실행서비스,
        `r.run_id IN (SELECT run_id FROM test_run WHERE service_id = ANY($1) AND status <> 'RUNNING' AND ${종류조건('case', '')} AND origin <> 'SINGLE'
                         AND finished_at >= now() - interval '${최근날수} days'
                       ORDER BY finished_at DESC LIMIT ${최근상한})`,
      ),
    ),
    비었다(작성서비스, () => 작성들(작성서비스)),
  ]);
  const 도는작성 = 작성줄.filter((줄) => 줄.status === 'PENDING' || 줄.status === 'RUNNING');
  const 끝난작성 = 작성줄.filter((줄) => 줄.status === 'DONE' || 줄.status === 'FAILED' || 줄.status === 'STOPPED');

  // 실행마다 · 서비스마다 한 번씩만, 서로 기다리지 않고 한꺼번에 읽는다
  const 예상할서비스 = [...new Set(도는작성.filter(다섯단계).map((줄) => Number(줄.service_id)))];
  const 확인할서비스 = [...new Set(끝난작성.filter((줄) => 줄.status === 'DONE').map((줄) => Number(줄.service_id)))];
  const [남은, 예상목록, 확인목록] = await Promise.all([
    Promise.all(도는실행.map((줄) => 실행남은시간(Number(줄.run_id)))),
    Promise.all(예상할서비스.map((id) => 작성예상(id))),
    Promise.all(확인할서비스.map((id) => 지금판(id))),
  ]);
  const 예상 = new Map(예상할서비스.map((id, i) => [id, 예상목록[i]!]));
  // 지금 PRD 의 확인 필요 수 — 끝난 작성이 있는 서비스만
  const 확인수 = new Map(확인할서비스.map((id, i) => [id, 확인목록[i]! === null ? 0 : 확인필요(확인목록[i]!.items).count]));

  const running: NoticeRunning[] = [
    ...도는실행.map((줄, i): NoticeRunning => {
      const 실행 = toRun(줄);
      return {
        ...서비스칸(서비스맵, Number(줄.service_id)),
        kind: 'run',
        runId: 실행.runId,
        title: 실행.title,
        env: 실행.env,
        testKind: 실행.kind === 'SCENARIO' ? null : 실행.kind,
        total: 실행.counts.total,
        done: 실행.counts.total - 실행.counts.running,
        counts: 실행.counts,
        startedAt: 실행.startedAt,
        remainingMs: 남은[i]!,
      };
    }),
    ...도는시나리오.map((줄): NoticeRunning => ({
      ...서비스칸(서비스맵, Number(줄.service_id)),
      kind: 'scenario',
      runId: Number(줄.run_id),
      title: 줄.title,
      parts: Number(줄.parts),
      startedAt: 줄.started_at.toISOString(),
    })),
    ...도는작성.map((줄): NoticeRunning => {
      const 서비스 = Number(줄.service_id);
      const 다섯 = 다섯단계(줄);
      return {
        ...서비스칸(서비스맵, 서비스),
        kind: 'authoring',
        requestId: Number(줄.root_id),
        title: 작성제목(줄.root_kind),
        status: 줄.status as 'PENDING' | 'RUNNING',
        stage: 줄.stage,
        startedAt: 줄.started_at?.toISOString() ?? null,
        fiveSteps: 다섯,
        expected: 다섯 ? (예상.get(서비스) ?? null) : null,
      };
    }),
  ];

  const recent: NoticeRecent[] = [
    ...끝난실행.map((줄): NoticeRecent => {
      const 실행 = toRun(줄);
      return {
        ...서비스칸(서비스맵, Number(줄.service_id)),
        kind: 'run',
        runId: 실행.runId,
        title: 실행.title,
        env: 실행.env,
        testKind: 실행.kind === 'SCENARIO' ? null : 실행.kind,
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
        error: 줄.error === null ? null : 오류첫줄(줄.error),
        prdNeedsCheck: 확인수.get(서비스) ?? 0,
      };
    }),
  ]
    .sort((a, b) => (a.finishedAt < b.finishedAt ? 1 : a.finishedAt > b.finishedAt ? -1 : 0))
    .slice(0, 최근상한);

  return { running, recent };
}

const 다섯단계 = (줄: 작성행): boolean => 다섯단계인가({ kind: 줄.latest_kind, params: 줄.params });
