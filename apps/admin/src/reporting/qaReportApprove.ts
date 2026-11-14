// QA 리포트 승인 — 잠금 안에서 그 버전을 한 번 더 다시 만들고, PDF 를 굳혀 저장하고 SHA-256 지문을 남긴다 (도메인/리포팅 §3.17 결정 11 · 13 「묶음 · 버전」)

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Pool, PoolClient } from 'pg';

import { artifactsDir } from '../artifactFile.js';
import { 묶음잠금, 리포트방아쇠, 잠근채다시만든다 } from './qaReport.js';
import { PDF로 } from './generate.js';
import { 리스크일닫기 } from './qaReportAi.js';
import { 문서재료읽기, 리포트읽기, 사진심은, 사후승인, type 리포트응답 } from './qaReportDoc.js';
import { renderQaReportHtml } from './qaReportHtml.js';

export type 승인결과 =
  | { 됨: true; approval: NonNullable<리포트응답['approval']> }
  | { 됨: false; code: 403; error: 'SELF_APPROVAL' | 'FORBIDDEN' }
  | { 됨: false; code: 404; error: 'NOT_FOUND' }
  | { 됨: false; code: 409; error: 'ALREADY_APPROVED' | 'NOT_LATEST' | 'RUNNING' | 'AI_PENDING' };

interface 승인행 {
  bundle_key: string;
  service_id: string | null;
  env: string;
  build_no: string | null;
  approved_at: Date | null;
}

/**
 * 승인 전 버전을 이 사람이 지금 승인할 수 있나 — 승인 통로와 알림 서랍의 「승인 전」 줄이 같이 쓴다.
 * admin · 배정은 부르는 쪽이 이미 봤다(통로는 문, 알림은 배정 목록)
 */
export function 승인막힘(username: string, r: { running: number; aiPending: boolean; performers: readonly string[] }): 'RUNNING' | 'AI_PENDING' | 'SELF_APPROVAL' | null {
  if (r.running > 0) return 'RUNNING';
  if (r.aiPending) return 'AI_PENDING';
  return r.performers.includes(username) ? 'SELF_APPROVAL' : null;
}

/**
 * 지금 그 리포트를 막는 것 — 승인 통로와 알림의 승인 전 줄이 같은 SQL 로 본다. `q` 는 qa_report 별칭이다.
 * 도는 실행은 첫 장(마지막으로 다시 만든 때)이 아니라 지금 표에서 센다 — 다시 만들기는 실행이 끝날 때만 돌아 시작한 실행을 모른다.
 * 묶음에 붙은 도는 한 건 실행도 센다 — 끝나면 붙은 결과가 바뀔 수 있다
 */
export const 막는일SQL = `
  (SELECT count(*) FROM test_run t
    WHERE t.status = 'RUNNING' AND (
      (q.build_no IS NOT NULL AND t.origin <> 'SINGLE' AND t.kind IN ('UI', 'FN', 'SCENARIO', 'COMPAT')
         AND t.service_id = q.service_id AND t.env = q.env AND t.build_no = q.build_no)
      OR (t.origin = 'SINGLE' AND t.rerun_of = ANY(q.run_ids)
         AND t.build_no IS NOT DISTINCT FROM (SELECT a.build_no FROM test_run a WHERE a.run_id = t.rerun_of))))::int
  + (SELECT count(*) FROM perf_run p
      WHERE p.status NOT IN ('DONE', 'STOPPED', 'ERROR') AND q.build_no IS NOT NULL
        AND p.service_id = q.service_id AND p.env = q.env AND p.build_no = q.build_no)::int AS running,
  COALESCE((SELECT j.status IN ('QUEUED', 'RUNNING') FROM perf_ai_job j WHERE j.id = q.ai_job_id), false) AS ai_pending`;

interface 굳힐것 {
  응답: 리포트응답 & { approval: NonNullable<리포트응답['approval']> };
  serviceId: number | null;
  at: Date;
  /** 굳히기 전에 다시 견줄 이 버전의 마지막 다시 만든 때(마이크로초까지 — 글자로 견준다) */
  updatedAt: string;
}

/**
 * 승인자는 문(gate)이 이미 그 애플리케이션에 배정된 admin 인지 봤다. 여기서는 수행자 · 버전 · 도는 실행 · AI 일을 본다.
 * PDF 는 잠금 밖에서 그린다 — 그리기는 실행과 같은 대기줄을 타서 오래 걸릴 수 있는데, 그동안 묶음 잠금과 다시 만들기 줄을 붙들면 안 된다.
 * 그린 사이에 그 버전이 다시 만들어졌으면 처음부터 다시 한다
 */
export async function QA리포트를승인한다(pool: Pool, id: number, 승인자: { username: string; name: string }): Promise<승인결과> {
  const 처음 = (await pool.query<{ bundle_key: string }>('SELECT bundle_key FROM qa_report WHERE id = $1', [id])).rows[0];
  if (처음 === undefined) return { 됨: false, code: 404, error: 'NOT_FOUND' };
  // 에이전트가 쥐고 죽었거나 꺼져 안 가져간 AI 일을 먼저 닫는다 — 안 닫으면 AI_PENDING 에 묶여 승인하지 못한다
  await 리스크일닫기();
  // ponytail: 세 번 — 그리는 동안 실행이 계속 끝나는 묶음이면 「진행 중」으로 돌려보낸다
  for (let 번 = 0; 번 < 3; 번 += 1) {
    const 앞 = await 묶음잠금(pool, 처음.bundle_key, (c) => 굳힐재료(pool, c, id, 승인자));
    if ('됨' in 앞) return 앞;
    const pdf = await PDF로(renderQaReportHtml(await 사진심은(await 문서재료읽기(pool, 앞)), 'PDF'));
    const 끝 = await 묶음잠금(pool, 처음.bundle_key, (c) => 굳힌다(c, id, 승인자, 앞, pdf));
    if (끝 !== '바뀜') return 끝;
  }
  return { 됨: false, code: 409, error: 'RUNNING' };
}

async function 막는것(c: PoolClient, id: number, 승인자: string): Promise<승인결과 | { latest: boolean; updatedAt: string } > {
  const r = (
    await c.query<{ approved: boolean; latest: boolean; updated_at: string; performers: string[]; running: number; ai_pending: boolean }>(
      `SELECT q.approved_at IS NOT NULL AS approved, q.updated_at::text AS updated_at, q.performers,
              q.version = (SELECT max(version) FROM qa_report WHERE bundle_key = q.bundle_key) AS latest, ${막는일SQL}
         FROM qa_report q WHERE q.id = $1`,
      [id],
    )
  ).rows[0]!;
  if (r.approved) return { 됨: false, code: 409, error: 'ALREADY_APPROVED' };
  if (!r.latest) return { 됨: false, code: 409, error: 'NOT_LATEST' };
  // 실패를 한 건 다시 돌려 통과로 바꾼 사람도 수행자다 — 다시 만든 뒤의 수행자로 본다 (§3.17 「수행자」)
  const 막힘 = 승인막힘(승인자, { running: r.running, aiPending: r.ai_pending, performers: r.performers });
  if (막힘 === 'SELF_APPROVAL') return { 됨: false, code: 403, error: 막힘 };
  if (막힘 !== null) return { 됨: false, code: 409, error: 막힘 };
  return { latest: true, updatedAt: r.updated_at };
}

/** 잠금 안 ① — 마지막 실행 뒤에 달린 판정(실패 카드 · Issue Bunker)이 첫 장에 들도록 한 번 더 다시 만들고, 굳힐 재료를 읽는다 */
async function 굳힐재료(pool: Pool, c: PoolClient, id: number, 승인자: { username: string; name: string }): Promise<승인결과 | 굳힐것> {
  const q = (await c.query<승인행>('SELECT bundle_key, service_id, env, build_no, approved_at FROM qa_report WHERE id = $1', [id])).rows[0]!;
  if (q.approved_at !== null) return { 됨: false, code: 409, error: 'ALREADY_APPROVED' };
  // 애플리케이션을 지운 리포트는 배정을 볼 곳이 없다 — 아무도 그 애플리케이션의 admin 이 아니다 (도메인/인증 §7)
  if (q.service_id === null) return { 됨: false, code: 403, error: 'FORBIDDEN' };
  const 앞검사 = await 막는것(c, id, 승인자.username);
  if ('됨' in 앞검사) return 앞검사;
  if ((await 잠근채다시만든다(pool, c, 리포트방아쇠({ ...q, service_id: q.service_id }), false)) === null) return { 됨: false, code: 403, error: 'FORBIDDEN' };
  const 뒤검사 = await 막는것(c, id, 승인자.username);
  if ('됨' in 뒤검사) return 뒤검사;
  // 이 트랜잭션이 고친 줄을 읽는다. 승인 시각은 누른 때(이 트랜잭션 시각)이고 PDF 의 승인 칸 · approved_at 이 같은 값이다
  const 읽음 = (await 리포트읽기(c, id))!;
  const at = (await c.query<{ n: Date }>('SELECT now() AS n')).rows[0]!.n;
  const approval = { by: 승인자.username, byName: 승인자.name, at: at.toISOString(), late: await 사후승인(c, 읽음.응답.runIds, at), sha256: null };
  return { 응답: { ...읽음.응답, approval }, serviceId: 읽음.serviceId, at, updatedAt: 뒤검사.updatedAt };
}

/** 잠금 안 ② — 그리는 사이 그 버전이 그대로면 파일과 승인 칸을 같은 트랜잭션에서 남긴다 */
async function 굳힌다(c: PoolClient, id: number, 승인자: { username: string; name: string }, 앞: 굳힐것, pdf: Buffer): Promise<승인결과 | '바뀜'> {
  const 지금 = await 막는것(c, id, 승인자.username);
  if ('됨' in 지금) return 지금;
  if (지금.updatedAt !== 앞.updatedAt) return '바뀜';
  const sha256 = createHash('sha256').update(pdf).digest('hex');
  // 버전마다 새 파일이다. 같은 번호를 두 번 승인하는 일은 ALREADY_APPROVED 가 막는다
  const 폴더 = join(artifactsDir(), 'qa-report');
  const 경로 = join(폴더, `${id}.pdf`);
  await mkdir(폴더, { recursive: true });
  await writeFile(경로, pdf);
  await c.query('UPDATE qa_report SET approved_by = $2, approved_name = $3, approved_at = $4, pdf_path = $5, pdf_sha256 = $6 WHERE id = $1', [
    id,
    승인자.username,
    승인자.name,
    앞.at,
    경로,
    sha256,
  ]);
  return { 됨: true, approval: { ...앞.응답.approval, sha256 } };
}
