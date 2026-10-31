// 프로젝트 배포 신호 — deploy.sh 가 프로젝트 배포 열쇠(pdk_)로 한 번 부른다. 받으면 애플리케이션마다 빌드 실행을 뒤에서 건다 (도메인/BTS §3.12 「새 기능 바퀴」 · §7)
// 문(auth/gate.ts)이 사람 판정 앞에서 이 열쇠로만 판정한다 — 열쇠 하나는 그 프로젝트 배포 신호 하나만 연다

import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';

import { 토큰해시 } from '../auth/agentToken.js';
import { 사용자와해시 } from '../auth/store.js';
import { 최신빌드 } from '../execution/buildFile.js';
import { 노트사건쌓기 } from '../projectNote/events.js';

import type { 부르기함수 } from './client.js';
import { 배포실행걸기, type 배포할앱 } from './deployFlow.js';

async function db(): Promise<Pool> {
  const { pool } = await import('../db/index.js');
  return pool;
}

export const 배포틀 = '/api/projects/:projectId/deploys';

/** 헤더가 배포 열쇠를 내밀었나 — 모양만 본다. 다른 통로에서 이것이 오면 문이 403 으로 막는다 */
export function 배포열쇠인가(authorization: string | undefined): boolean {
  return authorization !== undefined && authorization.startsWith('Bearer pdk_');
}

declare module 'fastify' {
  interface FastifyRequest {
    /** 배포 열쇠가 연 프로젝트 — 문이 싣는다 */
    btsDeployKey: { projectId: number } | null;
  }
}

/** 배포 신호의 문. 열쇠가 없거나 틀리거나 만든 admin 이 꺼졌으면 401 — 세션으로 넘어가지 않는다(CI 토큰과 같다) */
export async function 배포열쇠문(req: FastifyRequest, reply: FastifyReply): Promise<void> {
  const [방식, 값, ...남음] = (req.headers.authorization ?? '').split(' ');
  if (방식 === 'Bearer' && 값?.startsWith('pdk_') && 남음.length === 0) {
    const 행 = (await (await db()).query<{ project_id: string; deploy_key_by: string }>(
      'SELECT project_id, deploy_key_by FROM bts_link WHERE deploy_key_hash = $1',
      [토큰해시(값)],
    )).rows[0];
    const 사람 = 행 === undefined ? null : await 사용자와해시(행.deploy_key_by);
    if (행 !== undefined && 사람?.user.role === 'admin') {
      req.btsDeployKey = { projectId: Number(행.project_id) };
      return;
    }
  }
  await reply.code(401).send({ error: 'UNAUTHENTICATED' });
}

const 몸틀 = z
  .object({
    build: z.unknown(),
    env: z.string().min(1).max(100).optional(),
    rollback: z.boolean().default(false),
    rollbackKeys: z.array(z.string().min(1).max(100)).max(200).default([]),
    services: z.array(z.string().min(1).max(50)).min(1).max(100).optional(),
  })
  .strict();
// 빌드 줄 번호와 같은 꼴 — 웹 · API 는 이 번호로 빌드 줄을 세운다(execution/buildRoutes.ts 빌드번호)
const 빌드번호 = z.string().regex(/^[A-Za-z0-9._+-]{1,100}$/);

type 거절 = { status: 400 | 404 | 409; error: string; detail?: string };
const 거절 = (status: 거절['status'], error: string, detail?: string): 거절 => ({ status, error, ...(detail === undefined ? {} : { detail }) });

interface 앱행 {
  id: string;
  prefix: string;
  kind: 'SCREEN' | 'APP' | 'GAME' | 'API';
}

/**
 * 애플리케이션마다 대상 서버와 빌드를 고른다. 하나라도 막히면 아무것도 걸지 않는다 — deploy.sh 가 실패로 끝나 사람이 바로 안다.
 * 대상 서버는 env 가 있으면 그 이름, 없으면 실서비스 아닌 줄 하나(§3.12 「새 기능 바퀴」 3)
 */
async function 앱고르기(pool: Pool, 앱들: 앱행[], env: string | undefined, buildNo: string): Promise<배포할앱[] | 거절> {
  const 고름: 배포할앱[] = [];
  for (const 앱 of 앱들) {
    const 줄 = (await pool.query<{ env: string; is_prod: boolean }>('SELECT env, is_prod FROM service_env WHERE service_id = $1', [앱.id])).rows;
    let 그줄: string;
    if (env !== undefined) {
      const 찾음 = 줄.find((e) => e.env === env);
      if (찾음 === undefined) return 거절(404, 'UNKNOWN_ENV', `${앱.prefix}: ${env}`);
      // 게임 · 앱 케이스 준비가 상태를 바꿔 운영 서버를 망가뜨린다 — 실서비스 서버에는 빌드 실행을 걸지 않는다(실행.md §3.11)
      if (찾음.is_prod) return 거절(400, 'PROD_ENV_BLOCKED', `${앱.prefix}: ${env}`);
      그줄 = env;
    } else {
      const 고를것 = 줄.filter((e) => !e.is_prod);
      if (고를것.length > 1) return 거절(400, 'ENV_REQUIRED', `${앱.prefix}: ${고를것.map((e) => e.env).join(', ')}`);
      if (고를것.length === 0) return 줄.length > 0 ? 거절(400, 'PROD_ENV_BLOCKED', 앱.prefix) : 거절(404, 'UNKNOWN_ENV', 앱.prefix);
      그줄 = 고를것[0]!.env;
    }
    if (앱.kind === 'APP' || 앱.kind === 'GAME') {
      // 앱 · 게임은 CI 가 올린 그 줄의 최신 APK 로 돈다. 없으면 깔 것이 없다(BTS-F5-01 시작 질문 2)
      const 빌드 = await 최신빌드(pool, Number(앱.id), 그줄);
      if (빌드 === null) return 거절(400, 'NO_BUILD', `${앱.prefix}: ${그줄}`);
      고름.push({ serviceId: Number(앱.id), prefix: 앱.prefix, env: 그줄, buildId: 빌드.id, buildNo: 빌드.buildNo });
    } else {
      고름.push({ serviceId: Number(앱.id), prefix: 앱.prefix, env: 그줄, buildId: null, buildNo });
    }
  }
  return 고름;
}

/** `부르기` 는 검사가 가짜 BTS 를 넣는 자리다(inbound.ts 와 같다) */
export default async function btsDeployRoutes(app: FastifyInstance, opts: { 부르기?: 부르기함수 }): Promise<void> {
  app.post<{ Params: { projectId: string } }>('/projects/:projectId/deploys', async (req, reply) => {
    const 열쇠 = req.btsDeployKey;
    if (열쇠 === null) return reply.code(401).send({ error: 'UNAUTHENTICATED' });
    // 열쇠 하나는 그 프로젝트 신호 하나만 연다 — 다른 프로젝트 번호는 다른 통로와 같다
    if (String(열쇠.projectId) !== req.params.projectId) return reply.code(403).send({ error: 'AGENT_TOKEN_SCOPE' });
    const 보냄 = (r: 거절) => reply.code(r.status).send({ error: r.error, ...(r.detail === undefined ? {} : { detail: r.detail }) });

    const 몸 = 몸틀.safeParse(req.body ?? {});
    if (!몸.success) return 보냄(거절(400, 'INVALID_REQUEST', 몸.error.issues.map((i) => i.path.join('.')).join(', ')));
    const 빌드 = 빌드번호.safeParse(몸.data.build);
    if (!빌드.success) return 보냄(거절(400, 'BAD_BUILD', '영문 · 숫자 · . _ + - 1~100자'));
    const buildNo = 빌드.data;

    const pool = await db();
    const projectId = 열쇠.projectId;
    const 연결 = (await pool.query<{ updated_by: string }>('SELECT updated_by FROM bts_link WHERE project_id = $1', [projectId])).rows[0];
    if (연결 === undefined) return 보냄(거절(409, 'NOT_LINKED'));
    // 서버가 세우는 일의 「누가」는 연결을 마지막으로 저장한 admin 이다 — 그 계정이 꺼지면 연결을 다시 저장해야 돈다(§3.12 「새 기능 바퀴」 7)
    const 주인 = await 사용자와해시(연결.updated_by);
    if (주인?.user.role !== 'admin') return 보냄(거절(409, 'NOT_LINKED', 'BTS 연결을 저장한 계정이 꺼져 있습니다 — 설정 › BTS 연결을 다시 저장합니다'));

    // deploy.sh 가 같은 빌드로 다시 불러도 새로 걸지 않는다
    const 앞 = (await pool.query<{ id: string }>('SELECT id FROM bts_deploy WHERE project_id = $1 AND build_no = $2', [projectId, buildNo])).rows[0];
    if (앞 !== undefined) return reply.code(200).send({ deployId: Number(앞.id) });

    const 다 = (await pool.query<앱행>('SELECT id, prefix, kind FROM service WHERE project_id = $1 AND is_active ORDER BY id', [projectId])).rows;
    const 이름들 = 몸.data.services;
    const 밖 = 이름들?.find((p) => !다.some((a) => a.prefix === p));
    if (밖 !== undefined) return 보냄(거절(400, 'UNKNOWN_SERVICE', 밖));
    const 앱들 = 이름들 === undefined ? 다 : 다.filter((a) => 이름들.includes(a.prefix));
    if (앱들.length === 0) return 보냄(거절(400, 'UNKNOWN_SERVICE', '돌릴 애플리케이션이 없습니다'));
    const 고름 = await 앱고르기(pool, 앱들, 몸.data.env, buildNo);
    if (!Array.isArray(고름)) return 보냄(고름);

    const 넣음 = await pool.query<{ id: string }>(
      `INSERT INTO bts_deploy (project_id, build_no, rollback, rollback_keys, service_ids) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (project_id, build_no) DO NOTHING RETURNING id`,
      [projectId, buildNo, 몸.data.rollback, 몸.data.rollbackKeys, 고름.map((a) => a.serviceId)],
    );
    if (넣음.rows[0] === undefined) {
      // 같은 빌드가 거의 같이 두 번 왔다 — 먼저 넣은 쪽이 건다
      const 먼저 = (await pool.query<{ id: string }>('SELECT id FROM bts_deploy WHERE project_id = $1 AND build_no = $2', [projectId, buildNo])).rows[0]!;
      return reply.code(200).send({ deployId: Number(먼저.id) });
    }
    const deployId = Number(넣음.rows[0].id);
    // 노트 사건이 깨져도 배포는 돈다 — 사건 하나를 잃는 쪽이 배포 신호를 실패시키는 쪽보다 낫다
    await 노트사건쌓기(projectId, 'DEPLOY', { build: buildNo, rollback: 몸.data.rollback, rollbackKeys: 몸.data.rollbackKeys, services: 고름.map((a) => a.prefix) }).catch(
      (err: unknown) => req.log.error(`[bts] 배포 ${String(deployId)} 노트 사건을 못 쌓았다: ${err instanceof Error ? err.message : String(err)}`),
    );
    // 스모크 · 맡기는 뒤에서 돈다(202). 깨지면 잡을 곳이 없어 서버 기록으로만 남긴다 — 배포 줄은 FAILED 로 남는다
    void 배포실행걸기(deployId, 고름, { username: 연결.updated_by, displayName: `BTS · ${주인.user.displayName}` }, opts.부르기).catch((err: unknown) =>
      req.log.error(`[bts] ${err instanceof Error ? err.message : String(err)}`),
    );
    return reply.code(202).send({ deployId });
  });
}
