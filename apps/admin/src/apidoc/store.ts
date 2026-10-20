// API 문서 판 · 커버리지 DB 읽기 쓰기 (도메인/API §3.8 · §7 · 공통/4-데이터모델 「API 테스트 표」)

import { 지문, 커버리지틀 } from './doc.js';

async function db() {
  const { pool } = await import('../db/index.js');
  return pool;
}

export interface 문서설정 {
  kind: string;
  docPath: string | null;
  docEnv: string | null;
  /** 기준 서버 줄의 주소. 기준 서버가 비었거나 그 줄이 없으면 null */
  baseUrl: string | null;
}

export async function 문서설정읽기(serviceId: number): Promise<문서설정 | null> {
  const r = await (await db()).query<{ kind: string; api_doc_path: string | null; api_doc_env: string | null; base_url: string | null }>(
    `SELECT s.kind, s.api_doc_path, s.api_doc_env, e.base_url
       FROM service s LEFT JOIN service_env e ON e.service_id = s.id AND e.env = s.api_doc_env
      WHERE s.id = $1`,
    [serviceId],
  );
  const 줄 = r.rows[0];
  return 줄 === undefined ? null : { kind: 줄.kind, docPath: 줄.api_doc_path, docEnv: 줄.api_doc_env, baseUrl: 줄.base_url };
}

export async function 판목록(serviceId: number) {
  const r = await (await db()).query<{
    version: number;
    source: 'URL' | 'FILE';
    env: string | null;
    file_name: string | null;
    created_at: Date;
    created_by: string | null;
  }>(
    'SELECT version, source, env, file_name, created_at, created_by FROM api_doc_version WHERE service_id = $1 ORDER BY version DESC',
    [serviceId],
  );
  return r.rows.map((v) => ({
    version: v.version,
    source: v.source,
    env: v.env,
    fileName: v.file_name,
    createdAt: v.created_at.toISOString(),
    createdBy: v.created_by,
  }));
}

/** 판 원문. 판 번호가 없으면 마지막 판. 없으면 null */
export async function 판원문(
  serviceId: number,
  version?: number,
  q?: { query: Awaited<ReturnType<typeof db>>['query'] },
): Promise<{ version: number; doc: Record<string, unknown> } | null> {
  const r = await (q ?? (await db())).query<{ version: number; doc: Record<string, unknown> }>(
    `SELECT version, doc FROM api_doc_version
      WHERE service_id = $1 AND ($2::int IS NULL OR version = $2)
      ORDER BY version DESC LIMIT 1`,
    [serviceId, version ?? null],
  );
  return r.rows[0] ?? null;
}

export type 받은곳 = { source: 'URL'; env: string } | { source: 'FILE'; fileName: string | null };

/**
 * 마지막 판과 지문이 다를 때만 판을 올린다. 같으면 created=false 와 마지막 판 번호.
 * 서비스 행을 잠가 같은 애플리케이션의 두 저장이 같은 번호를 만들지 않게 한다
 */
export async function 판올리기(
  serviceId: number,
  doc: Record<string, unknown>,
  곳: 받은곳,
  누가: string | null,
): Promise<{ version: number; created: boolean }> {
  const client = await (await db()).connect();
  try {
    await client.query('BEGIN');
    await client.query('SELECT 1 FROM service WHERE id = $1 FOR UPDATE', [serviceId]);
    const 마지막 = (
      await client.query<{ version: number; fingerprint: string }>(
        'SELECT version, fingerprint FROM api_doc_version WHERE service_id = $1 ORDER BY version DESC LIMIT 1',
        [serviceId],
      )
    ).rows[0];
    const fp = 지문(doc);
    if (마지막?.fingerprint === fp) {
      await client.query('COMMIT');
      return { version: 마지막.version, created: false };
    }
    const version = (마지막?.version ?? 0) + 1;
    await client.query(
      `INSERT INTO api_doc_version (service_id, version, fingerprint, doc, source, env, file_name, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [serviceId, version, fp, JSON.stringify(doc), 곳.source, 곳.source === 'URL' ? 곳.env : null, 곳.source === 'FILE' ? 곳.fileName : null, 누가],
    );
    await client.query('COMMIT');
    return { version, created: true };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * 마지막 판 기준 API × 응답 코드. 받은 적은 지금 활성인 케이스의 api_call_seen 줄만 센다 — 지운 케이스가 덮은 것으로 남지 않게.
 * 실행을 못 보는 사람이면 lastRunId 를 비운다(도메인/인증 §7 — 대시보드 coverage 와 같은 갈림)
 */
export async function 커버리지(serviceId: number, 실행보임: boolean) {
  const 판 = await 판원문(serviceId);
  if (판 === null) return { version: null, total: 0, covered: 0, operations: [] };
  const 본것 = await (await db()).query<{ method: string; path: string; status: number; run_id: string }>(
    `SELECT a.method, a.path, a.status, max(a.run_id) AS run_id
       FROM api_call_seen a JOIN test_case tc ON tc.tc_id = a.tc_id AND tc.is_active
      WHERE a.service_id = $1
      GROUP BY a.method, a.path, a.status`,
    [serviceId],
  );
  const 마지막실행 = new Map(본것.rows.map((r) => [`${r.method} ${r.path} ${r.status}`, Number(r.run_id)]));
  const operations = 커버리지틀(판.doc).map((op) => ({
    method: op.method,
    path: op.path,
    codes: op.codes.map((c) => {
      const runId = 마지막실행.get(`${op.method} ${op.path} ${c.status}`);
      return { status: c.status, seen: runId !== undefined, noShape: c.noShape, lastRunId: 실행보임 ? (runId ?? null) : null };
    }),
  }));
  const 코드들 = operations.flatMap((op) => op.codes);
  return { version: 판.version, total: 코드들.length, covered: 코드들.filter((c) => c.seen).length, operations };
}
