// BTS 「테스트 수정」 고침 PR 의 병합 — 세 조건이 맞으면 Commander 가 반영을 세우고, 아니면 이슈에 「사람 확인이 필요해요」 (도메인/BTS §3.12 「테스트 수정 바퀴」 3 · 결정 24)
// 반영은 사람 통로와 같은 머지세우기를 요청한 사람 `bts` 로 부른다 — 보류 · 겹침 · 최신 실행 판정을 따로 두지 않는다

import type { Pool, PoolClient } from 'pg';

import { 머지세우기 } from '../authoring/merge.js';
import { 뿌리잠그고 } from '../authoring/history.js';
import { 한건 } from '../authoring/store.js';
import { BTS요청자 } from './close.js';
import { 보낼줄넣기 } from './outbox.js';
import { type 걸린까닭, 걸린까닭읽기 } from './testFix.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

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

/**
 * 고침 작성(요청번호 — 끝난 그 실행)이 PR 을 연 뒤 한 번. 그 PR 의 병합 기다림 줄이 없으면(바퀴 전 요청 · 사람이 이슈를 옮김 · 이미 판정함) 아무것도 안 한다.
 * 걸린 까닭을 줄에 적고, 비었으면 반영을 세워 merge AUTO. 걸렸거나 반영을 못 세우면 「사람 확인이 필요해요 — <까닭>」 댓글 — 사람이 지금처럼 반영한다.
 * 도는 실행이 있거나 뒤에 실행이 더 있으면 그 PR 은 옛것이라 넘긴다 — 뒤 실행이 끝날 때 다시 판정한다
 */
export async function 테스트수정병합판정(요청번호: number, 서비스: number, 뿌리번호: number, prUrl: string, 결과: unknown): Promise<'AUTO' | 'PERSON' | null> {
  const pool = await db();
  const 걸림 = 걸린까닭읽기(결과);
  const 줄 = (
    await pool.query<{ project_id: string; issue_key: string }>(
      `UPDATE bts_test_fix SET held = $3, updated_at = now() WHERE request_id = $1 AND pr_url = $2 AND state = 'WAIT_MERGE' AND merge IS NULL RETURNING project_id, issue_key`,
      [뿌리번호, prUrl, 걸림],
    )
  ).rows[0];
  if (줄 === undefined) return null;
  let 까닭 = 걸림.map((k) => 까닭글[k]);
  if (걸림.length === 0) {
    const 세움 = await 뿌리잠그고(뿌리번호, async (손) => {
      const 행 = await 한건(요청번호, 손);
      if (행 === null) return { error: 'NOT_FOUND' };
      const 사람 = { username: BTS요청자(줄.issue_key).누가, displayName: BTS요청자(줄.issue_key).이름 };
      // 결정 진행(decisionRun.ts)과 같다 — 대상 서버를 묻는 반영이면 그 작성의 대상 서버로 한 번 더
      let 판정 = await 머지세우기(손, 행, 서비스, undefined, 사람);
      if ('error' in 판정 && 판정.error === 'BAD_ENV' && !행.compare && 행.env !== null) 판정 = await 머지세우기(손, 행, 서비스, 행.env, 사람);
      if (!('error' in 판정)) await 손.query(`UPDATE bts_test_fix SET merge = 'AUTO', updated_at = now() WHERE request_id = $1 AND pr_url = $2 AND state = 'WAIT_MERGE'`, [뿌리번호, prUrl]);
      return 판정;
    });
    if (!('error' in 세움)) return 'AUTO';
    if (세움.error === 'RUN_ACTIVE' || 세움.error === 'NOT_LATEST') return null;
    까닭 = [막힘글[세움.error] ?? '자동 반영을 세우지 못했어요'];
  }
  await 보낼줄넣기({ projectId: Number(줄.project_id), kind: 'COMMENT', issueKey: 줄.issue_key, payload: { body: `사람 확인이 필요해요 — ${까닭.join(' · ')}\n${prUrl}` } });
  return 'PERSON';
}

/** 반영이 끝났는데 아직 누가 병합했는지 비어 있으면 사람이 테스트 작성 화면에서 반영한 것이다 — 자동이면 세울 때 AUTO 를 적었다. 반영과 같은 트랜잭션 */
export async function 사람반영적기(손: PoolClient, 뿌리번호: number): Promise<void> {
  await 손.query(`UPDATE bts_test_fix SET merge = 'PERSON', updated_at = now() WHERE request_id = $1 AND state = 'WAIT_MERGE' AND merge IS NULL`, [뿌리번호]);
}
