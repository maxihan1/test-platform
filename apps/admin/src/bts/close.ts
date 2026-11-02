// BTS 에서 닫힌 이슈의 닫기 사유를 받아 QA Hub 가 할 일을 한다 — 화면이 맞음 · 테스트 문제는 작성 요청, 흔들림 · 환경 · 중복은 기록만 (도메인/BTS 「판정은 BTS 에서」)
// 같은 알림이 다시 와도 한 번만 한다 — 닫히지 않은 짝 줄을 닫는 UPDATE 가 돌려준 줄에만 일을 건다(알림 기억은 재기동 때 잊는다 — BTS-F3-02 시작 질문)

import type { Pool, PoolClient } from 'pg';

import { 열린작성 } from '../authoring/openRoots.js';
import { 줄세우기 } from '../authoring/store.js';
import { 화면이맞음채우기 } from '../prd/screenRight.js';
import { 잠그고 } from '../prd/store.js';
import { BTS부르기, type BTS이슈, type BTS자리, type 부르기함수 } from './client.js';
import { BTS이은프로젝트, type 상태짝, type 해결짝 } from './link.js';
import { 보낼줄넣기 } from './outbox.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export type 닫기사유 = keyof 해결짝;

/** BTS 해결 상태 이름을 단계로 — 회사마다 이름이 달라 짝(resolution_map)으로 찾는다. 짝이 빈 단계는 고르지 않는다 */
export function 사유찾기(짝: Partial<해결짝>, 이름: string | null): 닫기사유 | null {
  if (이름 === null) return null;
  const 찾은 = (Object.entries(짝) as [닫기사유, string][]).find(([, v]) => v !== '' && v.trim().toLowerCase() === 이름.trim().toLowerCase());
  return 찾은?.[0] ?? null;
}

/** 작성 요청에 남길 BTS 쪽 이름 — 이 요청을 사람 대신 BTS 의 판정이 세웠다 */
const BTS요청자 = (issueKey: string) => ({ 누가: 'bts', 이름: `Issue Bunker ${issueKey}` });

// 자식이 읽을 이슈 글 상한 — 프롬프트가 아니라 자료 파일로 가지만 params 에 실리므로 크게 두지 않는다
const 글상한 = 8000;

/**
 * 테스트 문제로 닫힌 이슈의 글 · 댓글 — 자식이 무엇이 테스트 문제였는지 읽는다.
 * BTS 가 바쁘거나 닿지 않으면(5xx · 408 · 429 · 끊김) 던진다 — 알림을 다시 받게. 권한 · 없음 같은 4xx 는 다시 받아도 같아 글 없이 간다(자식은 케이스를 다시 돌려 본다)
 */
export async function 이슈글읽기(자리: BTS자리, issueKey: string, 부르기: 부르기함수 = BTS부르기): Promise<string> {
  const 키 = encodeURIComponent(issueKey);
  const [이슈, 댓글] = await Promise.all([부르기(자리, 'GET', `/api/v1/issues/${키}`), 부르기(자리, 'GET', `/api/v1/issues/${키}/comments`)]);
  const 다시받을 = (s: number) => s >= 500 || s === 408 || s === 429;
  if (다시받을(이슈.status) || 다시받을(댓글.status)) throw new Error(`Issue Bunker 이슈 ${issueKey} 글을 못 읽었다 (${String(이슈.status)} · ${String(댓글.status)})`);
  if (이슈.status !== 200 || 댓글.status !== 200) return `# ${issueKey}\n\n(Issue Bunker 에서 이슈 글을 못 읽었다 — ${String(이슈.status)} · ${String(댓글.status)}. Issue Bunker ${issueKey} 에서 보세요)`;
  const 본문 = (이슈.json as { data?: { summary?: string; description?: string | null } } | null)?.data;
  const 댓글들 = ((댓글.json as { data?: { body?: string }[] } | null)?.data ?? []).flatMap((c) => (typeof c.body === 'string' ? [c.body] : []));
  const 글 = [`# ${issueKey} ${본문?.summary ?? ''}`, '', 본문?.description ?? '', ...댓글들.flatMap((b, i) => ['', `## 댓글 ${String(i + 1)}`, b])].join('\n');
  return 글.length > 글상한 ? `${글.slice(0, 글상한)}\n…(이하 생략 — Issue Bunker ${issueKey} 에서 보세요)` : 글;
}

interface 닫은줄 {
  tc_id: string;
  env: string;
  first_run: string | null;
}

/** 그 애플리케이션의 닫히지 않은 짝 줄을 닫는다 — 이미 닫혔으면 빈 목록이라 다시 오는 알림에 일을 두 번 걸지 않는다 */
async function 짝닫기(손: Pick<PoolClient, 'query'>, projectId: number, issueKey: string, 서비스: number, 사유: 닫기사유): Promise<닫은줄[]> {
  return (
    await 손.query<닫은줄>(
      `UPDATE bts_issue_case SET closed_at = now(), resolution = $4
        WHERE project_id = $1 AND issue_key = $2 AND service_id = $3 AND closed_at IS NULL
        RETURNING tc_id, env, first_run`,
      [projectId, issueKey, 서비스, 사유],
    )
  ).rows;
}

/**
 * 그 케이스가 실제로 실패한 실행 — 처음 올린 실행이 실패를 담았으면 그것, 아니면 거기 붙은 한 건 실행 가운데 실패한 가장 늦은 것.
 * 한 건 실행으로 올린 이슈는 짝 줄이 부모 실행을 가리키고 부모에서는 통과했을 수 있다(failReport.ts 「카드가 부모 자리에 선다」)
 */
async function 실패한실행(손: Pick<PoolClient, 'query'>, 첫실행: number, tcId: string): Promise<number | null> {
  const r = await 손.query<{ run_id: string }>(
    `SELECT r.run_id FROM test_run r
      WHERE (r.run_id = $1 OR (r.rerun_of = $1 AND r.origin = 'SINGLE'))
        AND EXISTS (SELECT 1 FROM run_item i WHERE i.run_id = r.run_id AND i.tc_id = $2 AND i.status = 'FAIL')
      ORDER BY r.run_id = $1 DESC, r.run_id DESC LIMIT 1`,
    [첫실행, tcId],
  );
  return r.rows[0] === undefined ? null : Number(r.rows[0].run_id);
}

/** 뒤 요청은 그때 열린 작성 전부를 기다린다 — 결정 진행이 세우는 요청과 같은 차례(authoring/decisionRun.ts) */
async function 반영요청세우기(손: PoolClient, 서비스: number, issueKey: string, 값: Record<string, unknown>): Promise<number> {
  const 열린 = await 열린작성(서비스, 손);
  return 줄세우기({ 서비스, kind: 'AUTHOR', 기획서: null, 값: { prdApply: true, ...값, decision: { after: 열린, count: 1 } }, ...BTS요청자(issueKey) }, 손);
}

/** 세운 작성 요청 번호들과, 닫기만 하고 요청을 못 세운 케이스(까닭) — 받는 쪽이 로그에 남긴다 */
export interface 닫기결과 {
  요청들: number[];
  기록만: string[];
}

export interface 닫기연결 {
  projectId: number;
  baseUrl: string;
  botKey: string;
}

/**
 * 다시 읽은 이슈가 닫기 사유를 달았으면 그 사유대로 한다. 세운 작성 요청 번호들을 돌려준다.
 * 화면이 맞음 — 지금 「화면이 맞음」 다시 작성(사람이 판정했으므로 고친 요구는 확정 · byPerson). 첫 실패 실행이 지워졌거나 덮는 요구가 없으면 그 케이스는 기록만.
 * 테스트 문제 — 테스트만 다시 쓰는 작성(PRD 그대로). 이슈 글 · 댓글을 닫힐 때 한 번 읽어 요청에 담는다. PR 이 서면 이슈에 댓글(테스트고침댓글).
 * 흔들림 · 환경 문제 · 중복 — 기록만. 흔들림은 그 케이스를 고친 작성이 병합될 때까지 다음 실패를 올리지 않는다(failReport.ts)
 */
export async function 닫기처리(연결: 닫기연결, 이슈: BTS이슈, 부르기: 부르기함수 = BTS부르기): Promise<닫기결과> {
  const 없음: 닫기결과 = { 요청들: [], 기록만: [] };
  const pool = await db();
  const 짝 = (await pool.query<{ resolution_map: 해결짝; status_map: Partial<상태짝> }>('SELECT resolution_map, status_map FROM bts_link WHERE project_id = $1', [연결.projectId])).rows[0];
  if (짝 === undefined) return 없음;
  // 닫힘 단계를 짝지었으면 그 상태일 때만 — 해결 상태가 남은 채 다시 열린 이슈를 닫힌 것으로 치지 않는다. 상태 짝 값은 BTS 상태 키다(outbox.ts 「QA 검토」와 같다)
  const 닫힘 = 짝.status_map.CLOSED ?? '';
  if (닫힘 !== '' && 이슈.state !== 닫힘) return 없음;
  const 사유 = 사유찾기(짝.resolution_map, 이슈.resolution);
  if (사유 === null) return 없음;
  const 서비스들 = (
    await pool.query<{ service_id: string }>(
      'SELECT DISTINCT service_id FROM bts_issue_case WHERE project_id = $1 AND issue_key = $2 AND closed_at IS NULL ORDER BY service_id',
      [연결.projectId, 이슈.key],
    )
  ).rows.map((r) => Number(r.service_id));
  if (서비스들.length === 0) return 없음;
  if (사유 !== 'SCREEN_RIGHT' && 사유 !== 'TEST_PROBLEM') {
    for (const 서비스 of 서비스들) await 짝닫기(pool, 연결.projectId, 이슈.key, 서비스, 사유);
    return 없음;
  }
  // 글은 잠금 밖에서 읽는다 — BTS 를 기다리는 동안 그 애플리케이션의 기획서 잠금을 쥐지 않게
  const 글 = 사유 === 'TEST_PROBLEM' ? await 이슈글읽기({ baseUrl: 연결.baseUrl, botKey: 연결.botKey }, 이슈.key, 부르기) : '';
  const 결과: 닫기결과 = { 요청들: [], 기록만: [] };
  for (const 서비스 of 서비스들) {
    const 번호 = await 잠그고(서비스, async (손) => {
      const 닫은 = await 짝닫기(손, 연결.projectId, 이슈.key, 서비스, 사유);
      for (const x of 닫은) if (x.first_run === null) 결과.기록만.push(`${x.tc_id} — 처음 올린 실행이 지워졌다`);
      const 건들: { runId: number; tcId: string; env: string }[] = [];
      for (const x of 닫은) {
        if (x.first_run === null) continue;
        const runId = await 실패한실행(손, Number(x.first_run), x.tc_id);
        if (runId === null) 결과.기록만.push(`${x.tc_id} — 처음 올린 실행에 그 케이스의 실패가 없다`);
        else 건들.push({ runId, tcId: x.tc_id, env: x.env });
      }
      if (건들.length === 0) return null;
      if (사유 === 'TEST_PROBLEM') return 반영요청세우기(손, 서비스, 이슈.key, { testFix: { issueKey: 이슈.key, cases: 건들, note: 글 } });
      const at = new Date().toISOString();
      const 칸들 = [];
      for (const x of 건들) {
        const 칸 = await 화면이맞음채우기(서비스, x.runId, x.tcId);
        if ('error' in 칸) 결과.기록만.push(`${x.tcId} — ${칸.error}`);
        else 칸들.push({ ...칸, byName: BTS요청자(이슈.key).이름, at });
      }
      return 칸들.length === 0 ? null : 반영요청세우기(손, 서비스, 이슈.key, { screenRight: 칸들 });
    });
    if (번호 !== null) 결과.요청들.push(번호);
  }
  return 결과;
}

/** 테스트 문제로 세운 작성이 초안 PR 을 열면 이슈에 「테스트 고침 PR #N」 댓글 — 보낼 줄로 보낸다. 테스트 고침 요청이 아니면 아무것도 안 한다 */
export async function 테스트고침댓글(요청: { serviceId: number; params: unknown }, prUrl: string): Promise<boolean> {
  const 고침 = (요청.params as { testFix?: { issueKey?: unknown } } | null)?.testFix;
  if (typeof 고침?.issueKey !== 'string') return false;
  const 프로젝트 = await BTS이은프로젝트(요청.serviceId);
  // 그사이 연결을 끊었으면 보내지 않는다 — 그 프로젝트는 다시 QA Hub 안에서 돈다
  if (프로젝트 === null) return false;
  // 재실행 · 이어서 작성이 같은 PR 로 끝나도 댓글은 한 번
  const 보냈나 = await (await db()).query(
    `SELECT 1 FROM bts_outbox WHERE project_id = $1 AND kind = 'COMMENT' AND issue_key = $2 AND strpos(payload->>'body', $3) > 0`,
    [프로젝트, 고침.issueKey, prUrl],
  );
  if ((보냈나.rowCount ?? 0) > 0) return false;
  const 번호 = /\/pull\/(\d+)/.exec(prUrl)?.[1];
  await 보낼줄넣기({
    projectId: 프로젝트,
    kind: 'COMMENT',
    issueKey: 고침.issueKey,
    payload: { body: `테스트 고침 PR ${번호 === undefined ? '' : `#${번호} `}— ${prUrl}\nTest Commander 가 테스트만 고친 초안 PR 을 열었습니다. 병합은 사람이 합니다` },
  });
  return true;
}
