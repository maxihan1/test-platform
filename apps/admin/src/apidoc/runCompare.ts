// 케이스 실행 시작 때 그 대상 서버의 API 문서를 받아 마지막 판과 견준다 (도메인/API §3.8 「실행 시작 때 견주기」)
// 기준 서버면 다를 때 판을 올리고, 다른 서버면 다를 때 한 줄만 남긴다. 못 받아도 실행은 막지 않는다

import { 문서받기, 문서읽기, 지문 } from './doc.js';
import { 판올리기 } from './store.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

interface 실행줄 {
  service_id: string;
  env: string;
  base_url: string;
  triggered_by: string;
  origin: string;
  app_kind: string;
  api_doc_path: string | null;
  api_doc_env: string | null;
}

/** API 애플리케이션 케이스 실행이 아니거나 문서 경로가 없으면 아무것도 안 한다. 끝나면 test_run 의 두 칸을 채운다 */
export async function 실행문서견주기(runId: number): Promise<void> {
  const pool = await db();
  const 줄 = (
    await pool.query<실행줄>(
      `SELECT r.service_id, r.env, r.base_url, r.triggered_by, r.origin, s.kind AS app_kind, s.api_doc_path, s.api_doc_env
         FROM test_run r JOIN service s ON s.id = r.service_id
        WHERE r.run_id = $1 AND r.kind IN ('UI', 'FN')`,
      [runId],
    )
  ).rows[0];
  if (줄 === undefined || 줄.app_kind !== 'API' || 줄.api_doc_path === null) return;
  const serviceId = Number(줄.service_id);

  // 원문(5MB 까지) 대신 저장된 지문과 견준다
  const 마지막 = async () =>
    (
      await pool.query<{ version: number; fingerprint: string }>(
        'SELECT version, fingerprint FROM api_doc_version WHERE service_id = $1 ORDER BY version DESC LIMIT 1',
        [serviceId],
      )
    ).rows[0];

  let note: 'DIFFERS' | 'FETCH_FAILED' | null = null;
  let version: number | null;
  const 받은것 = await 문서받기(줄.base_url.replace(/\/+$/, '') + 줄.api_doc_path);
  // 받았는데 OpenAPI 3 JSON 이 아니면 견줄 수 없다 — 못 받은 것과 같다
  const 읽음 = 'reason' in 받은것 ? 받은것 : 문서읽기(받은것.글);
  if ('reason' in 읽음) {
    note = 'FETCH_FAILED';
    version = (await 마지막())?.version ?? null;
  } else if (줄.env === 줄.api_doc_env) {
    // 정기 실행이 올린 판은 누른 사람이 없다
    version = (await 판올리기(serviceId, 읽음.문서, { source: 'URL', env: 줄.env }, 줄.origin === 'SCHEDULED' ? null : 줄.triggered_by)).version;
  } else {
    const 끝판 = await 마지막();
    version = 끝판?.version ?? null;
    // 판이 하나도 없으면 「판 N 과 달라요」의 N 이 없다 — 견줄 것이 없다
    if (끝판 !== undefined && 끝판.fingerprint !== 지문(읽음.문서)) note = 'DIFFERS';
  }
  await pool.query('UPDATE test_run SET api_doc_version = $2, api_doc_note = $3 WHERE run_id = $1', [runId, version, note]);
}
