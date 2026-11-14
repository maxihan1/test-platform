// QA 리포트 승인 — 잠금 안에서 그 버전을 한 번 더 다시 만들고, PDF 를 굳혀 저장하고 SHA-256 지문을 남긴다 (도메인/리포팅 §3.17 결정 11 · 13 「묶음 · 버전」)

import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { Pool } from 'pg';

import { artifactsDir } from '../artifactFile.js';
import { 묶음잠금, 리포트방아쇠, 잠근채다시만든다 } from './qaReport.js';
import { PDF로 } from './generate.js';
import { 문서재료읽기, 리포트읽기, 사진심은, type 리포트응답 } from './qaReportDoc.js';
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
  latest: boolean;
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

/** 승인자는 문(gate)이 이미 그 애플리케이션에 배정된 admin 인지 봤다. 여기서는 수행자 · 버전 · 도는 실행 · AI 일을 본다 */
export async function QA리포트를승인한다(pool: Pool, id: number, 승인자: { username: string; name: string }): Promise<승인결과> {
  const 처음 = (await pool.query<{ bundle_key: string }>('SELECT bundle_key FROM qa_report WHERE id = $1', [id])).rows[0];
  if (처음 === undefined) return { 됨: false, code: 404, error: 'NOT_FOUND' };

  return 묶음잠금(pool, 처음.bundle_key, async (c): Promise<승인결과> => {
    // 잠금을 잡은 뒤 다시 읽는다 — 그 사이 실행이 끝나 버전이 올랐을 수 있다
    const q = (
      await c.query<승인행>(
        `SELECT bundle_key, service_id, env, build_no, approved_at,
                version = (SELECT max(version) FROM qa_report WHERE bundle_key = q.bundle_key) AS latest
           FROM qa_report q WHERE id = $1`,
        [id],
      )
    ).rows[0]!;
    if (q.approved_at !== null) return { 됨: false, code: 409, error: 'ALREADY_APPROVED' };
    if (!q.latest) return { 됨: false, code: 409, error: 'NOT_LATEST' };
    // 애플리케이션을 지운 리포트는 배정을 볼 곳이 없다 — 아무도 그 애플리케이션의 admin 이 아니다 (도메인/인증 §7)
    if (q.service_id === null) return { 됨: false, code: 403, error: 'FORBIDDEN' };

    // 마지막 실행 뒤에 달린 판정(실패 카드 · Issue Bunker)이 첫 장에 들도록 굳히기 전에 한 번 더 다시 만든다
    if ((await 잠근채다시만든다(pool, c, 리포트방아쇠({ ...q, service_id: q.service_id }))) === null) return { 됨: false, code: 403, error: 'FORBIDDEN' };
    const 지금 = (
      await c.query<{ running: number; performers: string[]; ai_pending: boolean; at: Date }>(
        `SELECT (q.summary->'overview'->>'running')::int AS running, q.performers, now() AS at,
                COALESCE(j.status IN ('QUEUED', 'RUNNING'), false) AS ai_pending
           FROM qa_report q LEFT JOIN perf_ai_job j ON j.id = q.ai_job_id WHERE q.id = $1`,
        [id],
      )
    ).rows[0]!;
    // 실패를 한 건 다시 돌려 통과로 바꾼 사람도 수행자다 — 다시 만든 뒤의 수행자로 본다 (§3.17 「수행자」)
    const 막힘 = 승인막힘(승인자.username, { running: 지금.running, aiPending: 지금.ai_pending, performers: 지금.performers });
    if (막힘 === 'SELF_APPROVAL') return { 됨: false, code: 403, error: 막힘 };
    if (막힘 !== null) return { 됨: false, code: 409, error: 막힘 };

    // 이 트랜잭션이 고친 줄을 읽는다 — 풀의 다른 연결은 아직 안 보인다
    const 읽음 = (await 리포트읽기(c, id))!;
    // 굳힐 PDF 에 승인 칸을 채워 그린다. 시각은 트랜잭션 시각으로 DB 에 남길 값과 같다
    const 배포 = (await c.query<{ at: Date | null }>('SELECT min(created_at) AS at FROM bts_deploy WHERE run_ids && $1::bigint[]', [읽음.응답.runIds])).rows[0]?.at ?? null;
    const approval = { by: 승인자.username, byName: 승인자.name, at: 지금.at.toISOString(), late: 배포 !== null && 지금.at > 배포, sha256: null as string | null };
    const 응답 = { ...읽음.응답, approval };
    const pdf = await PDF로(renderQaReportHtml(await 사진심은(await 문서재료읽기(pool, { 응답, serviceId: 읽음.serviceId })), 'PDF'));
    const sha256 = createHash('sha256').update(pdf).digest('hex');
    // 버전마다 새 파일이다. 같은 번호를 두 번 승인하는 일은 위 ALREADY_APPROVED 가 막는다
    const 폴더 = join(artifactsDir(), 'qa-report');
    const 경로 = join(폴더, `${id}.pdf`);
    await mkdir(폴더, { recursive: true });
    await writeFile(경로, pdf);
    await c.query('UPDATE qa_report SET approved_by = $2, approved_name = $3, approved_at = $4, pdf_path = $5, pdf_sha256 = $6 WHERE id = $1', [
      id,
      승인자.username,
      승인자.name,
      지금.at,
      경로,
      sha256,
    ]);
    return { 됨: true, approval: { ...approval, sha256 } };
  });
}
