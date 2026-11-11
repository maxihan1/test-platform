// 「테스트 수정」 바퀴가 단계마다 Issue Bunker 이슈를 다시 읽고, 그만두거나 「QA 검토」로 되돌리는 조각 (도메인/BTS §3.12 「테스트 수정 바퀴」 5 · 6)
// 맡기(testFix.ts) · 병합 판정(testFixMerge.ts) · 다시 실행(testFixRerun.ts)이 같이 쓴다 — 셋 사이에 가져오기 고리가 생기지 않게 따로 둔다

import type { Pool, PoolClient } from 'pg';

import { BTS부르기, type 부르기함수 } from './client.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

type 질의 = Pick<PoolClient, 'query'>;

/** Issue Bunker 가 잠깐 바쁜 답 — 다시 부르면 될 수 있다. 나머지 4xx 는 다시 불러도 같다 */
export const 다시받을 = (status: number): boolean => status >= 500 || status === 408 || status === 429;

/** 끝나지 않은 줄 — 한 테스트 · 한 대상 서버에 하나뿐이다(bts_test_fix 부분 고유 색인) */
export const 도는상태 = ['FIXING', 'WAIT_MERGE', 'RERUNNING'];

/** 이슈를 다시 읽는 데 드는 칸 — bts_test_fix 줄에 bts_link 를 붙여 읽는다 */
export interface 이슈자리 {
  issue_key: string;
  base_url: string | null;
  bot_username: string | null;
  status_map: Record<string, string> | null;
}

/** 이어감 — 아직 「테스트 수정」 · 다시 — Issue Bunker 에 못 닿아 다음 60초 점검에서 · 그만 — 사람이 옮겼거나 읽을 수 없다 */
export type 이슈확인결과 = '이어감' | '다시' | { 그만: string };

/** 다음 단계 전에 이슈를 다시 읽는다 — 알림을 놓쳤어도 사람이 옮긴 이슈에 손대지 않게 (「테스트 수정 바퀴」 6) */
export async function 이슈확인(자리: 이슈자리, 부르기: 부르기함수 = BTS부르기): Promise<이슈확인결과> {
  const 수정 = 자리.status_map?.TEST_FIX ?? '';
  if (자리.base_url === null || 수정 === '') return { 그만: 'Issue Bunker 연결에서 「테스트 수정」 상태를 뺐어요' };
  try {
    const r = await 부르기({ baseUrl: 자리.base_url, 봇: 자리.bot_username ?? '' }, 'GET', `/api/v1/issues/${encodeURIComponent(자리.issue_key)}`);
    if (다시받을(r.status)) return '다시';
    // 권한 · 없음은 다시 읽어도 같다 — 이어 갈 수 없으니 그만둔다
    if (r.status !== 200) return { 그만: `Issue Bunker 이슈를 읽지 못했어요 (${String(r.status)})` };
    const 지금 = (r.json as { data?: { currentStateKey?: unknown } } | null)?.data?.currentStateKey;
    return 지금 === 수정 ? '이어감' : { 그만: '사람이 이슈를 옮겼어요' };
  } catch {
    return '다시';
  }
}

/** 도는 줄을 그만둔다 — Issue Bunker 에는 아무것도 안 보낸다. 열린 PR · 작성은 그대로 둔다 */
export async function 그만두기(id: number | string, 까닭: string): Promise<void> {
  await (await db()).query(`UPDATE bts_test_fix SET state = 'GAVE_UP', reason = $2, updated_at = now() WHERE id = $1 AND state = ANY($3)`, [id, 까닭, 도는상태]);
}

/** 보낼 줄에 바로 넣는다 — 줄 상태를 바꾸는 트랜잭션 안에서 같이 넣으려고 보낼줄넣기(outbox.ts) 대신 쓴다 */
export async function 줄넣기(손: 질의, projectId: number | string, kind: 'COMMENT' | 'TRANSITION' | 'ASSIGN', issueKey: string, payload: unknown): Promise<void> {
  await 손.query('INSERT INTO bts_outbox (project_id, kind, issue_key, payload) VALUES ($1, $2, $3, $4)', [projectId, kind, issueKey, JSON.stringify(payload)]);
}

/**
 * 「QA 검토」로 옮기고 담당자를 「테스트 수정」으로 옮긴 사람으로 되돌린 뒤 까닭 댓글. 같은 이슈의 보낼 줄은 넣은 차례대로 간다(outbox.ts).
 * 다시 고치지 않는다 — 사람이 다시 「테스트 수정」으로 옮기면 새 줄로 돈다(「테스트 수정 바퀴」 5)
 */
export async function 되돌림넣기(손: 질의, projectId: number | string, issueKey: string, 검토키: string, 옮긴사람: string | null, 까닭: string): Promise<void> {
  if (검토키 !== '') await 줄넣기(손, projectId, 'TRANSITION', issueKey, { toStatusKey: 검토키 });
  if (옮긴사람 !== null) await 줄넣기(손, projectId, 'ASSIGN', issueKey, { assigneeId: 옮긴사람 });
  await 줄넣기(손, projectId, 'COMMENT', issueKey, { body: 까닭 });
}

/** 한 이슈의 줄들을 한 번에 하나씩 끝낸다 — 두 테스트가 같이 끝나 닫기와 되돌리기가 엇갈려 가지 않게 */
export async function 이슈잠그고<T>(projectId: number | string, issueKey: string, 일: (손: PoolClient) => Promise<T>): Promise<T> {
  const 손 = await (await db()).connect();
  try {
    await 손.query('BEGIN');
    await 손.query(`SELECT pg_advisory_xact_lock(hashtext('bts-test-fix'), hashtext($1))`, [`${String(projectId)}:${issueKey}`]);
    const 값 = await 일(손);
    await 손.query('COMMIT');
    return 값;
  } catch (e) {
    await 손.query('ROLLBACK');
    throw e;
  } finally {
    손.release();
  }
}
