// 서비스를 만들고 고치는 곳과 설정 공용 도우미 (SPEC §7 설정 API · §8.8). 계정은 users.ts 다.
// 둘 다 **지우지 않는다** — is_active 를 내릴 뿐이다. 지우면 그것으로 돌린 과거 실행의 증적이 흔들린다

import type { Pool, PoolClient } from 'pg';

import { 종류조건 } from '../execution/runKind.js';

import { type 대상서버, type 대상서버입력, 대상서버넣기, 대상서버칸식 } from './envs.js';
import { 설정오류 } from './errors.js';

export { 설정오류, type 오류코드 } from './errors.js';

// 정기 실행 설정 한 벌. 시각은 시간대 안의 HH:MM 이다 (SPEC 공통/6-인프라 §9.2 · 도메인/인증 §7)
export interface 정기실행 {
  at: string;
  tz: string;
  env: string;
}

export interface 서비스행 {
  id: number;
  prefix: string;
  name: string;
  color: string;
  projectId: number;
  projectName: string;
  testsRepo: string;
  testsDir: string;
  /** 만들 때 정하고 바꾸지 않는다 (도메인/API §3.8) */
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  apiDocPath: string | null;
  apiDocEnv: string | null;
  isActive: boolean;
  caseCount: number;
  envs: 대상서버[];
  hasSlackWebhook: boolean;
  hasFigmaToken: boolean;
  crawlExclude: string[];
  schedule: 정기실행 | null;
  /** 마지막으로 돈 때와 그 뒤 스케줄러가 만든 실행. 꺼도 남는다 */
  lastScheduled: { at: string; runIds: number[] } | null;
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

// 케이스 수는 test_case 에 서비스 칸이 없어 접두사로 센다. 그 표에는 서비스 칸이 없고 앞으로도 없다 (SPEC §6)
const 서비스들 = `
  SELECT s.id, s.prefix, s.name, s.color, s.project_id, p.name AS project_name, s.tests_repo, s.tests_dir, s.is_active, s.crawl_exclude,
         s.kind, s.api_doc_path, s.api_doc_env,
         to_char(s.schedule_at, 'HH24:MI') AS schedule_at, s.schedule_tz, s.schedule_env, s.schedule_last,
         -- 같은 점검이 만든 UI · 기능 실행이 둘 다 마지막으로 돈 때 뒤에 생긴다 (SPEC 공통/6-인프라 §9.2)
         (SELECT COALESCE(json_agg(r.run_id ORDER BY r.run_id), '[]') FROM test_run r
           WHERE r.service_id = s.id AND r.triggered_by = '스케줄러' AND r.started_at >= s.schedule_last
             AND ${종류조건('case')}) AS scheduled_run_ids,
         (s.slack_webhook IS NOT NULL AND s.slack_webhook <> '') AS has_slack_webhook,
         (s.figma_token IS NOT NULL AND s.figma_token <> '') AS has_figma_token,
         (SELECT count(*) FROM test_case tc
           WHERE tc.tc_id LIKE s.prefix || '-%' AND tc.is_active) AS case_count,
         COALESCE(json_agg(${대상서버칸식} ORDER BY e.env) FILTER (WHERE e.env IS NOT NULL), '[]') AS envs
    FROM service s
    JOIN project p ON p.id = s.project_id
    LEFT JOIN service_env e ON e.service_id = s.id
   GROUP BY s.id, p.id
   ORDER BY s.prefix`;

interface 서비스원행 {
  id: string;
  prefix: string;
  name: string;
  color: string;
  project_id: string;
  project_name: string;
  tests_repo: string;
  tests_dir: string;
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
  api_doc_path: string | null;
  api_doc_env: string | null;
  is_active: boolean;
  has_slack_webhook: boolean;
  has_figma_token: boolean;
  crawl_exclude: string[];
  schedule_at: string | null;
  schedule_tz: string | null;
  schedule_env: string | null;
  schedule_last: Date | null;
  // json_agg 라 숫자로 온다
  scheduled_run_ids: number[];
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
    projectId: Number(r.project_id),
    projectName: r.project_name,
    testsRepo: r.tests_repo,
    testsDir: r.tests_dir,
    kind: r.kind,
    apiDocPath: r.api_doc_path,
    apiDocEnv: r.api_doc_env,
    isActive: r.is_active,
    caseCount: Number(r.case_count),
    envs: r.envs,
    // 웹훅 주소 자체는 응답에 담지 않는다. 비밀값이라 설정됐는지만 준다 (SPEC §7 · §8.8)
    hasSlackWebhook: r.has_slack_webhook,
    // 피그마 토큰도 같다 (2026-09-23, 도메인/인증 §8.8)
    hasFigmaToken: r.has_figma_token,
    crawlExclude: r.crawl_exclude,
    // 셋은 DB 가 같이 비거나 같이 차게 막는다 (마이그레이션 20261012000001)
    schedule: r.schedule_at === null ? null : { at: r.schedule_at, tz: r.schedule_tz ?? '', env: r.schedule_env ?? '' },
    lastScheduled:
      r.schedule_last === null ? null : { at: r.schedule_last.toISOString(), runIds: r.scheduled_run_ids },
  }));
}

export interface 서비스입력 {
  prefix: string;
  name: string;
  color: string;
  /** 설정 API 는 꼭 받는다. 빠지면 DB 트리거가 같은 이름 프로젝트를 붙인다 — 첫 서비스를 만드는 scripts/add-service.ts 의 입구다 */
  projectId?: number;
  testsRepo: string;
  testsDir: string;
  envs: 대상서버입력[];
  slackWebhook?: string;
  figmaToken?: string;
  crawlExclude?: string[];
  kind?: 'SCREEN' | 'APP' | 'GAME' | 'API';
  apiDocPath?: string | null;
  apiDocEnv?: string | null;
}

async function 프로젝트확인(client: PoolClient, id: number): Promise<void> {
  const rows = await client.query('SELECT 1 FROM project WHERE id = $1', [id]);
  if (rows.rowCount === 0) throw new 설정오류('PROJECT_NOT_FOUND');
}

// 권한 배정은 프로젝트를 만들 때 한다 (projects.ts). 여기서는 하지 않는다 — 그 프로젝트 권한자에게 새 애플리케이션이 바로 열린다 (도메인/인증 §3.5)
export async function 서비스만들기(입력: 서비스입력): Promise<number> {
  return 한묶음(async (client) => {
    if (입력.projectId !== undefined) await 프로젝트확인(client, 입력.projectId);
    const rows = await client.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir, slack_webhook, figma_token, crawl_exclude, project_id, kind, api_doc_path, api_doc_env)
            VALUES ($1, $2, $3, $4, $5, NULLIF($6, ''), NULLIF($7, ''), $8, $9, $10, $11, $12)
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
        입력.crawlExclude ?? [],
        입력.projectId ?? null,
        입력.kind ?? 'SCREEN',
        입력.apiDocPath ?? null,
        입력.apiDocEnv ?? null,
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
  /** 다른 프로젝트로 옮긴다 */
  projectId?: number;
  testsRepo?: string;
  testsDir?: string;
  isActive?: boolean;
  envs?: 대상서버입력[];
  slackWebhook?: string;
  figmaToken?: string;
  crawlExclude?: string[];
  /** 안 보내면 그대로, null 이면 끈다 */
  schedule?: 정기실행 | null;
  /** 둘 다 안 보내면 그대로, null 이면 비운다 */
  apiDocPath?: string | null;
  apiDocEnv?: string | null;
}

/**
 * 정기 실행의 대상 서버를 대 보려고 읽는다 — 지금 대상 서버 줄과 켜 둔 정기 실행의 대상 서버.
 * 서비스가 없으면 null 이다 — 고치기가 404 를 낸다 (도메인/인증 §7 계약 변경 블록)
 */
export async function 정기실행재료(id: number): Promise<{ 키들: string[]; 대상서버: string | null } | null> {
  const pool = await db();
  const r = await pool.query<{ envs: string[]; schedule_env: string | null }>(
    `SELECT s.schedule_env, COALESCE(array_agg(e.env) FILTER (WHERE e.env IS NOT NULL), '{}') AS envs
       FROM service s LEFT JOIN service_env e ON e.service_id = s.id
      WHERE s.id = $1
      GROUP BY s.id`,
    [id],
  );
  const 줄 = r.rows[0];
  return 줄 === undefined ? null : { 키들: 줄.envs, 대상서버: 줄.schedule_env };
}

export async function 서비스고치기(id: number, 수정: 서비스수정): Promise<void> {
  await 한묶음(async (client) => {
    if (수정.projectId !== undefined) await 프로젝트확인(client, 수정.projectId);
    const 옛프로젝트 =
      수정.projectId === undefined
        ? undefined
        : (await client.query<{ project_id: string }>('SELECT project_id FROM service WHERE id = $1', [id])).rows[0]?.project_id;
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
                                 ELSE $8 END,
              crawl_exclude = COALESCE($9::text[], crawl_exclude),
              schedule_at  = CASE WHEN $10 THEN $11::time ELSE schedule_at END,
              schedule_tz  = CASE WHEN $10 THEN $12 ELSE schedule_tz END,
              schedule_env = CASE WHEN $10 THEN $13 ELSE schedule_env END,
              project_id = COALESCE($14, project_id),
              api_doc_path = CASE WHEN $15 THEN $16 ELSE api_doc_path END,
              api_doc_env  = CASE WHEN $17 THEN $18 ELSE api_doc_env END
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
        수정.crawlExclude ?? null,
        수정.schedule !== undefined,
        수정.schedule?.at ?? null,
        수정.schedule?.tz ?? null,
        수정.schedule?.env ?? null,
        수정.projectId ?? null,
        수정.apiDocPath !== undefined,
        수정.apiDocPath ?? null,
        수정.apiDocEnv !== undefined,
        수정.apiDocEnv ?? null,
      ],
    );
    if (rows.rowCount === 0) throw new 설정오류('NOT_FOUND');
    // 옮겨서 비게 된 프로젝트는 서비스를 지울 때와 같이 지운다 — 처음 옮길 때 서비스마다 같은 이름 프로젝트가 있어 안 지우면 빈 프로젝트가 쌓인다
    if (옛프로젝트 !== undefined) {
      await client.query(
        'DELETE FROM project p WHERE p.id = $1 AND NOT EXISTS (SELECT 1 FROM service s WHERE s.project_id = p.id)',
        [옛프로젝트],
      );
    }
    if (수정.envs !== undefined) await 대상서버넣기(client, id, 수정.envs);
  });
}
