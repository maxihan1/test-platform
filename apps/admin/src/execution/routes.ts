// 실행 컨텍스트의 HTTP 라우트 (SPEC §7 Execution)
// 규약: default export 한 Fastify 플러그인을 app.ts가 /api 접두사로 등록한다

import { readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 칸되는서비스 } from '../auth/permissions.js';
import { 정수 } from '../routeParams.js';
import { dispatch, markAborted } from './dispatcher.js';
import { notifyRun } from './notify.js';
import { abortRunner, 진행 } from './runner.js';
import { caseSchemas, createParamSet, deleteParamSet, listParamSets } from './paramSets.js';
import { caseHistory, lastByCase } from './history.js';
import { 저장값통로 } from './savedInput.js';
import { findItem, findRun, listRuns, serviceExists } from './queries.js';
import { abortRun, createRun, recoverRunning, RunInputError, unfinishedItems } from './store.js';
import { validate } from './validate.js';
import { 목록종류읽기 } from './runKind.js';
import { runBody, 실행위치를본다 } from './location.js';

const PAGE_SIZE = 50;

const paramSetBody = z.object({
  name: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
});

// 러너와 어드민이 같은 볼륨을 본다. 경로 규칙은 artifacts/runs/{runId}/{historyId}/{seq}.png (SPEC §9)
export function artifactsDir(): string {
  return process.env.PLATFORM_ARTIFACTS_DIR ?? resolve(process.cwd(), 'artifacts');
}

// 시나리오 사진 통로(scenario/runRoutes.ts)도 같은 판정을 쓴다
export async function 시나리오실행인가(runId: number): Promise<boolean> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query("SELECT 1 FROM test_run WHERE run_id = $1 AND kind = 'SCENARIO'", [runId]);
  return (r.rowCount ?? 0) > 0;
}

function page(raw: string | undefined): number {
  return Math.max(1, Number(raw ?? 1) || 1);
}

export default async function executionRoutes(app: FastifyInstance): Promise<void> {
  // 재기동으로 분배기가 사라지면 그 항목들은 영원히 끝나지 않아 FINISHED 조건이 결코 만족되지 않는다.
  // 뜨는 김에 한 번 닫는다. 실패해도 admin 은 떠야 하므로 사유만 남긴다 (SPEC §3.2)
  void recoverRunning()
    .then((n) => {
      if (n > 0) app.log.warn(`[execution] 재기동 전에 돌던 실행 ${n}건을 중단으로 닫았다`);
    })
    .catch((err: unknown) => {
      app.log.error(`[execution] 재기동 복구가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
    });

  app.post('/runs', async (req, reply) => {
    const parsed = runBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    // createRun 에는 위치를 넘기지 않는다 — DB 에 남기지 않는다 (SPEC 실행 §7)
    const { location, ...실행본문 } = parsed.data;
    const 거절 = 실행위치를본다(실행본문.items, location, process.env);
    if (거절) return reply.code(거절.status).send({ error: 거절.error, detail: 거절.detail });

    // 문(auth/gate.ts)이 모든 /api 앞에 서므로 여기 닿았으면 사람이 있다.
    // 문 없이 이 라우트만 띄우는 검사에서만 빈 자리가 생기고, 그때는 이름 칸을 비워 둔다 (SPEC §3.5)
    const 사람 = req.user ?? null;

    try {
      const { runId, items } = await createRun({
        ...실행본문,
        triggeredBy: 사람?.username ?? '알 수 없음',
        triggeredByName: 사람?.displayName,
      });
      // 기다리지 않는다. 케이스 하나가 5분이면 응답이 5분 동안 열려 있게 된다 (SPEC §7)
      void dispatch(runId, items).catch((err: unknown) => {
        app.log.error(`[execution] 실행 ${runId} 분배가 깨졌다: ${err instanceof Error ? err.message : String(err)}`);
      });
      return { runId };
    } catch (err) {
      if (err instanceof RunInputError) {
        // 배정받지 않은 서비스는 403이다. 404로 감추지 않는다 (SPEC §3.5)
        const code = err.code === 'CASE_NOT_FOUND' ? 404 : err.code === 'SERVICE_FORBIDDEN' ? 403 : 400;
        // 상한을 넘겼을 때는 화면이 숫자를 그대로 보여줄 수 있게 상한과 요청 건수를 같이 싣는다 (SPEC §8.2)
        if (err.detail !== undefined) {
          return reply.code(code).send({ error: err.code, ...err.detail });
        }
        return reply.code(code).send({ error: err.code, detail: err.message });
      }
      throw err;
    }
  });

  app.post<{ Params: { runId: string } }>('/runs/:runId/abort', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });

    // 끊을 대상을 먼저 손에 쥔다. 닫고 나면 finished_at 이 차서 못 찾는다.
    // 그 사이에 끝난 것이 섞여도 러너가 모르는 historyId 는 false 를 돌려줄 뿐이다 (SPEC §5.2)
    const 미완 = await unfinishedItems(runId);

    // DB 에서 먼저 닫는다. 러너 응답과 겹쳐도 finished_at IS NULL 조건이 먼저 온 것만 기록한다 (SPEC §7.1)
    const result = await abortRun(runId);
    if (result === 'SCENARIO') {
      return reply.code(409).send({ error: 'NOT_ABORTABLE', detail: `실행 ${runId}은 시나리오 실행이라 멈출 수 없다` });
    }
    if (result === null) {
      return reply.code(409).send({ error: 'NOT_RUNNING', detail: `실행 ${runId}은 이미 끝났거나 멈춘 상태다` });
    }

    markAborted(runId);
    // 돌고 있는 자식까지 끊는다. 대기 중인 것만 취소하면 5분짜리 케이스가 도는 중에는
    // 버튼이 아무 일도 안 하는 것처럼 보인다 (SPEC §8.3)
    await Promise.all(미완.map((i) => abortRunner(i.historyId, i.platform)));

    // 사람이 멈춘 것도 끝난 것이다. 알림이 실패해도 멈춤은 성립한다 (SPEC §8.9)
    try {
      await notifyRun(runId);
    } catch (err) {
      app.log.error(`[execution] 실행 ${runId}의 Slack 알림을 보내지 못했다: ${err instanceof Error ? err.message : String(err)}`);
    }

    return result;
  });

  app.get<{ Params: { runId: string } }>('/runs/:runId/progress', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });

    // 러너의 목록은 **모든 서비스의 자식**을 담고 runId 칸이 없다. 그대로 흘리면 남의 실행의
    // 절차 제목이 이 화면에 뜬다 — 문(auth/scope.ts)은 「이 runId 를 볼 자격」만 보고 내용물은 안 본다.
    // 자기 DB 의 historyId 와 교집합만 낸다. 제한 시간도 같은 줄에 있어 한 질의로 끝난다 (SPEC §7)
    const 돌고있는것들 = await 진행();
    if (돌고있는것들.length === 0) return { items: [] };

    // **러너가 답한 것만 물어본다.** run_id 로만 좁히면 5000건짜리 실행에서 보는 사람마다
    // 2초에 한 번 5000행을 읽는다 — 정작 쓰는 것은 동시 실행 수만큼(기본 2)뿐이다
    const { pool } = await import('../db/index.js');
    const 제한 = await pool.query<{ history_id: string; timeout_ms: number }>(
      'SELECT history_id, timeout_ms FROM run_item WHERE run_id = $1 AND history_id = ANY($2)',
      [runId, 돌고있는것들.map((it) => it.historyId)],
    );
    const 내것 = new Map(제한.rows.map((r) => [Number(r.history_id), r.timeout_ms]));

    // 없는 runId 에도 200 빈 목록이다. 형제 라우트(findRun·findItem)는 404 를 내지만
    // 여기서 404 를 내려면 실행을 한 번 더 조회해야 하고, 화면은 도는 중일 때만 부른다 (SPEC §8.9)
    return {
      items: 돌고있는것들.flatMap((돌고있는것) => {
        const timeoutMs = 내것.get(돌고있는것.historyId);
        return timeoutMs === undefined ? [] : [{ ...돌고있는것, timeoutMs }];
      }),
    };
  });

  app.get<{ Querystring: { service?: string; page?: string; q?: string; state?: string; env?: string; kind?: string } }>(
    '/runs',
    async (req, reply) => {
      // 한 번에 한 서비스만 본다. 섞이면 목록이 남의 실행으로 채워진다 (SPEC §8 · §8.7)
      const service = req.query.service ?? '';
      if (service === '') return reply.code(400).send({ error: 'SERVICE_REQUIRED' });
      if (!(await serviceExists(service))) {
        return reply.code(403).send({ error: 'SERVICE_FORBIDDEN', detail: service });
      }
      // 모르는 state 는 조용히 버린다. 거르개는 「무엇을 볼까」이지 권한이 아니다 (SPEC §8.7)
      const state = req.query.state === 'running' || req.query.state === 'failed' ? req.query.state : undefined;
      return listRuns(service, page(req.query.page), PAGE_SIZE, {
        ...(req.query.q === undefined ? {} : { q: req.query.q }),
        ...(state === undefined ? {} : { state }),
        ...(req.query.env === undefined ? {} : { env: req.query.env }),
        // 모르는 kind 는 state 처럼 조용히 case 로 본다 (SPEC 시나리오 §7 「실행 목록의 E2E 탭」)
        kind: 목록종류읽기(req.query.kind),
      });
    },
  );

  // 목록 화면이 케이스마다 이력을 따로 부르지 않게 한 번에 준다 (SPEC §8.1, WS-A 검사 기록 '기타 2')
  // 2026-09-21 ② 부터 줄의 판정 흐름(recent)도 같은 응답에 실린다 — 부르는 횟수는 그대로 1회다
  // 번호로 부르는 것이 아니라 전부 주는 질의라 문이 막을 것이 없다. 실행 read 인 배정 서비스만 질의에 넘긴다 (§7)
  app.get('/runs/last-by-case', async (req) => ({
    items: await lastByCase(칸되는서비스(req.user?.services ?? [], 'runs', 'read')),
  }));

  app.get<{ Params: { runId: string } }>('/runs/:runId', async (req, reply) => {
    const runId = 정수(req.params.runId);
    if (runId === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.runId });

    const found = await findRun(runId);
    if (found !== null) return found;
    // 번호만 들고 온 화면이 결과 화면을 갈아탈 수 있게 없는 번호와 가른다 (도메인/시나리오 §7)
    if (await 시나리오실행인가(runId)) {
      return reply.code(404).send({ error: 'SCENARIO_RUN', detail: `실행 ${runId}은 시나리오 실행이다 — /api/runs/${runId}/scenario` });
    }
    return reply.code(404).send({ error: 'RUN_NOT_FOUND', detail: req.params.runId });
  });

  app.get<{ Params: { runId: string; historyId: string } }>('/runs/:runId/items/:historyId', async (req, reply) => {
    const runId = 정수(req.params.runId);
    const historyId = 정수(req.params.historyId);
    if (runId === null || historyId === null) {
      const 어긋난값 = runId === null ? req.params.runId : req.params.historyId;
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 어긋난값 });
    }

    const found = await findItem(runId, historyId);
    if (found === null) return reply.code(404).send({ error: 'RUN_ITEM_NOT_FOUND', detail: req.params.historyId });
    return found;
  });

  app.get<{ Params: { tcId: string }; Querystring: { platform?: string; page?: string } }>(
    '/cases/:tcId/history',
    async (req) => caseHistory(req.params.tcId, req.query.platform, page(req.query.page), PAGE_SIZE),
  );

  app.get<{ Params: { runId: string; historyId: string; seq: string } }>(
    '/screenshots/:runId/:historyId/:seq.png',
    async (req, reply) => {
      // 경로를 정수로만 조립한다. 볼륨 밖으로 올라가는 경로가 애초에 만들어지지 않는다.
      // 여기만 규칙을 따로 적었다가 0 과 지수 표기를 통과시키고 있었다 — 같은 자리를 쓴다
      const parts = [req.params.runId, req.params.historyId, req.params.seq].map(정수);
      if (parts.some((n) => n === null)) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.url });
      }

      const file = join(artifactsDir(), 'runs', String(parts[0]), String(parts[1]), `${parts[2]}.png`);
      let png: Buffer;
      try {
        png = await readFile(file);
      } catch {
        // 내보낼 것을 손에 쥔 뒤에 형식을 정한다. 먼저 image/png로 박아 두면 404 본문을 png로 쓰려다 500이 난다
        return reply.code(404).send({ error: 'SCREENSHOT_NOT_FOUND', detail: req.url });
      }
      return reply.type('image/png').send(png);
    },
  );

  app.get<{ Params: { tcId: string } }>('/cases/:tcId/param-sets', async (req) => ({
    items: await listParamSets(req.params.tcId),
  }));

  app.post<{ Params: { tcId: string } }>('/cases/:tcId/param-sets', async (req, reply) => {
    const parsed = paramSetBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const { tcId } = req.params;
    const schemas = await caseSchemas(tcId);
    if (schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });

    // 저장 전에 명세로 검증한다. 값이 어긋난 채 저장되면 실행할 때가 아니라 몇 주 뒤에 터진다
    const violations = [
      ...validate(schemas.paramSchema, parsed.data.params),
      ...validate(schemas.expectedSchema, parsed.data.expected),
    ];
    if (violations.length > 0) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', detail: violations[0]!.message, violations });
    }

    const saved = await createParamSet(tcId, parsed.data.name, parsed.data.params, parsed.data.expected);
    if (saved === null) {
      return reply.code(409).send({ error: 'DUPLICATE_NAME', detail: `${tcId}에 '${parsed.data.name}'이 이미 있다` });
    }
    return saved;
  });

  저장값통로(app);

  app.delete<{ Params: { id: string } }>('/param-sets/:id', async (req, reply) => {
    const id = 정수(req.params.id);
    if (id === null) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: req.params.id });
    if (!(await deleteParamSet(id))) return reply.code(404).send({ error: 'PARAM_SET_NOT_FOUND', detail: req.params.id });
    return reply.code(204).send();
  });
}
