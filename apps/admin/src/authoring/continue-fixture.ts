// 남은 요구로 이어 작성 검사 셋(continue-detail · continue-reject · continue-copy)이 같이 쓰는 판 — 서비스 · 앱 · 반영 끝난 원본
// 검사 전용이다. 제품 코드는 import 하지 않는다. 지우기는 자기 service_id 로만 하고 그 service 행까지 치운다 (CLAUDE.md §3 fixture)

import Fastify, { type FastifyInstance, type LightMyRequestResponse } from 'fastify';

import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import authoringAgentRoutes from './agentRoutes.js';
import assetRoutes, { 자료폴더 } from './assets.js';
import authoringRoutes from './routes.js';

export interface 원본칸 {
  /** 반영된 작성 실행의 result.coverage. 없으면 셈 없는 옛 요청 */
  coverage?: unknown;
  /** 뿌리의 최신 실행. 기본은 성공한 반영 */
  최신?: 'MERGE_DONE' | 'AUTHOR_DONE' | 'MERGE_FAILED' | 'MERGE_PENDING';
  compare?: boolean;
  /** 원본의 입력 자료. 기본은 워드 하나 */
  자료?: ('FILE' | 'FIGMA')[];
  specText?: string;
  params?: Record<string, unknown>;
}

export interface 판 {
  app: FastifyInstance;
  서비스: number;
  접두사: string;
  에이전트: string;
  /** 원본을 만든다 — 뿌리(AUTHOR DONE)와 그 뒤 실행들. 입력 자료 행과 파일, 표시 사본 하나(복사되면 안 된다) */
  원본(칸?: 원본칸): Promise<{ 뿌리: number; 머지: number | null; 자료: number[] }>;
  이어작성(본문: Record<string, unknown>, 서비스접두사?: string): Promise<LightMyRequestResponse>;
  상세(id: number): Promise<Record<string, unknown>>;
  닫기(): Promise<void>;
}

const 셈있음 = { total: 3, cased: 1, held: 0, excluded: { '다음 요청': 1 }, missing: ['REQ-X-3'], later: ['REQ-X-2'] };
export { 셈있음 };

export async function 판차리기(접두사: string): Promise<판> {
  const { pool } = await import('../db/index.js');
  const 에이전트 = `${접두사.toLowerCase()}-에이전트`;
  const 자료뿌리 = await mkdtemp(join(tmpdir(), `${접두사.toLowerCase()}-assets-`));
  process.env.PLATFORM_ARTIFACTS_DIR = 자료뿌리;
  process.env.AUTHORING_AGENT_USER = 에이전트;

  const r = await pool.query<{ id: string }>(
    `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
          VALUES ($1, $2, '#3A5FCD', $3, $4)
     ON CONFLICT (prefix) DO UPDATE SET is_active = true RETURNING id`,
    [접두사, `${접두사} 이어 작성 검사용`, `https://github.com/acme/${접두사.toLowerCase()}`, 접두사.toLowerCase()],
  );
  const 서비스 = Number(r.rows[0]!.id);
  const 치우기 = async () => {
    await pool.query(
      'DELETE FROM authoring_asset WHERE request_id IN (SELECT id FROM authoring_request WHERE service_id = $1)',
      [서비스],
    );
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service_env WHERE service_id = $1', [서비스]);
  };
  await 치우기();
  await pool.query(
    `INSERT INTO service_env (service_id, env, base_url, login_id, login_password)
     VALUES ($1, 'qa', $2, 'tester', 'pw-7731')`,
    [서비스, `https://qa.${접두사.toLowerCase()}.test`],
  );

  const app = Fastify();
  app.decorateRequest('user', null);
  app.addHook('preHandler', async (req) => {
    req.user = { username: 에이전트, displayName: '이어 작성 검사', role: 'member', dashboard: 'read', mustChangePassword: false, services: [] };
  });
  await app.register(authoringRoutes, { prefix: '/api' });
  await app.register(authoringAgentRoutes, { prefix: '/api' });
  await app.register(assetRoutes, { prefix: '/api' });
  await app.ready();

  const 행넣기 = async (칸: Record<string, unknown>): Promise<number> => {
    const 이름들 = Object.keys(칸);
    const q = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, requested_by, requested_by_name, ${이름들.join(', ')})
       VALUES ($1, 'xcont', '이어 작성 검사', ${이름들.map((_, i) => `$${String(i + 2)}`).join(', ')}) RETURNING id`,
      [서비스, ...이름들.map((k) => 칸[k])],
    );
    return Number(q.rows[0]!.id);
  };

  return {
    app,
    서비스,
    접두사,
    에이전트,
    async 원본(칸 = {}) {
      const 대조 = 칸.compare === true;
      const 뿌리 = await 행넣기({
        kind: 'AUTHOR',
        status: 'DONE',
        pr_url: `https://github.com/acme/${접두사.toLowerCase()}/pull/1`,
        result: JSON.stringify(칸.coverage === undefined ? {} : { coverage: 칸.coverage }),
        spec_text: 칸.specText ?? null,
        params: JSON.stringify(칸.params ?? {}),
        compare: 대조,
        env: 대조 ? 'qa' : null,
        start_url: 대조 ? `https://qa.${접두사.toLowerCase()}.test/start` : null,
        finished_at: new Date(),
      });
      const 최신 = 칸.최신 ?? 'MERGE_DONE';
      let 머지: number | null = null;
      if (최신 !== 'AUTHOR_DONE') {
        const 상태 = 최신 === 'MERGE_DONE' ? 'DONE' : 최신 === 'MERGE_FAILED' ? 'FAILED' : 'PENDING';
        머지 = await 행넣기({ kind: 'MERGE', source_id: 뿌리, status: 상태, spec_text: `머지 요청 — 원본 #${String(뿌리)}` });
      }
      const 자료: number[] = [];
      const 폴더 = 자료폴더(뿌리);
      await mkdir(폴더, { recursive: true });
      for (const [i, 종류] of (칸.자료 ?? ['FILE']).entries()) {
        const 피그마 = 종류 === 'FIGMA' ? `https://www.figma.com/design/Key${String(i)}/` : null;
        const q = await pool.query<{ id: string }>(
          `INSERT INTO authoring_asset (request_id, position, kind, name, figma_url, size)
           VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
          [뿌리, i + 1, 종류, 피그마 ?? `기획서${String(i)}.docx`, 피그마, 피그마 === null ? 5 : null],
        );
        const id = Number(q.rows[0]!.id);
        자료.push(id);
        if (피그마 === null) await writeFile(join(폴더, `${String(id)}.docx`), `본문${String(i)}`);
      }
      if (자료.length > 0) {
        await pool.query(
          `INSERT INTO authoring_asset (request_id, position, kind, name, size, role, source_asset_id)
           VALUES ($1, 99, 'FILE', '기획서0-표시.docx', 3, 'MARKED', $2)`,
          [뿌리, 자료[0]],
        );
      }
      return { 뿌리, 머지, 자료 };
    },
    이어작성: (본문, 서비스접두사 = 접두사) =>
      app.inject({ method: 'POST', url: `/api/authoring/requests?service=${서비스접두사}`, payload: 본문 }),
    async 상세(id) {
      return (await app.inject({ method: 'GET', url: `/api/authoring/requests/${String(id)}?service=${접두사}` })).json();
    },
    async 닫기() {
      await 치우기();
      await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
      await app.close();
      await rm(자료뿌리, { recursive: true, force: true });
    },
  };
}
