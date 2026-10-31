// 실행이 끝나면 실패 케이스마다 BTS 「QA 검토」 등록 · 또 실패면 열린 이슈에 댓글을 보낼 줄에 넣는다 (도메인/BTS 「버그 바퀴」)
// 보내기는 60초 점검(outbox.ts)이 한다. 여기는 넣기만 — BTS 가 꺼져 있어도 실행 끝을 늦추지 않는다

import type { Pool } from 'pg';

import { 가린다, 항목비밀 } from '../execution/trial.js';
import { 실패카드, type FailureCase } from '../reporting/failures.js';
import { 꼬리표고르기, 또실패댓글, 이슈본문, 이슈제목, 첨부상한, type 실패재료 } from './failBody.js';
import { 재검증실패넘기기 } from './bugfix.js';
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
  origin: string;
  rerun_of: string | null;
}

// BTS 를 이은 프로젝트의 끝난 케이스 실행만 — 시나리오는 카드가 없다
const 실행SQL = `
  SELECT r.service_id, s.project_id, r.env, r.build_no, s.name AS service_name, l.bts_project, r.origin, r.rerun_of
    FROM test_run r
    JOIN service s ON s.id = r.service_id
    JOIN bts_link l ON l.project_id = s.project_id
   WHERE r.run_id = $1 AND r.kind <> 'SCENARIO' AND r.status <> 'RUNNING'`;

/** 러너가 run_item_step.screenshot_path 에 남기는 값의 접두사 (reporting/generate.ts 와 같다) */
const 저장접두 = 'artifacts/';

// 열린 이슈가 먼저, 없으면 가장 늦게 닫힌 것 — 흔들림으로 닫혔는지 본다.
// 풀림 — 닫힌 뒤 그 케이스를 쓴 작성(끝내기 result.cases)이 병합됐다. 테스트를 고쳤으니 다음 실패는 다시 올린다 (도메인/BTS 「판정은 BTS 에서」 흔들림)
const 짝SQL = `
  SELECT c.issue_key, c.closed_at IS NULL AS open, c.resolution,
         EXISTS (SELECT 1 FROM authoring_request m JOIN authoring_request d ON d.id = m.source_id
                  WHERE m.service_id = c.service_id AND m.kind = 'MERGE' AND m.status = 'DONE' AND m.finished_at > c.closed_at
                    AND d.result->'cases' @> jsonb_build_array(jsonb_build_object('tcId', c.tc_id))) AS released
    FROM bts_issue_case c
   WHERE c.service_id = $1 AND c.tc_id = $2 AND c.env = $3
   ORDER BY c.closed_at IS NULL DESC, c.closed_at DESC
   LIMIT 1`;

const 기록상한 = 5;

const 안올릴사유 = new Set(['FLAKY', 'TEST_PROBLEM', 'SCREEN_RIGHT']);

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
    // 최근 흐름 맨 앞은 이번 실행이다 — 섞임은 앞 실행들로만 본다(이번 FAIL 을 넣으면 새로 깨진 회귀가 다 흔들림이 된다)
    꼬리표: 꼬리표고르기(d.item.failure?.type ?? null, d.recent.slice(1)),
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
  // 산출물 폴더 기준 경로. 보낼 때 outbox 가 파일을 읽어 올린다. 러너가 만든 모양이 아니면 싣지 않는다 — 파일시스템을 읽는 자리다
  const 캡처 = d.item.steps
    .flatMap((s) => (s.status === 'FAIL' && s.screenshotPath !== undefined ? [s.screenshotPath] : []))
    .filter((p) => p.startsWith(`${저장접두}runs/`) && !p.includes('..'))
    .slice(0, 첨부상한)
    .map((p) => p.slice(저장접두.length));
  return { 재료, 캡처 };
}

/**
 * 넣은 줄 수. BTS 를 안 이은 프로젝트 · 시나리오면 0.
 * 한 건 실행은 붙는 실행(부모)의 카드로 그 한 건만 올린다 — 카드가 부모 자리에 서고, 부모에서 통과했던 케이스가 새로 깨질 수 있다
 */
// ponytail: 화면용 실패카드()를 그대로 써 팜 증적 · 판정 같은 BTS 에 안 쓰는 칸도 읽는다. 실행 끝 뒤에 따로 도는 일이라 두었다 — 실패가 수백 건이라 느리면 가벼운 질의로 뗀다
export async function 실패등록(runId: number): Promise<number> {
  const pool = await db();
  const 실행 = (await pool.query<실행행>(실행SQL, [runId])).rows[0];
  if (실행 === undefined) return 0;
  const 한건 = 실행.origin === 'SINGLE' && 실행.rerun_of !== null;
  const 카드실행 = 한건 ? Number(실행.rerun_of) : runId;
  const 그것만 = 한건
    ? new Set((await pool.query<{ tc_id: string }>('SELECT DISTINCT tc_id FROM run_item WHERE run_id = $1', [runId])).rows.map((r) => r.tc_id))
    : null;
  const 서비스 = Number(실행.service_id);
  let 넣음 = 0;
  for (let page = 1; ; page++) {
    const 쪽 = await 실패카드(카드실행, page);
    for (const c of 쪽.items) {
      if (그것만 !== null && !그것만.has(c.tcId)) continue;
      const 짝 = (await pool.query<{ issue_key: string; open: boolean; resolution: string | null; released: boolean }>(짝SQL, [서비스, c.tcId, 실행.env])).rows[0];
      // 흔들림 · 테스트 문제 · 화면이 맞음으로 닫힌 테스트는 다음 실패부터 올리지 않는다 — 사람이 판정했고 테스트를 고칠 일만 남았다.
      // 그 케이스를 고친 작성이 병합되면 다시 올린다(도메인/BTS 「판정은 BTS 에서」)
      if (짝 !== undefined && !짝.open && 안올릴사유.has(짝.resolution ?? '') && !짝.released) continue;
      const { 재료, 캡처 } = await 재료만들기(pool, 실행, 카드실행, c);
      // 줄은 카드가 서는 실행에 단다 — 실패 카드가 그 실행 번호로 bts 칸을 읽는다
      const 공통 = { projectId: Number(실행.project_id), serviceId: 서비스, runId: 카드실행, tcId: c.tcId, env: 실행.env };
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
      // 수정 PR 을 배포한 뒤 또 실패 — 수정 AI 는 다시 안 맡고 넘겼던 사람에게 돌린다(도메인/BTS 「수정 AI」). 댓글 뒤에 줄을 넣어 BTS 에도 그 차례로 닿는다
      if (짝 !== undefined && 짝.open) await 재검증실패넘기기(Number(실행.project_id), 짝.issue_key, 재료.원인 ?? '', runId);
    }
    if (page * 쪽.pageSize >= 쪽.total) break;
  }
  return 넣음;
}
