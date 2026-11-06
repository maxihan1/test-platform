// 실행이 끝나면 실패 케이스마다 BTS 「QA 검토」 등록 · 또 실패면 열린 이슈에 댓글을 보낼 줄에 넣는다 (도메인/BTS 「버그 바퀴」)
// 보내기는 60초 점검(outbox.ts)이 한다. 여기는 넣기만 — BTS 가 꺼져 있어도 실행 끝을 늦추지 않는다

import { setTimeout as 잠깐 } from 'node:timers/promises';

import type { BrowserPlatform } from '@platform/kit';
import type { Pool } from 'pg';

import { 팜logcat읽기, 팜증적받는중 } from '../execution/farmEvidence.js';
import { trace줄끝 } from '../execution/traceIngest.js';
import { 종류조건 } from '../execution/runKind.js';
import { 지금항목 } from '../execution/single.js';
import { 가린다, 긴것부터, 항목비밀 } from '../execution/trial.js';
import { 실패카드, type FailureCase, type FailureDevice } from '../reporting/failures.js';
import { 디바이스순서 } from '../reporting/failuresShape.js';
import { logcat오류줄, 같은곳에서깨짐, 꼬리표고르기, 또실패댓글, 이슈본문, 이슈제목, 첨부상한, type 실패재료, type 화면재료 } from './failBody.js';
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
  /** 애플리케이션 종류 — 화면 줄은 웹(SCREEN)만 적는다 */
  kind: string;
}

// BTS 를 이은 프로젝트의 끝난 케이스 실행만 — 시나리오 · 호환성은 카드가 없다
const 실행SQL = `
  SELECT r.service_id, s.project_id, r.env, r.build_no, s.name AS service_name, l.bts_project, r.origin, r.rerun_of, s.kind
    FROM test_run r
    JOIN service s ON s.id = r.service_id
    JOIN bts_link l ON l.project_id = s.project_id
   WHERE r.run_id = $1 AND ${종류조건('case')} AND r.status <> 'RUNNING'`;

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

// 풀기가 멈추면(볼륨 읽기가 안 돌아오는 것 같은) 줄 끝이 안 온다 — 그때도 등록은 나가야 한다
const trace기다림상한ms = 5 * 60_000;

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

/**
 * 앱 · 게임 항목의 logcat 오류 줄. 러너는 항목에 답한 뒤 팜 증적을 받아 실행이 막 끝나면 마지막 항목들 것이 아직 없다 — 받는 동안은 마감까지 기다린다.
 * 받는 중인지 먼저 본다 — 러너는 logcat 을 옮긴 뒤에 번호 파일을 지워, 거꾸로 보면 그 틈에 옮긴 logcat 을 없다고 친다
 */
async function 폰로그읽기(runId: number, historyId: number, 마감: number): Promise<실패재료['폰로그']> {
  try {
    for (;;) {
      const 받는중 = await 팜증적받는중(runId, historyId);
      const 글 = await 팜logcat읽기(runId, historyId);
      if (글 !== null) return logcat오류줄(글);
      if (!받는중) return '없음';
      if (Date.now() >= 마감) {
        console.warn(`[bts] 항목 ${String(historyId)} — 팜 증적을 기다림 상한 안에 다 받지 못해 폰 로그 없이 올린다`);
        return '없음';
      }
      await 잠깐(1000);
    }
  } catch (err) {
    // 한 항목의 파일을 못 읽었다고 실행의 다른 실패까지 안 올라가면 안 된다 — 까닭을 남기고 폰 로그 없이 올린다
    console.error(`[bts] 항목 ${String(historyId)} 의 폰 로그를 읽지 못해 없이 올린다: ${err instanceof Error ? err.message : String(err)}`);
    return '없음';
  }
}

/** 한 화면의 재현 단계 · 실패한 확인 · 원인 · 기록 */
async function 화면재료로(pool: Pool, d: FailureDevice): Promise<화면재료> {
  const 확인 = d.item.steps.flatMap((s) => s.assertions).find((a) => a.status === 'FAIL') ?? null;
  return {
    steps: d.item.steps.map((s) => ({ title: s.title, status: s.status })),
    확인: 확인 === null ? null : { statement: 확인.statement, expected: 확인.expected, actual: 확인.actual },
    원인: d.item.failure?.reason ?? null,
    ...(await 기록읽기(pool, d.item.historyId)),
  };
}

// 카드는 깨진 화면만 든다. 이번 실행 지금 결과에서 통과한 화면을 따로 읽는다(한 건 실행이 덮은 결과 포함)
const 통과화면SQL = `SELECT DISTINCT i.platform FROM ${지금항목('o.run_id = $1 AND o.tc_id = $2')} i WHERE i.status = 'PASS'`;

/**
 * 첫 화면(화면 차례) 것을 바탕으로 쓴다 — 한 테스트 · 한 대상 서버에 이슈는 하나다(2026-11-04 사용자 「웹이랑 모바일 둘 다 발생한 버그는 1개로」).
 * 웹은 깨진 화면 · 통과한 화면을 적고, 둘째 화면이 다른 곳에서 깨졌으면 그 화면 것도 싣는다. Android 앱 · 게임 · API 는 화면 줄이 없다.
 * 마감이 null 이면 폰 로그를 안 읽는다 — 「또 실패」 댓글은 폰 로그를 안 실어 기다릴 까닭이 없다
 */
async function 재료만들기(pool: Pool, 실행: 실행행, 카드실행: number, c: FailureCase, 마감: number | null) {
  const d = c.devices[0]!;
  const 깨짐 = c.devices.flatMap((x) => (x.platform === 'android' ? [] : [x.platform]));
  // API 애플리케이션 케이스도 디바이스가 desktop 이지만 브라우저를 열지 않아 화면이 없다(도메인/API 「디바이스는 desktop 하나다」)
  const 웹 = 실행.kind === 'SCREEN' && 깨짐.length > 0;
  const 둘 = 웹 ? c.devices[1] : undefined;
  const 첫재료 = await 화면재료로(pool, d);
  const 둘재료 = 둘 === undefined ? null : await 화면재료로(pool, 둘);
  const 통과 = 웹
    ? (await pool.query<{ platform: BrowserPlatform }>(통과화면SQL, [카드실행, c.tcId])).rows
        .map((r) => r.platform)
        .filter((p) => !깨짐.includes(p))
        .sort((x, y) => 디바이스순서.indexOf(x) - 디바이스순서.indexOf(y))
    : [];
  const 공개주소 = (process.env.PLATFORM_PUBLIC_URL ?? '').replace(/\/+$/, '');
  const 날재료: 실패재료 = {
    애플리케이션: 실행.service_name,
    tcId: c.tcId,
    tcName: c.tcName,
    env: 실행.env,
    build: 실행.build_no,
    device: d.device,
    reqs: c.reqs,
    ...첫재료,
    // 웹 항목(실제 폰 Chrome 포함)은 지금 그대로 네트워크 · 콘솔이다
    폰로그: d.platform === 'android' && 마감 !== null ? await 폰로그읽기(d.item.runId, d.item.historyId, 마감) : null,
    // 화면은 hash 주소다. 항목 상세는 실행 번호가 맞아야 찾아(execution/queries.ts findItem) 한 건 실행이 덮은 항목은 그 한 건 실행 번호로 간다
    결과주소: 공개주소 === '' ? null : `${공개주소}/#/runs/${String(d.item.runId)}/items/${String(d.item.historyId)}`,
    // 최근 흐름 맨 앞은 이번 실행이다 — 섞임은 앞 실행들로만 본다(이번 FAIL 을 넣으면 새로 깨진 회귀가 다 흔들림이 된다)
    꼬리표: 꼬리표고르기(d.item.failure?.type ?? null, d.recent.slice(1)),
    화면: null,
    둘째: 둘재료 !== null && !같은곳에서깨짐(첫재료, 둘재료) ? 둘재료 : null,
  };
  // 항목 상세는 이미 가렸지만 단계 제목 · 요구 문장 · 기록까지 밖으로 나가는 재료 전부를 한 번 더 가린다 — 되비친 비밀값(리포팅 「되비친 비밀값」).
  // 본문을 만들기 전에 가린다 — 만든 뒤 가리면 별표가 글을 늘려 크기 상한을 넘을 수 있다.
  // 비밀 글자는 run_item 원본에서 읽는다 — 항목 상세의 값은 이미 별표라 거기서 고르면 빈 목록이 되고, 원문인 logcat 이 그대로 나간다. 둘째 화면 항목 것도 같이 읽는다
  const 번호들 = [d, 둘].flatMap((x) => (x === undefined ? [] : [x.item.historyId]));
  const 원본들 = (
    await pool.query<{ params: unknown; expected: unknown; param_schema: unknown; expected_schema: unknown }>(
      'SELECT params, expected, param_schema, expected_schema FROM run_item WHERE history_id = ANY($1)',
      [번호들],
    )
  ).rows;
  if (원본들.length !== 번호들.length) throw new Error(`실패 등록 중 항목 ${번호들.join(' · ')} 가운데 사라진 것이 있다`);
  // 화면 이름은 가린 뒤에 붙인다 — 짧은 비밀값이 desktop · mobile 안에 들면 이름이 별표로 깨져 본문을 못 만든다
  const 재료: 실패재료 = {
    ...(가린다(날재료, 긴것부터(원본들.flatMap((r) => 항목비밀(r)))) as 실패재료),
    화면: 웹 ? { 깨짐, 통과 } : null,
  };
  // 산출물 폴더 기준 경로. 보낼 때 outbox 가 파일을 읽어 올린다. 러너가 만든 모양이 아니면 싣지 않는다 — 파일시스템을 읽는 자리다.
  // 화면마다 첫 장을 먼저 고르고 남는 자리를 차례로 채운다 — 한 화면 사진이 상한을 다 쓰면 다른 화면 사진이 빠진다
  const 캡처 = [d, 둘]
    .flatMap((x) =>
      x === undefined
        ? []
        : x.item.steps
            .flatMap((s) => (s.status === 'FAIL' && s.screenshotPath !== undefined ? [s.screenshotPath] : []))
            .filter((p) => p.startsWith(`${저장접두}runs/`) && !p.includes('..'))
            .map((p, 차례) => ({ p, 차례 })),
    )
    .sort((x, y) => x.차례 - y.차례)
    .slice(0, 첨부상한)
    .map(({ p }) => p.slice(저장접두.length));
  return { 재료, 캡처 };
}

/**
 * 넣은 줄 수. BTS 를 안 이은 프로젝트 · 시나리오면 0.
 * 한 건 실행은 붙는 실행(부모)의 카드로 그 한 건만 올린다 — 카드가 부모 자리에 서고, 부모에서 통과했던 케이스가 새로 깨질 수 있다
 */
// ponytail: 화면용 실패카드()를 그대로 써 팜 증적 · 판정 같은 BTS 에 안 쓰는 칸도 읽는다. 실행 끝 뒤에 따로 도는 일이라 두었다 — 실패가 수백 건이라 느리면 가벼운 질의로 뗀다
export async function 실패등록(runId: number, 기다림상한ms = trace기다림상한ms): Promise<number> {
  const pool = await db();
  const 실행 = (await pool.query<실행행>(실행SQL, [runId])).rows[0];
  if (실행 === undefined) return 0;
  // trace 풀기 · 팜 증적 받기를 기다리는 마감은 하나다 — 실행 끝에서 길어야 상한만큼 늦는다
  const 마감 = Date.now() + 기다림상한ms;
  // trace 는 실행과 따로 한 줄로 푼다. 실행이 막 끝나면 마지막 항목들이 아직 줄에 있어 이슈에 네트워크 · 콘솔이 빠진다 — 지금 줄 끝까지 기다린다.
  // ponytail: 줄 끝이라 다른 실행 · 재기동 때 밀린 풀기도 같이 기다린다. 상한을 넘기는 일이 잦으면 이 실행의 항목만 기다린다
  const 늦음 = await Promise.race([trace줄끝().then(() => false), 잠깐(기다림상한ms, true, { ref: false })]);
  if (늦음) console.warn(`[bts] 실행 ${String(runId)} — trace 풀기가 ${String(기다림상한ms / 1000)}초 안에 안 끝나 기다리지 않고 올린다`);
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
      const 댓글 = 짝 !== undefined && 짝.open;
      const { 재료, 캡처 } = await 재료만들기(pool, 실행, 카드실행, c, 댓글 ? null : 마감);
      // 줄은 카드가 서는 실행에 단다 — 실패 카드가 그 실행 번호로 bts 칸을 읽는다
      const 공통 = { projectId: Number(실행.project_id), serviceId: 서비스, runId: 카드실행, tcId: c.tcId, env: 실행.env };
      const id =
        댓글
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
