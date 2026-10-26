// 작성 목록 줄의 summary 자료 · todo · ?todo=1 검사 (SPEC 도메인/작성 §7 목록 · 2026-10-19 ⑫ 점검 11.2 · 2026-10-26 WEB-F6-06)

import Fastify, { type FastifyInstance } from 'fastify';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import authoringRoutes from './routes.js';

const 연결 = process.env.DATABASE_URL;
const 접두사 = 'XWI';

const 보류 = {
  tcId: 'XWI-FN-001',
  name: '쿠폰 적용',
  file: 'tests/xwi/coupon.spec.ts',
  kind: 'ON_HOLD',
  reason: '쿠폰 번호가 필요',
  fields: [{ side: 'params', key: 'coupon', description: '쿠폰 번호', type: 'string' }],
};
const 겹침 = { tcId: 'XWI-FN-002', name: '로그인', file: 'tests/xwi/login.spec.ts', kinds: ['NAME'], with: [{ tcId: 'XWI-FN-009', name: '로그인', file: 'tests/xwi/a.spec.ts' }] };

describe.skipIf(연결 === undefined)('작성 목록 summary 자료 · todo', () => {
  let app: FastifyInstance;
  let 서비스 = 0;

  async function 행(칸: { kind?: string; sourceId?: number; status: string; result?: object; heldInput?: object; discarded?: boolean }): Promise<number> {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO authoring_request (service_id, kind, source_id, requested_by, requested_by_name, status, claimed_by, result, held_input, discarded_at, started_at, finished_at)
       VALUES ($1, $2, $3, 'xwi', '목록 검사', $4, CASE WHEN $4 = 'PENDING' THEN NULL ELSE 'xwi' END, $5, $6,
               CASE WHEN $7 THEN now() ELSE NULL END, now(), CASE WHEN $4 IN ('PENDING', 'RUNNING') THEN NULL ELSE now() END)
       RETURNING id`,
      [서비스, 칸.kind ?? 'AUTHOR', 칸.sourceId ?? null, 칸.status, 칸.result === undefined ? null : JSON.stringify(칸.result),
        칸.heldInput === undefined ? null : JSON.stringify(칸.heldInput), 칸.discarded === true],
    );
    return Number(r.rows[0]!.id);
  }

  async function 자료(id: number, 이름: string, 자리: number, role = 'INPUT'): Promise<void> {
    const { pool } = await import('../db/index.js');
    await pool.query(
      `INSERT INTO authoring_asset (request_id, position, kind, name, size, role) VALUES ($1, $2, 'FILE', $3, 10, $4)`,
      [id, 자리, 이름, role],
    );
  }

  const 목록 = async (쿼리 = '') =>
    (await app.inject({ method: 'GET', url: `/api/authoring/requests?service=${접두사}${쿼리}` })).json<{
      items: { rootId: number; assets?: unknown; summary: { from: { assets: { name: string; figma: boolean }[]; assetsMore: number } }; todo: { heldOpen: number; conflictsOpen: number; apply: string | null } }[];
      total: number;
    }>();

  beforeAll(async () => {
    const { pool } = await import('../db/index.js');
    const r = await pool.query<{ id: string }>(
      `INSERT INTO service (prefix, name, color, tests_repo, tests_dir)
            VALUES ($1, $2, '#3A5FCD', 'https://github.com/acme/xwi', 'xwi')
       ON CONFLICT (prefix) DO UPDATE SET is_active = true
         RETURNING id`,
      [접두사, `${접두사} 작성 목록 검사용`],
    );
    서비스 = Number(r.rows[0]!.id);
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);

    app = Fastify();
    app.decorateRequest('user', null);
    app.addHook('preHandler', async (req) => {
      req.user = { username: 'xwi', displayName: '목록 검사', role: 'member' as const, dashboard: 'read' as const, mustChangePassword: false, services: [] };
    });
    await app.register(authoringRoutes, { prefix: '/api' });
    await app.ready();
  });

  afterAll(async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    await pool.query('DELETE FROM service WHERE id = $1', [서비스]);
    await app.close();
  });

  it('summary 자료는 뿌리의 입력 자료를 자리 차례로 · 옛 assets 칸은 없다', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    const 가 = await 행({ status: 'FAILED' });
    await 자료(가, '회원가입 기획서.docx', 1);
    await 자료(가, '결제.pdf', 2);
    await 자료(가, '표시 사본.docx', 3, 'MARKED');
    // 다시 돌린 실행이 최신이어도 이름은 뿌리 자료에서 온다
    await 행({ kind: 'RERUN', sourceId: 가, status: 'RUNNING' });
    const 나 = await 행({ status: 'FAILED' });

    const r = await 목록();
    const 줄 = (id: number) => r.items.find((i) => i.rootId === id)!;
    expect(줄(가).summary.from.assets).toEqual([{ name: '회원가입 기획서.docx', figma: false }, { name: '결제.pdf', figma: false }]);
    expect(줄(나).summary.from.assets).toEqual([]);
    expect(줄(가).assets).toBeUndefined();
  });

  it('todo — 보류 · 겹침은 머지를 뺀 최신 작성 실행 기준, apply 는 뿌리의 최신 실행 기준', async () => {
    const { pool } = await import('../db/index.js');
    await pool.query('DELETE FROM authoring_request WHERE service_id = $1', [서비스]);
    // 보류 하나 남은 작성 — 반영 대기
    const 값필요 = await 행({ status: 'DONE', result: { held: [보류] } });
    // 보류를 채운 작성 → 반영이 겹침으로 실패 · 아직 안 고름
    const 겹친 = await 행({ status: 'DONE', result: { held: [보류] }, heldInput: { 'XWI-FN-001': { params: { coupon: 'A1' }, by: 'xwi', at: '2026-10-19T00:00:00Z' } } });
    await 행({ kind: 'MERGE', sourceId: 겹친, status: 'FAILED', result: { conflicts: [겹침] } });
    // 병합 끝 — 할 일 없음
    const 끝 = await 행({ status: 'DONE' });
    await 행({ kind: 'MERGE', sourceId: 끝, status: 'DONE' });
    // 도는 중 — 할 일 없음
    const 도는 = await 행({ status: 'RUNNING' });
    // 폐기 — 할 일 없음
    await 행({ status: 'DONE', result: { held: [보류] }, discarded: true });

    const r = await 목록();
    const 할일 = (id: number) => r.items.find((i) => i.rootId === id)?.todo;
    expect(할일(값필요)).toEqual({ heldOpen: 1, conflictsOpen: 0, apply: 'WAITING' });
    expect(할일(겹친)).toEqual({ heldOpen: 0, conflictsOpen: 1, apply: 'FAILED' });
    expect(할일(끝)).toEqual({ heldOpen: 0, conflictsOpen: 0, apply: null });
    expect(할일(도는)).toEqual({ heldOpen: 0, conflictsOpen: 0, apply: null });

    const 손 = await 목록('&todo=1');
    expect(손.total).toBe(2);
    expect(손.items.map((i) => i.rootId)).toEqual([겹친, 값필요]);
    // status 와 겹쳐 쓴다 — 줄의 상태는 최신 실행 것(겹친 뿌리는 실패한 반영)
    expect((await 목록('&todo=1&status=DONE')).items.map((i) => i.rootId)).toEqual([값필요]);
  });
});
