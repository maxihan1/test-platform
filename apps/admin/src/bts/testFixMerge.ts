// BTS 「테스트 수정」 고침 PR 의 병합 — 세 조건이 맞으면 Commander 가 반영을 세우고, 아니면 이슈에 「사람 확인이 필요해요」 (도메인/BTS §3.12 「테스트 수정 바퀴」 3 · 결정 24)
// 반영은 사람 통로와 같은 머지세우기를 요청한 사람 `bts` 로 부른다 — 보류 · 겹침 · 최신 실행 판정을 따로 두지 않는다

import type { Pool, PoolClient } from 'pg';

import { 머지세우기 } from '../authoring/merge.js';
import { 뿌리잠그고 } from '../authoring/history.js';
import { 한건 } from '../authoring/store.js';
import { BTS부르기, type 부르기함수 } from './client.js';
import { BTS요청자 } from './close.js';
import { type 걸린까닭, 걸린까닭읽기, 댓글한번 } from './testFix.js';
import { 그만두기, 이슈확인, type 이슈자리 } from './testFixIssue.js';
import { 사람확인글 } from './testFixView.js';

const 까닭글: Record<걸린까닭, string> = {
  EXPECTED_CHANGED: '기대값이 바뀌었어요',
  VERIFY_FEWER: '확인 문장이 줄었어요',
  MUTATION_MISSED: '일부러 고장 내 보기에서 못 잡은 고장이 있어요',
  NOT_MEASURED: '자동 병합 조건을 재지 못했어요',
};

// 머지세우기가 막은 까닭 — 사람이 테스트 작성 화면에서 풀 일이다
const 막힘글: Record<string, string> = {
  HELD_OPEN: '값을 안 채운 보류 케이스가 남았어요',
  HELD_UNKNOWN: '보류 케이스가 몇 건인지 모르는 작성이에요',
  CONFLICT_OPEN: '겹치는 케이스를 아직 고르지 않았어요',
  BAD_ENV: '반영할 대상 서버를 고르지 못했어요',
};

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

type 판정끝 = { 끝: 'AUTO' | null } | { 끝: 'PERSON'; projectId: number; issueKey: string; 까닭: string[] };

/**
 * 고침 작성(요청번호 — 끝난 그 실행)이 PR 을 연 뒤 한 번. 그 PR 의 병합 기다림 줄이 없으면(바퀴 전 요청 · 사람이 이슈를 옮김 · 이미 반영함) 아무것도 안 한다.
 * 걸린 까닭을 줄에 적고, 비었으면 반영을 세워 merge AUTO. 걸렸거나 반영을 못 세우면 「사람 확인이 필요해요 — <까닭>」 댓글(같은 글은 한 번) — 사람이 지금처럼 반영한다.
 * 도는 실행이 있거나 뒤에 실행이 더 있으면 그 PR 은 옛것이라 넘긴다 — 뒤 실행이 끝날 때 다시 판정한다.
 * 줄 적기와 반영 세우기는 뿌리 잠금 안에서 — 사이에 사람 반영이 끼어 같은 PR 에 반영이 둘 서지 않게
 */
export async function 테스트수정병합판정(
  요청번호: number,
  서비스: number,
  뿌리번호: number,
  prUrl: string,
  결과: unknown,
  부르기: 부르기함수 = BTS부르기,
): Promise<'AUTO' | 'PERSON' | null> {
  const 걸림 = 걸린까닭읽기(결과);
  // 반영을 세우기 전에 이슈를 다시 읽는다 — 사람이 옮겼으면 그만, Issue Bunker 에 못 닿으면 60초 점검이 다시 판정한다(testFixRerun.ts) (「테스트 수정 바퀴」 6)
  if (걸림.length === 0) {
    const 줄들 = (
      await (await db()).query<이슈자리 & { id: string }>(
        `SELECT f.id, f.issue_key, l.base_url, l.bot_username, l.status_map
           FROM bts_test_fix f LEFT JOIN bts_link l ON l.project_id = f.project_id
          WHERE f.request_id = $1 AND f.pr_url = $2 AND f.state = 'WAIT_MERGE' AND f.merge IS NULL`,
        [뿌리번호, prUrl],
      )
    ).rows;
    if (줄들[0] === undefined) return null;
    const 확인 = await 이슈확인(줄들[0], 부르기);
    if (확인 === '다시') return null;
    // 한 요청이 테스트 여럿을 고쳤으면 줄이 여럿이다 — 같은 이슈라 다 놓는다
    if (확인 !== '이어감') {
      for (const 줄 of 줄들) await 그만두기(줄.id, 확인.그만);
      return null;
    }
  }
  const 판정 = await 뿌리잠그고(뿌리번호, async (손): Promise<판정끝> => {
    const 줄 = (
      await 손.query<{ project_id: string; issue_key: string }>(
        `UPDATE bts_test_fix SET held = $3, updated_at = now() WHERE request_id = $1 AND pr_url = $2 AND state = 'WAIT_MERGE' AND merge IS NULL RETURNING project_id, issue_key`,
        [뿌리번호, prUrl, 걸림],
      )
    ).rows[0];
    if (줄 === undefined) return { 끝: null };
    const 사람에게 = (까닭: string[]): 판정끝 => ({ 끝: 'PERSON', projectId: Number(줄.project_id), issueKey: 줄.issue_key, 까닭 });
    if (걸림.length > 0) return 사람에게(걸림.map((k) => 까닭글[k]));
    const 행 = await 한건(요청번호, 손);
    if (행 === null) return { 끝: null };
    const { 누가, 이름 } = BTS요청자(줄.issue_key);
    // 결정 진행(decisionRun.ts)과 같다 — 대상 서버를 묻는 반영이면 그 작성의 대상 서버로 한 번 더
    let 세움 = await 머지세우기(손, 행, 서비스, undefined, { username: 누가, displayName: 이름 });
    if ('error' in 세움 && 세움.error === 'BAD_ENV' && !행.compare && 행.env !== null) 세움 = await 머지세우기(손, 행, 서비스, 행.env, { username: 누가, displayName: 이름 });
    if (!('error' in 세움)) {
      await 손.query(`UPDATE bts_test_fix SET merge = 'AUTO', updated_at = now() WHERE request_id = $1 AND pr_url = $2 AND state = 'WAIT_MERGE'`, [뿌리번호, prUrl]);
      return { 끝: 'AUTO' };
    }
    if (세움.error === 'RUN_ACTIVE' || 세움.error === 'NOT_LATEST') return { 끝: null };
    return 사람에게([막힘글[세움.error] ?? '자동 반영을 세우지 못했어요']);
  });
  if (판정.끝 === 'PERSON') await 댓글한번(판정.projectId, 판정.issueKey, `${사람확인글} — ${판정.까닭.join(' · ')}\n${prUrl}`);
  return 판정.끝;
}

/**
 * 반영이 끝나면 누가 병합했는지 적는다 — 그 반영을 세운 사람이 `bts` 면 AUTO, 아니면 PERSON. 반영과 같은 트랜잭션.
 * 세울 때 적은 AUTO 도 덮는다 — 자동 반영이 실패해 사람이 다시 반영했으면 사람이 한 것이다
 */
export async function 반영한사람적기(손: PoolClient, 뿌리번호: number, 반영요청자: string): Promise<void> {
  await 손.query(`UPDATE bts_test_fix SET merge = $2, updated_at = now() WHERE request_id = $1 AND state = 'WAIT_MERGE'`, [
    뿌리번호,
    반영요청자 === BTS요청자('').누가 ? 'AUTO' : 'PERSON',
  ]);
}

/**
 * Commander 가 세운 반영이 실패 · 멈춤으로 끝나면 「사람 확인이 필요해요 — 자동 반영이 실패했어요」(같은 글은 한 번).
 * 줄은 병합 기다림 그대로라 사람이 테스트 작성 화면에서 반영하면 다시 실행으로 이어진다 — 되돌리면 PR 을 고쳐 반영해도 이슈가 안 닫힌다
 */
export async function 자동반영실패(뿌리번호: number): Promise<void> {
  const 줄들 = await (await db()).query<{ project_id: string; issue_key: string; pr_url: string }>(
    `SELECT project_id, issue_key, pr_url FROM bts_test_fix WHERE request_id = $1 AND state = 'WAIT_MERGE' AND merge = 'AUTO' AND pr_url IS NOT NULL`,
    [뿌리번호],
  );
  for (const 줄 of 줄들.rows) await 댓글한번(Number(줄.project_id), 줄.issue_key, `${사람확인글} — 자동 반영이 실패했어요\n${줄.pr_url}`);
}
