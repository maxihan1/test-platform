// 수정 AI(BUGFIX) — 「개발 요청」 이슈를 맡아 작성 에이전트 줄에 세우고, 끝나면 BTS 「코드 리뷰」 · 담당자 · 댓글을 보낼 줄에 넣는다 (도메인/BTS 「수정 AI」)

import type { Pool } from 'pg';

import { 본문상한 } from './failBody.js';
import { 이슈글읽기 } from './close.js';
import { BTS부르기, 이슈읽기, type BTS자리, type 부르기함수 } from './client.js';
import { 내번호, 넘길사람찾기 } from './bugfixOwner.js';
import { 보낼줄넣기 } from './outbox.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 연결줄 {
  base_url: string;
  bot_key: string;
  bts_project: string;
  status_map: Record<string, string>;
  updated_by: string;
  display_name: string | null;
}

export async function 연결읽기(projectId: number): Promise<연결줄 | null> {
  const r = await (await db()).query<연결줄>(
    `SELECT l.base_url, l.bot_key, l.bts_project, l.status_map, l.updated_by, u.display_name
       FROM bts_link l LEFT JOIN app_user u ON u.username = l.updated_by WHERE l.project_id = $1`,
    [projectId],
  );
  return r.rows[0] ?? null;
}

export const 자리로 = (l: 연결줄): BTS자리 => ({ baseUrl: l.base_url, botKey: l.bot_key });

/** BTS 로 나가는 글은 본문 상한(바이트) 안으로 자른다 — 넘으면 BTS 가 400 으로 거절해 보낼 줄이 그만둔다. 자르는 꼴은 failBody.ts 이슈본문과 같다 */
export function 글자르기(글: string): string {
  if (Buffer.byteLength(글) <= 본문상한) return 글;
  return Buffer.from(글, 'utf8').subarray(0, 본문상한 - 3).toString('utf8').replace(/\uFFFD$/, '') + '…';
}

/** 넘기며 단 댓글과 담당자 — 담당자를 못 찾았으면 댓글로 사람을 부른다 */
export async function 넘기기(projectId: number, issueKey: string, 댓글: string, 사람: string | null): Promise<void> {
  const 몸 = 사람 === null ? `${댓글}\n\n넘길 사람을 찾지 못했어요 — 담당자를 정해 주세요` : 댓글;
  await 보낼줄넣기({ projectId, kind: 'COMMENT', issueKey, payload: { body: 글자르기(몸) } });
  if (사람 !== null) await 보낼줄넣기({ projectId, kind: 'ASSIGN', issueKey, payload: { assigneeId: 사람 } });
}

interface 앞수정 {
  status: string;
  pr_url: string | null;
  owner: string | null;
  handed_back: boolean;
}

/**
 * 고칠 애플리케이션 — QA Hub 가 올린 이슈면 그 테스트의 애플리케이션. 사람이 올린 버그는 프로젝트에 하나면 그것,
 * 여럿이면 BTS 구성 요소 이름과 같은 애플리케이션(BTS-F6-01 시작 질문 2)
 */
async function 애플리케이션고르기(l: 연결줄, projectId: number, issueKey: string, componentIds: string[], 부르기: 부르기함수): Promise<number | null> {
  const pool = await db();
  const 짝 = await pool.query<{ service_id: string }>('SELECT service_id FROM bts_issue_case WHERE project_id = $1 AND issue_key = $2 ORDER BY created_at DESC LIMIT 1', [projectId, issueKey]);
  if (짝.rows[0] !== undefined) return Number(짝.rows[0].service_id);
  const 앱들 = (await pool.query<{ id: string; name: string }>('SELECT id, name FROM service WHERE project_id = $1 AND is_active', [projectId])).rows;
  if (앱들.length === 1) return Number(앱들[0]!.id);
  if (componentIds.length === 0 || 앱들.length === 0) return null;
  const r = await 부르기(자리로(l), 'GET', `/api/v1/projects/${encodeURIComponent(l.bts_project)}/components`);
  // BTS 가 잠깐 바쁘면 던진다 — 「어느 애플리케이션인지 몰라」로 손을 놓지 않고 규칙 문이 503 을 낸다
  if (r.status >= 500 || r.status === 408 || r.status === 429) throw new Error(`BTS 구성 요소 목록을 못 읽었다 (${String(r.status)})`);
  if (r.status !== 200) return null;
  const 이름들 = ((r.json as { data?: { id?: unknown; name?: unknown }[] } | null)?.data ?? [])
    .filter((c) => typeof c.id === 'string' && componentIds.includes(c.id) && typeof c.name === 'string')
    .map((c) => (c.name as string).trim().toLowerCase());
  const 맞은 = 앱들.find((s) => 이름들.includes(s.name.trim().toLowerCase()));
  return 맞은 === undefined ? null : Number(맞은.id);
}

export type 맡은결과 = 'TAKEN' | 'NOT_MINE' | 'RUNNING' | 'HANDED_BACK' | 'NO_APP' | 'NOT_LINKED';

/**
 * 담당자 변경 신호(규칙 웹훅 ASSIGNEE) — 이슈를 다시 읽어 「개발 요청」이고 담당자가 「QA Hub AI」 자신일 때만 맡는다(시작 질문 1).
 * 이미 수정 PR 을 올린 이슈는 다시 맡지 않고 넘겼던 사람에게 되돌린다(결정 11 · 시작 질문 6).
 * BTS 에 닿지 않으면 던진다 — 규칙 문이 503 을 내 BTS 자동화 기록에 실패로 남는다
 */
export async function 수정맡기(projectId: number, issueKey: string, 부르기: 부르기함수 = BTS부르기): Promise<맡은결과> {
  const l = await 연결읽기(projectId);
  if (l === null) return 'NOT_LINKED';
  const 자리 = 자리로(l);
  const 이슈 = await 이슈읽기(자리, issueKey, 부르기);
  const 개발요청 = l.status_map.DEV_REQUEST ?? '';
  if (개발요청 === '' || 이슈.state !== 개발요청 || 이슈.assigneeId === null || 이슈.assigneeId !== (await 내번호(자리, 부르기))) return 'NOT_MINE';
  const pool = await db();
  const 앞 = (
    await pool.query<앞수정>(
      `SELECT r.status, r.pr_url, r.result->'bugfix'->>'owner' AS owner, COALESCE((r.result->'bugfix'->>'handedBack')::boolean, false) AS handed_back FROM authoring_request r JOIN service s ON s.id = r.service_id
        WHERE r.kind = 'BUGFIX' AND r.params->>'issueKey' = $1 AND s.project_id = $2 AND r.discarded_at IS NULL ORDER BY r.id DESC`,
      [issueKey, projectId],
    )
  ).rows;
  if (앞.some((x) => x.status === 'PENDING' || x.status === 'RUNNING')) return 'RUNNING';
  // 재검증에서 또 실패해 사람에게 넘긴 이슈만 다시 안 맡는다(시작 질문 6) — PR 이 거절돼 사람이 다시 넘긴 이슈는 새로 맡는다
  const 올린 = 앞.find((x) => x.handed_back);
  if (올린 !== undefined) {
    const 사람 = 올린.owner ?? (await 넘길사람찾기(자리, l.bts_project, [], 이슈.componentIds, 부르기));
    await 넘기기(projectId, issueKey, `BTS 에이전트의 수정 PR 을 배포했는데 재검증에서 또 실패했던 이슈라 다시 맡지 않아요 — ${올린.pr_url ?? ''}\n같은 고침을 되풀이하지 않게 사람에게 넘겨요`, 사람);
    return 'HANDED_BACK';
  }
  const 앱 = await 애플리케이션고르기(l, projectId, issueKey, 이슈.componentIds, 부르기);
  if (앱 === null) {
    const 사람 = await 넘길사람찾기(자리, l.bts_project, [], 이슈.componentIds, 부르기);
    await 넘기기(projectId, issueKey, 'BTS 에이전트가 어느 애플리케이션 코드인지 몰라 맡지 못했어요\nBTS 구성 요소를 QA Hub 애플리케이션 이름과 같게 달면 다음부터 맡아요', 사람);
    return 'NO_APP';
  }
  const 저장소 = (await pool.query<{ repo: { name: string; url: string } | null }>("SELECT code_repos->0 AS repo FROM service WHERE id = $1", [앱])).rows[0]?.repo ?? null;
  const 글 = await 이슈글읽기(자리, issueKey, 부르기);
  // 같은 이슈의 기다리거나 도는 수정 일은 하나 — 신호 둘이 엇갈려도 고유 색인이 하나만 남긴다
  const 넣음 = await pool.query(
    `INSERT INTO authoring_request (service_id, kind, params, requested_by, requested_by_name, status)
     VALUES ($1, 'BUGFIX', $2, $3, $4, 'PENDING') ON CONFLICT DO NOTHING`,
    [앱, JSON.stringify({ issueKey, title: 이슈.summary, note: 글, repo: 저장소 }), l.updated_by, `BTS · ${l.display_name ?? l.updated_by}`],
  );
  return 넣음.rowCount === 1 ? 'TAKEN' : 'RUNNING';
}

/** 집기 응답의 bugfix 칸 — 서버가 맡을 때 담아 둔 params 그대로 */
export function 수정집기칸(params: Record<string, unknown>): { issueKey: string; title: string; note: string; repo: { name: string; url: string } | null } {
  const repo = params.repo as { name?: unknown; url?: unknown } | null | undefined;
  return {
    issueKey: String(params.issueKey ?? ''),
    title: String(params.title ?? ''),
    note: String(params.note ?? ''),
    repo: typeof repo?.url === 'string' ? { name: String(repo.name ?? ''), url: repo.url } : null,
  };
}

/** PR 주소가 그 일의 대상 저장소 것인가 — 테스트 저장소 견주기(병합주소인가) 대신 이것을 본다 */
export function 수정PR주소인가(prUrl: unknown, params: Record<string, unknown>): boolean {
  const 저장소 = 수정집기칸(params).repo?.url.replace(/\/+$/, '').replace(/\.git$/, '');
  if (typeof prUrl !== 'string' || 저장소 === undefined || !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+$/.test(저장소)) return false;
  const 꼴 = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+)\/pull\/\d+$/.exec(prUrl);
  return 꼴 !== null && `https://github.com/${꼴[1]!}/${꼴[2]!}`.toLowerCase() === 저장소.toLowerCase();
}

export const 수정있나 = (result: unknown): boolean => typeof result === 'object' && result !== null && 'bugfix' in result;

/**
 * 재검증에서 또 실패 — 수정 PR 을 올리고 끝난 일 뒤에 그 이슈를 배포가 다시 맡았는데(bts_claim) 실패했다.
 * AI 는 다시 안 맡고 넘겼던 사람에게 담당자를 돌리며 댓글 한 번(결정 11 · 시작 질문 6). 한 번만 — handedBack 표시를 UPDATE 가 돌려준 줄에만 건다
 */
export async function 재검증실패넘기기(projectId: number, issueKey: string, 까닭: string, runId: number, 부르기: 부르기함수 = BTS부르기): Promise<boolean> {
  const r = await (await db()).query<{ pr_url: string; owner: string | null; files: string[] | null }>(
    `UPDATE authoring_request r SET result = jsonb_set(r.result, '{bugfix,handedBack}', 'true'::jsonb)
       FROM service s
      WHERE s.id = r.service_id AND s.project_id = $1 AND r.kind = 'BUGFIX' AND r.params->>'issueKey' = $2
        AND r.pr_url IS NOT NULL AND r.discarded_at IS NULL
        AND NOT COALESCE((r.result->'bugfix'->>'handedBack')::boolean, false)
        -- 끝내기가 닿지 않은 줄도 본다 — PR 은 결과 통로가 적는다(pr_url)
        AND EXISTS (SELECT 1 FROM bts_claim c WHERE c.project_id = $1 AND c.issue_key = $2 AND c.claimed_at > COALESCE(r.finished_at, r.started_at, r.created_at))
      RETURNING r.pr_url, r.result->'bugfix'->>'owner' AS owner, ARRAY(SELECT jsonb_array_elements_text(COALESCE(r.result->'bugfix'->'files', '[]'::jsonb))) AS files`,
    [projectId, issueKey],
  );
  const 줄 = r.rows[0];
  if (줄 === undefined) return false;
  let 사람 = 줄.owner;
  if (사람 === null) {
    const l = await 연결읽기(projectId);
    사람 = l === null ? null : await 넘길사람찾기(자리로(l), l.bts_project, [], [], 부르기);
  }
  const 파일 = (줄.files ?? []).map((f) => `- ${f}`);
  await 넘기기(
    projectId,
    issueKey,
    [`수정 PR ${줄.pr_url} 을 배포했는데 재검증에서 또 실패했어요 — BTS 에이전트는 다시 맡지 않고 사람에게 넘겨요`, '', `실패 이유: ${까닭}`, `QA Hub 실행 ${String(runId)}`, ...(파일.length === 0 ? [] : ['', '고친 파일', ...파일])].join('\n'),
    사람,
  );
  return true;
}

