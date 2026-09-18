// 증적 문서의 「만드는 중 → 끝남」을 DB가 기억한다 (SPEC §3.3)
// 리포팅 컨텍스트는 evidence_document 외 어떤 테이블에도 쓰지 않는다

import type { Pool } from 'pg';

export type EvidenceFormat = 'PDF' | 'XLSX' | 'HTML';
export type EvidenceStatus = 'PENDING' | 'READY' | 'FAILED';

export interface EvidenceRow {
  id: number;
  runId: number;
  format: EvidenceFormat;
  status: EvidenceStatus;
  filePath: string | null;
  error: string | null;
  generatedAt: string;
}

/** 이미 만드는 중이면 EvidenceBusyError 를 던진다 */
export class EvidenceBusyError extends Error {
  constructor(runId: number, format: EvidenceFormat) {
    super(`실행 ${runId}의 ${format} 증적을 이미 만드는 중이다`);
    this.name = 'EvidenceBusyError';
  }
}

// DATABASE_URL이 없으면 db/index.ts가 import 시점에 던진다. 풀은 실제로 쓸 때 가져온다 (execution/store.ts와 같은 방식)
async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

const COLUMNS = 'id, run_id, format, status, file_path, error, generated_at';

interface RawDocument {
  id: string;
  run_id: string;
  format: EvidenceFormat;
  status: EvidenceStatus;
  file_path: string | null;
  error: string | null;
  generated_at: Date;
}

// BIGSERIAL은 pg가 문자열로 준다. 경계에서 한 번만 숫자로 바꾼다
const toDocument = (r: RawDocument): EvidenceRow => ({
  id: Number(r.id),
  runId: Number(r.run_id),
  format: r.format,
  status: r.status,
  filePath: r.file_path,
  error: r.error,
  generatedAt: r.generated_at.toISOString(),
});

// 부분 유일 인덱스(status = 'PENDING')가 막은 것인지 다른 고장인지 라우트가 문자열로 가려내지 않게 한다
const isUniqueViolation = (err: unknown): boolean =>
  typeof err === 'object' && err !== null && 'code' in err && (err as { code: unknown }).code === '23505';

// 같은 실행·같은 형식을 동시에 두 번 만들지 못하게 하는 것은 DB의 부분 유일 인덱스다.
// 앱에서 먼저 SELECT로 확인하면 그 사이에 끼어드는 요청을 못 막는다
export async function claim(runId: number, format: EvidenceFormat): Promise<EvidenceRow> {
  const pool = await db();
  try {
    const rows = await pool.query<RawDocument>(
      `INSERT INTO evidence_document (run_id, format, status) VALUES ($1, $2, 'PENDING') RETURNING ${COLUMNS}`,
      [runId, format],
    );
    return toDocument(rows.rows[0]);
  } catch (err) {
    if (isUniqueViolation(err)) throw new EvidenceBusyError(runId, format);
    // 없는 run_id의 외래키 위반 같은 것은 그대로 올린다. 라우트가 먼저 404로 막을 몫이다
    throw err;
  }
}

export async function finish(id: number, filePath: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE evidence_document SET status = 'READY', file_path = $2, error = NULL, finished_at = now() WHERE id = $1",
    [id, filePath],
  );
}

// FAILED로 닫아야 PENDING이 풀려 같은 형식을 다시 만들 수 있다 — 화면의 「다시 만들기」가 여기에 걸려 있다
export async function fail(id: number, reason: string): Promise<void> {
  const pool = await db();
  await pool.query(
    "UPDATE evidence_document SET status = 'FAILED', file_path = NULL, error = $2, finished_at = now() WHERE id = $1",
    [id, reason],
  );
}

export async function findDocument(id: number): Promise<EvidenceRow | null> {
  const pool = await db();
  const rows = await pool.query<RawDocument>(`SELECT ${COLUMNS} FROM evidence_document WHERE id = $1`, [id]);
  const row = rows.rows[0];
  return row === undefined ? null : toDocument(row);
}
