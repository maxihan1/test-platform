// 배포 신호 뒤에서 도는 일 — 애플리케이션마다 빌드 실행 · 스모크 판정 · 「QA 요청」 이슈 맡기 · 보류 댓글 · 늦은 이슈 · 버그 재검증 (도메인/BTS §3.12 「새 기능 바퀴」)

import type { FastifyInstance } from 'fastify';
import type { Pool, PoolClient } from 'pg';

import { 빌드실행을건다 } from '../execution/buildRun.js';
import { 오래된빌드치우기 } from '../execution/buildFile.js';

import { BTS부르기, type 부르기함수 } from './client.js';
import { 보낼줄넣기 } from './outbox.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

/** 배포 하나가 애플리케이션 하나에 거는 일 — 웹 · API 는 배포 빌드 번호로 빌드 줄을 세우고, 앱 · 게임은 그 줄의 최신 빌드를 쓴다 */
export interface 배포할앱 {
  serviceId: number;
  prefix: string;
  env: string;
  /** 앱 · 게임의 최신 빌드. 웹 · API 는 null — 배포 빌드 번호로 빌드 줄을 새로 세운다 */
  buildId: number | null;
  buildNo: string;
}

export interface 배포사람 {
  username: string;
  displayName: string;
}

/**
 * 애플리케이션마다 빌드 실행(스모크 → 회귀)을 걸고, 건 실행 번호를 한 번에 적은 뒤 판정한다.
 * 한 번에 적어야 앞 애플리케이션의 스모크가 끝났을 때 뒤 애플리케이션이 빠진 채로 판정하지 않는다. 실행이 먼저 끝났으면 마지막 판정이 잡는다
 */
export async function 배포실행걸기(deployId: number, 앱들: 배포할앱[], 사람: 배포사람, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const pool = await db();
  const runIds: number[] = [];
  try {
    for (const 앱 of 앱들) {
      let buildId = 앱.buildId;
      if (buildId === null) {
        // CI 토큰이 같은 번호를 먼저 올렸으면 그 줄을 쓴다 — 같은 번호를 409 로 막지 않는다(§7 배포 신호 200)
        const r = await pool.query<{ id: string }>(
          `INSERT INTO app_build (service_id, env, build_no, uploaded_by) VALUES ($1, $2, $3, $4)
           ON CONFLICT (service_id, env, build_no) DO UPDATE SET build_no = EXCLUDED.build_no RETURNING id`,
          [앱.serviceId, 앱.env, 앱.buildNo, 사람.username],
        );
        buildId = Number(r.rows[0]!.id);
      }
      runIds.push(...(await 빌드실행을건다({ id: buildId, serviceId: 앱.serviceId, prefix: 앱.prefix, env: 앱.env, buildNo: 앱.buildNo, ...사람 })));
      await 오래된빌드치우기(앱.serviceId, 앱.env).catch((err: unknown) => console.error(`[bts] ${앱.prefix} ${앱.env} 의 오래된 빌드를 못 치웠다: ${글(err)}`));
    }
  } catch (err) {
    // 스모크를 다 못 세웠으면 「다 통과」를 따질 수 없다 — 이슈는 그대로 「QA 요청」에 남아 다음 배포가 다시 잡는다
    await pool.query("UPDATE bts_deploy SET state = 'FAILED', run_ids = $2 WHERE id = $1", [deployId, runIds]);
    throw new Error(`배포 ${String(deployId)} 의 실행을 다 걸지 못했다: ${글(err)}`);
  }
  await pool.query('UPDATE bts_deploy SET run_ids = $2 WHERE id = $1', [deployId, runIds]);
  await 배포판정(deployId, 부르기);
}

// mcp/tools.ts aql글 과 같은 따옴표 — 그 파일은 MCP 서버 쪽 모듈을 끌고 와 여기서 부르지 않는다
const aql글 = (값: string): string => `"${값.replace(/[\\"]/g, (c) => `\\${c}`)}"`;

const 글 = (err: unknown): string => (err instanceof Error ? err.message : String(err));

interface 연결행 {
  project_id: string;
  base_url: string;
  bot_key: string;
  bts_project: string;
  status_map: Record<string, string>;
}

async function 연결읽기(projectId: number): Promise<연결행 | undefined> {
  return (await (await db()).query<연결행>('SELECT project_id, base_url, bot_key, bts_project, status_map FROM bts_link WHERE project_id = $1', [projectId])).rows[0];
}

// BTS 검색은 한 쪽에 100줄까지다. 규칙 상한(200)과 같게 두 쪽까지 본다
const 쪽크기 = 100;
const 최대쪽 = 2;

/** 「QA 요청」 이슈 목록. 다 = 끝까지 읽었나(200 을 넘으면 거짓) — 거짓이면 목록 밖 맡음을 놓지 않는다 */
export async function QA요청이슈(연결: 연결행, 부르기: 부르기함수 = BTS부르기): Promise<{ 이슈: { key: string; bug: boolean }[]; 다: boolean }> {
  const 상태 = 연결.status_map.QA_REQUEST ?? '';
  if (상태 === '') throw new Error('「QA 요청」 상태를 짝짓지 않았다');
  const 이슈: { key: string; bug: boolean }[] = [];
  for (let page = 0; page < 최대쪽; page++) {
    const r = await 부르기({ baseUrl: 연결.base_url, botKey: 연결.bot_key }, 'POST', '/api/v1/search/aql', {
      projectKey: 연결.bts_project,
      query: `status = ${aql글(상태)}`,
      page,
      size: 쪽크기,
    });
    const 줄 = (r.json as { data?: unknown } | null)?.data;
    if (r.status !== 200 || !Array.isArray(줄)) throw new Error(`BTS 에서 「QA 요청」 이슈를 못 찾았다 (${String(r.status)})`);
    for (const d of 줄 as { key?: unknown; typeKey?: unknown }[]) {
      if (typeof d.key === 'string' && d.key.startsWith(`${연결.bts_project}-`)) 이슈.push({ key: d.key, bug: d.typeKey === 'bug' });
    }
    if (줄.length < 쪽크기) return { 이슈, 다: true };
  }
  return { 이슈, 다: false };
}

/**
 * 「QA 요청」이면서 맡는 중인 줄이 없는 이슈를 이 배포로 맡는다(BTS.md 결정 4). 버그는 딸린 테스트가 없으면 댓글만 단다.
 * 맡는 중인데 「QA 요청」을 떠난 이슈는 놓는다 — 알림을 놓쳤어도(QA Hub 가 꺼져 있었다) 다음 배포가 다시 맡게. 새로 맡은 키를 돌려준다
 */
export async function 맡기(deployId: number, late: boolean, 부르기: 부르기함수 = BTS부르기): Promise<string[]> {
  const pool = await db();
  const 배포 = (await pool.query<{ project_id: string }>('SELECT project_id FROM bts_deploy WHERE id = $1', [deployId])).rows[0];
  if (배포 === undefined) return [];
  const 연결 = await 연결읽기(Number(배포.project_id));
  if (연결 === undefined) return [];
  const { 이슈, 다 } = await QA요청이슈(연결, 부르기);
  if (다) {
    await pool.query('UPDATE bts_claim SET released_at = now() WHERE project_id = $1 AND released_at IS NULL AND NOT (issue_key = ANY($2))', [
      배포.project_id,
      이슈.map((i) => i.key),
    ]);
  }
  const 맡음: string[] = [];
  for (const 하나 of 이슈) {
    const r = await pool.query(
      `INSERT INTO bts_claim (project_id, issue_key, deploy_id, issue_type, late) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, issue_key) WHERE released_at IS NULL DO NOTHING`,
      [배포.project_id, 하나.key, deployId, 하나.bug ? 'BUG' : 'TASK', late],
    );
    if (r.rowCount !== 1) continue;
    맡음.push(하나.key);
    if (!하나.bug) continue;
    // 사람이 BTS 에 직접 올린 버그는 QA Hub 테스트가 없다 — 「QA 요청」에 두고 사람에게 알린다(2차 R8). 맡음이 남아 다음 배포가 또 달지 않는다
    const 딸린 = await pool.query('SELECT 1 FROM bts_issue_case WHERE project_id = $1 AND issue_key = $2 AND closed_at IS NULL LIMIT 1', [배포.project_id, 하나.key]);
    if ((딸린.rowCount ?? 0) === 0) {
      await 보낼줄넣기({ projectId: Number(배포.project_id), kind: 'COMMENT', issueKey: 하나.key, payload: { body: '딸린 테스트 없음 — 사람이 확인해 주세요\nQA Hub 에 이 버그를 확인하는 테스트가 없습니다' } });
    }
  }
  return 맡음;
}

/** 스모크가 깨진 배포 — 「QA 요청」 이슈마다 보류 댓글. 이슈는 「QA 요청」에 남아 다음 배포가 다시 잡는다(결정 5) */
async function 보류댓글(projectId: number, buildNo: string, 깨진앱: string[], 부르기: 부르기함수): Promise<void> {
  const 연결 = await 연결읽기(projectId);
  if (연결 === undefined) return;
  const { 이슈 } = await QA요청이슈(연결, 부르기);
  const body = `스모크 실패 — 보류 · 빌드 ${buildNo}\n스모크가 깨진 애플리케이션: ${깨진앱.join(', ')}\n이슈는 「QA 요청」에 그대로 두고 다음 배포에서 다시 확인합니다`;
  for (const { key } of 이슈) await 보낼줄넣기({ projectId, kind: 'COMMENT', issueKey: key, payload: { body } });
}

/**
 * 이 배포의 스모크가 다 끝났으면 판정한다 — 다 통과면 맡고, 하나라도 깨지면 보류 댓글.
 * 상태를 먼저 SMOKE 에서 옮긴 쪽만 일한다 — 스모크 둘이 같이 끝나 두 번 맡지 않게. 새 배포가 와 있으면 말없이 보류로 닫는다(새 배포가 맡는다)
 */
export async function 배포판정(deployId: number, 부르기: 부르기함수 = BTS부르기): Promise<void> {
  const pool = await db();
  const 배포 = (await pool.query<{ project_id: string; build_no: string; run_ids: string[]; state: string; 새배포: boolean }>(
    `SELECT d.project_id, d.build_no, d.run_ids, d.state,
            EXISTS (SELECT 1 FROM bts_deploy n WHERE n.project_id = d.project_id AND n.id > d.id) AS "새배포"
       FROM bts_deploy d WHERE d.id = $1`,
    [deployId],
  )).rows[0];
  if (배포?.state !== 'SMOKE') return;
  const 스모크 = (await pool.query<{ status: string; prefix: string; 안통과: boolean }>(
    `SELECT t.status, s.prefix, EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = t.run_id AND i.status <> 'PASS') AS "안통과"
       FROM test_run t JOIN service s ON s.id = t.service_id
      WHERE t.run_id = ANY($1::bigint[]) AND t.build_stage = 'SMOKE'`,
    [배포.run_ids],
  )).rows;
  if (스모크.some((s) => s.status === 'RUNNING')) return;
  const 깨진앱 = [...new Set(스모크.filter((s) => s.status !== 'FINISHED' || s.안통과).map((s) => s.prefix))];
  const 다음 = 배포.새배포 || 깨진앱.length > 0 ? 'HELD' : 'CLAIMED';
  const 옮김 = await pool.query("UPDATE bts_deploy SET state = $2 WHERE id = $1 AND state = 'SMOKE'", [deployId, 다음]);
  if (옮김.rowCount !== 1 || 배포.새배포) return;
  const projectId = Number(배포.project_id);
  try {
    if (다음 === 'HELD') await 보류댓글(projectId, 배포.build_no, 깨진앱, 부르기);
    else await 맡기(deployId, false, 부르기);
  } catch (err) {
    // BTS 에 못 닿으면 이 배포는 맡음 없이 끝난다. 이슈가 「QA 요청」에 남아 다음 배포가 다시 잡는다
    if (다음 === 'CLAIMED') await pool.query("UPDATE bts_deploy SET state = 'FAILED' WHERE id = $1", [deployId]);
    throw new Error(`배포 ${String(deployId)} 의 ${다음 === 'HELD' ? '보류 댓글' : '맡기'}가 깨졌다: ${글(err)}`);
  }
}

/**
 * 맡은 버그의 딸린 케이스가 이번 실행에서 다 통과했으면 「재검증 통과」 댓글과 함께 닫는다(새 기능 바퀴 5).
 * 따로 실행을 세우지 않는다 — 스모크 뒤 회귀가 활성 케이스 전부라 딸린 케이스도 돈다(같은 빌드를 두 번 돌리지 않게 · BTS-F5-01 시작 질문 5).
 * 맡은 배포 뒤에 선 실행 · 깨진 대상 서버와 같은 서버만 센다 — qa 에서 깨진 것은 qa 에서 다시 통과해야 고친 것이다
 */
export async function 버그재검증(runId: number): Promise<string[]> {
  const pool = await db();
  const 통과 = await pool.query<{ claim_id: string; project_id: string; issue_key: string; build_no: string; closed: string | null }>(
    `SELECT c.id AS claim_id, c.project_id, c.issue_key, d.build_no, l.status_map->>'CLOSED' AS closed
       FROM test_run t
       JOIN service s ON s.id = t.service_id
       JOIN bts_link l ON l.project_id = s.project_id
       JOIN bts_claim c ON c.project_id = s.project_id AND c.released_at IS NULL AND c.issue_type = 'BUG'
       JOIN bts_deploy d ON d.id = c.deploy_id AND t.started_at >= d.created_at
      WHERE t.run_id = $1 AND t.status = 'FINISHED'
        AND EXISTS (SELECT 1 FROM bts_issue_case k WHERE k.project_id = c.project_id AND k.issue_key = c.issue_key AND k.closed_at IS NULL)
        AND NOT EXISTS (
          SELECT 1 FROM bts_issue_case k
           WHERE k.project_id = c.project_id AND k.issue_key = c.issue_key AND k.closed_at IS NULL
             AND (k.service_id <> t.service_id OR k.env <> t.env
                  OR NOT EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = t.run_id AND i.tc_id = k.tc_id)
                  OR EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = t.run_id AND i.tc_id = k.tc_id AND i.status <> 'PASS')))`,
    [runId],
  );
  const 닫음: string[] = [];
  for (const 줄 of 통과.rows) {
    if (줄.closed === null || 줄.closed === '') continue;
    const 손 = await pool.connect();
    try {
      await 손.query('BEGIN');
      if (await 닫기적기(손, 줄, runId)) 닫음.push(줄.issue_key);
      await 손.query('COMMIT');
    } catch (err) {
      await 손.query('ROLLBACK');
      throw new Error(`${줄.issue_key} 재검증 통과를 적지 못했다: ${글(err)}`);
    } finally {
      손.release();
    }
  }
  return 닫음;
}

/** 맡음을 놓은 쪽만 닫는다 — 실행 둘이 같이 끝나 댓글이 두 번 가지 않게. 닫힘은 BTS 해결 상태 짝이 없는 FIXED 다 */
async function 닫기적기(손: PoolClient, 줄: { claim_id: string; project_id: string; issue_key: string; build_no: string; closed: string | null }, runId: number): Promise<boolean> {
  const 놓음 = await 손.query('UPDATE bts_claim SET released_at = now() WHERE id = $1 AND released_at IS NULL', [줄.claim_id]);
  if (놓음.rowCount !== 1) return false;
  await 손.query("UPDATE bts_issue_case SET closed_at = now(), resolution = 'FIXED' WHERE project_id = $1 AND issue_key = $2 AND closed_at IS NULL", [
    줄.project_id,
    줄.issue_key,
  ]);
  await 손.query(
    `INSERT INTO bts_outbox (project_id, kind, issue_key, run_id, payload) VALUES ($1, 'TRANSITION', $2, $3, $4)`,
    [줄.project_id, 줄.issue_key, runId, JSON.stringify({ toStatusKey: 줄.closed, comment: `재검증 통과 — 빌드 ${줄.build_no}\nQA Hub 실행 ${String(runId)} 에서 딸린 테스트가 모두 통과했습니다` })],
  );
  return true;
}

/** 실행이 끝날 때마다 부른다(dispatcher) — 이 실행이 든 배포의 스모크 판정, 그리고 맡은 버그의 재검증 */
export async function 배포실행뒤(runId: number): Promise<void> {
  const 배포들 = await (await db()).query<{ id: string }>("SELECT id FROM bts_deploy WHERE $1 = ANY(run_ids) AND state = 'SMOKE'", [runId]);
  for (const { id } of 배포들.rows) await 배포판정(Number(id));
  await 버그재검증(runId);
}

// 늦은 이슈 — BTS 규칙이 늦게 끝나 맡기 묶음에 못 든 이슈. 배포 뒤 이만큼만 1분마다 다시 찾는다 — 끝없이 BTS 를 두드리지 않게(BTS-F5-01 시작 질문 4)
export const 늦은이슈기한분 = 10;

/** 기한 안의 맡은 배포(프로젝트마다 가장 새 것)마다 늦은 이슈를 맡는다 */
export async function 늦은이슈점검(부르기: 부르기함수 = BTS부르기): Promise<number> {
  const r = await (await db()).query<{ id: string }>(
    `SELECT d.id FROM bts_deploy d
      WHERE d.state = 'CLAIMED' AND d.created_at > now() - make_interval(mins => $1)
        AND NOT EXISTS (SELECT 1 FROM bts_deploy n WHERE n.project_id = d.project_id AND n.id > d.id)`,
    [늦은이슈기한분],
  );
  let 셈 = 0;
  for (const { id } of r.rows) {
    try {
      셈 += (await 맡기(Number(id), true, 부르기)).length;
    } catch (err) {
      console.error(`[bts] 배포 ${id} 의 늦은 이슈를 못 찾았다: ${글(err)}`);
    }
  }
  return 셈;
}

/** admin 이 뜰 때 건다(app.ts 기동 경로) — 보낼줄켜기 와 같은 틀 */
export function 늦은이슈켜기(app: FastifyInstance): void {
  let 도는중 = false;
  const 점검 = setInterval(() => {
    if (도는중) return;
    도는중 = true;
    void 늦은이슈점검()
      .then((셈) => {
        if (셈 > 0) app.log.info(`[bts] 늦은 이슈 ${String(셈)}건을 맡았다`);
      })
      .catch((err: unknown) => app.log.error(`[bts] 늦은 이슈 점검이 깨졌다: ${글(err)}`))
      .finally(() => {
        도는중 = false;
      });
  }, 60_000);
  app.addHook('onClose', async () => clearInterval(점검));
}
