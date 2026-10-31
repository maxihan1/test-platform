// 실행이 끝나면 실패 케이스마다 BTS 「QA 검토」 등록 · 또 실패면 열린 이슈에 댓글을 보낼 줄에 넣는다 (도메인/BTS 「버그 바퀴」)
// 보내기는 60초 점검(outbox.ts)이 한다. 여기는 넣기만 — BTS 가 꺼져 있어도 실행 끝을 늦추지 않는다

import type { Pool } from 'pg';

import { 가린다, 항목비밀 } from '../execution/trial.js';
import { 실패카드, type FailureCase } from '../reporting/failures.js';
import { 꼬리표고르기, 또실패댓글, 이슈본문, 이슈제목, 첨부상한, type 실패재료 } from './failBody.js';
import { 보낼줄넣기 } from './outbox.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 실행행 {
  service_id: string;
  project_id: string;
  env: string;
  build_no: string | null;
  service_name: string;
  bts_project: string;
}

// BTS 를 이은 프로젝트의 끝난 케이스 실행만 — 시나리오는 카드가 없고, 한 건 실행은 붙는 실행(부모)이 이미 올렸다
const 실행SQL = `
  SELECT r.service_id, s.project_id, r.env, r.build_no, s.name AS service_name, l.bts_project
    FROM test_run r
    JOIN service s ON s.id = r.service_id
    JOIN bts_link l ON l.project_id = s.project_id
   WHERE r.run_id = $1 AND r.kind <> 'SCENARIO' AND r.origin <> 'SINGLE' AND r.status <> 'RUNNING'`;

// 열린 이슈가 먼저, 없으면 가장 늦게 닫힌 것 — 흔들림으로 닫혔는지 본다
const 짝SQL = `
  SELECT issue_key, closed_at IS NULL AS open, resolution
    FROM bts_issue_case
   WHERE service_id = $1 AND tc_id = $2 AND env = $3
   ORDER BY closed_at IS NULL DESC, closed_at DESC
   LIMIT 1`;

const 기록상한 = 5;

/** trace 를 다 풀었을 때만 실패한 요청 · 콘솔 오류를 준다. 값은 적재 때 이미 가렸다(execution/traceIngest.ts) */
async function 기록읽기(pool: Pool, historyId: number): Promise<{ 네트워크: string[] | null; 콘솔: string[] | null }> {
  const 상태 = await pool.query<{ status: string }>('SELECT status FROM run_trace WHERE history_id = $1', [historyId]);
  if (상태.rows[0]?.status !== 'DONE') return { 네트워크: null, 콘솔: null };
  const [망, 콘솔] = await Promise.all([
    pool.query<{ method: string; url: string; status: number | null; failure: string | null }>(
      `SELECT method, url, status, failure FROM run_network
        WHERE history_id = $1 AND (status >= 400 OR failure IS NOT NULL) ORDER BY ord LIMIT ${String(기록상한)}`,
      [historyId],
    ),
    pool.query<{ level: string; text: string }>(
      `SELECT level, text FROM run_console WHERE history_id = $1 AND level IN ('error', 'pageerror') ORDER BY ord LIMIT ${String(기록상한)}`,
      [historyId],
    ),
  ]);
  return {
    네트워크: 망.rows.map((r) => `${r.method} ${r.url} → ${r.status === null ? (r.failure ?? '응답 없음') : String(r.status)}`.slice(0, 500)),
    콘솔: 콘솔.rows.map((r) => `[${r.level}] ${r.text}`.slice(0, 500)),
  };
}

/** 카드의 첫 디바이스(화면 차례)로 쓴다 — 한 테스트 · 한 대상 서버에 이슈는 하나다 */
async function 재료만들기(pool: Pool, 실행: 실행행, runId: number, c: FailureCase) {
  const d = c.devices[0]!;
  const 기록 = await 기록읽기(pool, d.item.historyId);
  const 확인 = d.item.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL') ?? null;
  const 공개주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const 날재료: 실패재료 = {
    애플리케이션: 실행.service_name,
    tcId: c.tcId,
    tcName: c.tcName,
    env: 실행.env,
    build: 실행.build_no,
    device: d.device,
    steps: d.item.steps.map((s) => ({ title: s.title, status: s.status })),
    reqs: c.reqs,
    확인: 확인 === null ? null : { statement: 확인.statement, expected: 확인.expected, actual: 확인.actual },
    원인: d.item.failure?.reason ?? null,
    ...기록,
    결과주소: 공개주소 === '' ? null : `${공개주소}/runs/${String(runId)}`,
    꼬리표: 꼬리표고르기(d.item.failure?.type ?? null, d.recent),
  };
  // 항목 상세는 이미 가렸지만 단계 제목 · 요구 문장 · 기록까지 밖으로 나가는 재료 전부를 한 번 더 가린다 — 되비친 비밀값(리포팅 「되비친 비밀값」).
  // 본문을 만들기 전에 가린다 — 만든 뒤 가리면 별표가 글을 늘려 크기 상한을 넘을 수 있다
  const 비밀 = 항목비밀({
    params: d.item.params,
    expected: d.item.expected,
    param_schema: d.item.paramSchema,
    expected_schema: d.item.expectedSchema,
  });
  const 재료 = 가린다(날재료, 비밀) as 실패재료;
  // 산출물 폴더 기준 경로. 보낼 때 outbox 가 파일을 읽어 올린다
  const 캡처 = d.item.steps
    .filter((s) => s.status === 'FAIL' && s.screenshotPath !== undefined)
    .slice(0, 첨부상한)
    .map((s) => `runs/${String(d.item.runId)}/${String(d.item.historyId)}/${String(s.seq)}.png`);
  return { 재료, 캡처 };
}

/** 넣은 줄 수. BTS 를 안 이은 프로젝트 · 시나리오 · 한 건 실행이면 0 */
export async function 실패등록(runId: number): Promise<number> {
  const pool = await db();
  const 실행 = (await pool.query<실행행>(실행SQL, [runId])).rows[0];
  if (실행 === undefined) return 0;
  const 서비스 = Number(실행.service_id);
  let 넣음 = 0;
  for (let page = 1; ; page++) {
    const 쪽 = await 실패카드(runId, page);
    for (const c of 쪽.items) {
      const 짝 = (await pool.query<{ issue_key: string; open: boolean; resolution: string | null }>(짝SQL, [서비스, c.tcId, 실행.env])).rows[0];
      // 흔들림으로 닫힌 테스트는 다음 실패부터 올리지 않는다 — 다시 올리는 때(그 케이스를 고친 작성 병합)는 BTS-F3-04
      if (짝 !== undefined && !짝.open && 짝.resolution === 'FLAKY') continue;
      const { 재료, 캡처 } = await 재료만들기(pool, 실행, runId, c);
      const 공통 = { projectId: Number(실행.project_id), serviceId: 서비스, runId, tcId: c.tcId, env: 실행.env };
      const id =
        짝 !== undefined && 짝.open
          ? await 보낼줄넣기({ ...공통, kind: 'COMMENT', issueKey: 짝.issue_key, payload: { body: 또실패댓글(재료, runId) } })
          : // 기다리는 등록이 이미 있으면 null — 첫 실패 실행으로 올린다(bts_outbox 고유 인덱스)
            await 보낼줄넣기({
              ...공통,
              kind: 'CREATE',
              payload: {
                projectKey: 실행.bts_project,
                summary: 이슈제목(재료),
                description: 이슈본문(재료),
                labels: ['QA Hub', 재료.꼬리표],
                attachments: 캡처,
              },
            });
      if (id !== null) 넣음++;
    }
    if (page * 쪽.pageSize >= 쪽.total) break;
  }
  return 넣음;
}
