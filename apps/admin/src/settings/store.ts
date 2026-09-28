// 서비스를 만들고 고치는 곳과 설정 공용 도우미 (SPEC §7 설정 API · §8.8). 계정은 users.ts 다.
// 둘 다 **지우지 않는다** — is_active 를 내릴 뿐이다. 지우면 그것으로 돌린 과거 실행의 증적이 흔들린다

import type { Pool, PoolClient } from 'pg';

export type 오류코드 = 'PREFIX_TAKEN' | 'USERNAME_TAKEN' | 'LAST_ADMIN' | 'NOT_FOUND';

export class 설정오류 extends Error {
  constructor(readonly code: 오류코드) {
    super(code);
  }
}

// 응답 한 줄. 비밀번호는 되돌려 보여주지 않는다 — 웹훅·피그마 토큰과 같은 규칙 (SPEC 도메인/인증 §7)
export interface 대상서버 {
  env: string;
  baseUrl: string;
  loginId: string | null;
  hasLoginPassword: boolean;
}

// 입력 한 줄. 계정 칸 규칙은 routes.ts 의 스키마 옆에 적었다
export interface 대상서버입력 {
  env: string;
  baseUrl: string;
  loginId?: string | null;
  loginPassword?: string | null;
}

export interface 서비스행 {
  id: number;
  prefix: string;
  name: string;
  color: string;
  testsRepo: string;
  testsDir: string;
  isActive: boolean;
  caseCount: number;
  envs: 대상서버[];
  hasSlackWebhook: boolean;
  hasFigmaToken: boolean;
}

export async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export async function 한묶음<T>(일: (client: PoolClient) => Promise<T>): Promise<T> {
  const pool = await db();
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const 결과 = await 일(client);
    await client.query('COMMIT');
    return 결과;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

function 계정칸(보낸것: string | null | undefined, 옛것: string | null): string | null {
  if (보낸것 === undefined) return 옛것;
  return 보낸것 === null || 보낸것.trim() === '' ? null : 보낸것;
}

async function 대상서버넣기(client: PoolClient, serviceId: number, envs: 대상서버입력[]): Promise<void> {
  // 지우고 다시 넣으므로 계정을 먼저 읽어 둔다. 화면은 비밀번호를 받은 적이 없어 되돌려 보낼 수 없다.
  // 같은 client 로 읽는다 — 서비스고치기가 서비스 행을 먼저 잠가 같은 서비스의 저장이 겹치지 않는다
  const 옛것 = await client.query<{ env: string; login_id: string | null; login_password: string | null }>(
    'SELECT env, login_id, login_password FROM service_env WHERE service_id = $1',
    [serviceId],
  );
  const 옛계정 = new Map(옛것.rows.map((r) => [r.env, r]));
  await client.query('DELETE FROM service_env WHERE service_id = $1', [serviceId]);
  for (const { env, baseUrl, loginId, loginPassword } of envs) {
    // 이름이 같은 줄만 이어받는다. 이름을 바꾸면 새 줄이라 계정을 다시 넣는다 (SPEC 도메인/인증 §7)
    const 전 = 옛계정.get(env);
    await client.query(
      'INSERT INTO service_env (service_id, env, base_url, login_id, login_password) VALUES ($1, $2, $3, $4, $5)',
      [serviceId, env, baseUrl, 계정칸(loginId, 전?.login_id ?? null), 계정칸(loginPassword, 전?.login_password ?? null)],
    );
  }
}

// 케이스 수는 test_case 에 서비스 칸이 없어 접두사로 센다. 그 표에는 서비스 칸이 없고 앞으로도 없다 (SPEC §6)
const 서비스들 = `
  SELECT s.id, s.prefix, s.name, s.color, s.tests_repo, s.tests_dir, s.is_active,
         (s.slack_webhook IS NOT NULL AND s.slack_webhook <> '') AS has_slack_webhook,
         (s.figma_token IS NOT NULL AND s.figma_token <> '') AS has_figma_token,
         (SELECT count(*) FROM test_case tc
           WHERE tc.tc_id LIKE s.prefix || '-%' AND tc.is_active) AS case_count,
         COALESCE(
           json_agg(json_build_object('env', e.env, 'baseUrl', e.base_url, 'loginId', e.login_id,
                                      'hasLoginPassword', e.login_password IS NOT NULL AND e.login_password <> '')
                    ORDER BY e.env)
             FILTER (WHERE e.env IS NOT NULL),
           '[]'
         ) AS envs
    FROM service s
    LEFT JOIN service_env e ON e.service_id = s.id
   GROUP BY s.id
   ORDER BY s.prefix`;

interface 서비스원행 {
  id: string;
  prefix: string;
  name: string;
  color: string;
  tests_repo: string;
  tests_dir: string;
  is_active: boolean;
  has_slack_webhook: boolean;
  has_figma_token: boolean;
  case_count: string;
  envs: 대상서버[];
}

export async function 서비스목록(): Promise<서비스행[]> {
  const pool = await db();
  const rows = await pool.query<서비스원행>(서비스들);
  return rows.rows.map((r) => ({
    // BIGSERIAL 은 pg 가 글자열로 준다. 경계에서 숫자로 바꾼다 (execution/store.ts 와 같은 규약)
    id: Number(r.id),
    prefix: r.prefix,
    name: r.name,
    color: r.color,
    testsRepo: r.tests_repo,
    testsDir: r.tests_dir,
    isActive: r.is_active,
    caseCount: Number(r.case_count),
    envs: r.envs,
    // 웹훅 주소 자체는 응답에 담지 않는다. 비밀값이라 설정됐는지만 준다 (SPEC §7 · §8.8)
    hasSlackWebhook: r.has_slack_webhook,
    // 피그마 토큰도 같다 (2026-09-23, 도메인/인증 §8.8)
    hasFigmaToken: r.has_figma_token,
  }));
}

export interface 서비스입력 {
  prefix: string;
  name: string;
  color: string;
  testsRepo: string;
  testsDir: string;
  envs: 대상서버입력[];
  slackWebhook?: string;
  figmaToken?: string;
}

export async function 서비스만들기(입력: 서비스입력): Promise<number> {
  return 한묶음(async (client) => {
    const rows = await client.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, slack_webhook, figma_token)
            VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''))
       ON CONFLICT (prefix) DO NOTHING
         RETURNING id`,
      [
        입력.prefix,
        입력.name,
        입력.color,
        입력.testsRepo,
        입력.testsDir,
        입력.slackWebhook ?? '',
        입력.figmaToken ?? '',
      ],
    );
    const id = rows.rows[0]?.id === undefined ? undefined : Number(rows.rows[0].id);
    // 접두사는 tcId 안에 이미 박혀 있다. 겹치면 그 케이스가 어느 서비스 것인지 갈 수 없다 (SPEC §8.8)
    if (id === undefined) throw new 설정오류('PREFIX_TAKEN');

    await 대상서버넣기(client, id, 입력.envs);
    return id;
  });
}

export interface 서비스수정 {
  name?: string;
  color?: string;
  testsRepo?: string;
  testsDir?: string;
  isActive?: boolean;
  envs?: 대상서버입력[];
  slackWebhook?: string;
  figmaToken?: string;
}

export async function 서비스고치기(id: number, 수정: 서비스수정): Promise<void> {
  await 한묶음(async (client) => {
    const rows = await client.query(
      `UPDATE service
          SET name       = COALESCE($2, name),
              color      = COALESCE($3, color),
              tests_repo = COALESCE($4, tests_repo),
              tests_dir  = COALESCE($5, tests_dir),
              is_active  = COALESCE($6, is_active),
              slack_webhook = CASE WHEN $7::text IS NULL THEN slack_webhook
                                   WHEN $7 = '' THEN NULL
                                   ELSE $7 END,
              figma_token = CASE WHEN $8::text IS NULL THEN figma_token
                                 WHEN $8 = '' THEN NULL
                                 ELSE $8 END
        WHERE id = $1`,
      [
        id,
        수정.name ?? null,
        수정.color ?? null,
        수정.testsRepo ?? null,
        수정.testsDir ?? null,
        수정.isActive ?? null,
        수정.slackWebhook ?? null,
        수정.figmaToken ?? null,
      ],
    );
    if (rows.rowCount === 0) throw new 설정오류('NOT_FOUND');
    if (수정.envs !== undefined) await 대상서버넣기(client, id, 수정.envs);
  });
}
