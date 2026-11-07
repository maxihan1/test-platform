// 호환성 실행 통로 — 실행 시작 · 결과 · 의심 화면 그림 · 판정 (도메인/호환성 §7 「실행」 · 「결과」)
// 배정과 권한은 문(auth/gate.ts)이 이미 봤다. routes.ts 가 300줄에 닿지 않게 실행 쪽을 뗐다

import { join } from 'node:path';

import { FARM_EVIDENCE_DIR, runDir } from '@platform/kit';
import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { 볼륨파일읽기 } from '../artifactFile.js';
import { 팜주소 } from '../execution/farm.js';
import { DEFAULT_TIMEOUT_MS } from '../execution/location.js';
import { 정수 } from '../routeParams.js';
import { db } from '../settings/store.js';
import { 호환성디바이스목록 } from './devices.js';
import { 실행돌리기 } from './runEngine.js';
import { 실행머리읽기, 판정하기 } from './runRead.js';
import { 실행세우기, 호환성실행오류 } from './runStore.js';
import { 호환성결과 } from './runView.js';
import { 셈하기 } from './select.js';
import { 세트하나, 재료읽기 } from './store.js';
import { 그림이름 } from './uiCheck.js';

const 실행본문 = z.object({ env: z.string().min(1).max(100) });
const 판정본문 = z.object({ key: z.string().min(1).max(2000), seq: z.number().int().positive(), verdict: z.enum(['CONFIRMED', 'NOT_DEFECT']).nullable() });

const 잘못 = (reply: FastifyReply, detail: string) => reply.code(400).send({ error: 'INVALID_REQUEST', detail });
const 실행없음 = (reply: FastifyReply, detail: string) => reply.code(404).send({ error: 'RUN_NOT_FOUND', detail });

const 오류응답: Record<호환성실행오류['code'], number> = { ENV_NOT_FOUND: 400, NO_CASE: 400, NO_DEVICE: 400, FARM_OFF: 409 };

export default async function compatRunRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { id: string } }>('/compat-sets/:id/runs', async (req, reply) => {
    const id = 정수(req.params.id);
    const parsed = 실행본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    const set = id === null ? null : await 세트하나(id);
    if (set === null || !set.isActive) return reply.code(404).send({ error: 'COMPAT_SET_NOT_FOUND' });
    try {
      // 실행 행을 세우기 전에 거절한다 — 팜이 없으면 모든 상태가 건너뛰기라 실행을 세울 까닭이 없다
      if (팜주소() === undefined) throw new 호환성실행오류('FARM_OFF', 'DEVICE_FARM_URL 이 비어 있습니다');
      const 팜 = await 호환성디바이스목록();
      if (팜 === null) return reply.code(502).send({ error: 'FARM_UNREACHABLE' });
      // 사용 중은 기다린다. 등록에서 빠진 디바이스만 있으면 기다려도 안 생긴다 (§7 「실행」)
      const 있음 = (d: { serial: string; model: string }) => 팜.some((x) => x.serial === d.serial || (set.onePerModel && x.model === d.model));
      if (!set.devices.some(있음)) throw new 호환성실행오류('NO_DEVICE', '등록된 디바이스가 하나도 없습니다');
      const 앱 = await (await db()).query<{ prefix: string }>('SELECT prefix FROM service WHERE id = $1', [set.serviceId]);
      const 재 = await 재료읽기(set.serviceId, 앱.rows[0]?.prefix ?? '');
      // 실행할 때마다 다시 계산해 박제한다 (결정 5). 직접 추가가 자동 선택에도 들면 자동 선택 쪽으로 한 번만
      const 셈 = 셈하기(재.전체, 재.후보들, set.addedCases, 재.fallback);
      const 자동 = new Set(셈.auto.map((a) => a.tcId));
      const 후보 = new Map(재.후보들.map((c) => [c.tcId, c]));
      const 고른 = [...자동, ...set.addedCases.filter((t) => !자동.has(t))].flatMap((t) => {
        const c = 후보.get(t);
        return c === undefined ? [] : [{ tcId: t, name: c.name, picked: 자동.has(t) ? ('AUTO' as const) : ('ADDED' as const) }];
      });
      if (고른.length === 0) throw new 호환성실행오류('NO_CASE', '고를 케이스가 없습니다');
      const 파일 = await (await db()).query<{ tc_id: string; file_path: string }>('SELECT tc_id, file_path FROM test_case WHERE tc_id = ANY($1::text[])', [고른.map((c) => c.tcId)]);
      const 경로 = new Map(파일.rows.map((r) => [r.tc_id, r.file_path]));
      const runId = await 실행세우기(
        set,
        parsed.data.env,
        { username: req.user?.username ?? '알 수 없음', displayName: req.user?.displayName ?? '알 수 없음' },
        고른.map((c) => ({ ...c, filePath: 경로.get(c.tcId) ?? '', timeoutMs: DEFAULT_TIMEOUT_MS })),
      );
      실행돌리기(runId);
      return reply.code(201).send({ runId });
    } catch (err) {
      if (!(err instanceof 호환성실행오류)) throw err;
      return reply.code(오류응답[err.code]).send({ error: err.code, detail: err.message });
    }
  });

  app.get<{ Params: { runId: string } }>('/compat-runs/:runId', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const 결과 = runId === null ? null : await 호환성결과(runId);
    if (결과 === null) return 실행없음(reply, req.params.runId);
    const { 요약: _요약, ...보임 } = 결과;
    return 보임;
  });

  app.get<{ Params: { runId: string; screenId: string } }>('/compat-runs/:runId/screens/:screenId/image', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const screenId = 정수(req.params.screenId);
    const 없음 = () => reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
    if (runId === null || screenId === null) return 없음();
    const r = await (await db()).query<{ case_run_id: string; file: string | null }>('SELECT case_run_id, file FROM compat_screen WHERE id = $1 AND run_id = $2', [screenId, runId]);
    const 줄 = r.rows[0];
    // 파일 이름은 저장할 때 꼴을 봤지만 경로에 넣기 전에 한 번 더 본다 — 볼륨 밖으로 못 나간다
    if (줄?.file == null || !그림이름.test(줄.file)) return 없음();
    let png: Buffer;
    try {
      png = await 볼륨파일읽기(join(runDir(String(runId), 줄.case_run_id), FARM_EVIDENCE_DIR, 줄.file));
    } catch (e) {
      // 의심 화면 그림을 못 받았을 수 있다(팜 받기 실패) — 없는 것은 404, 그 밖의 읽기 오류는 그대로 던진다
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return 없음();
      throw e;
    }
    return reply.type('image/png').send(png);
  });

  app.put<{ Params: { runId: string } }>('/compat-runs/:runId/verdicts', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const parsed = 판정본문.safeParse(req.body);
    if (!parsed.success) return 잘못(reply, parsed.error.message);
    if (runId === null || (await 실행머리읽기(runId)) === null) return 실행없음(reply, req.params.runId);
    const { key, seq, verdict } = parsed.data;
    if (!(await 판정하기(runId, key, seq, verdict, req.user?.username ?? '알 수 없음'))) return reply.code(400).send({ error: 'NOT_SUSPECT' });
    return reply.code(200).send({ key, seq, verdict });
  });
}
