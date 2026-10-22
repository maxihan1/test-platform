// 케이스 「테스트 실행」 통로 — 실행 기록 없이 내 컴퓨터 러너에 1건을 보내 창을 띄워 돌린다 (도메인/실행 §3.2 · §7)

import type { ExecuteRequest, ExecuteResponse, Platform } from '@platform/kit';
import { 출처, type 역할계정 } from '@platform/kit/accounts';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 케이스판 } from '../apidoc/caseDoc.js';
import { 대상줄들읽기, type 대상줄 } from '../authoring/reverse.js';
import { caseSchemas } from './paramSets.js';
import { 폰을놓는다, 폰을바로잡는다 } from './phone.js';
import { na, 러너에보낸다, httpTimeoutMs } from './runner.js';
import { 저장값을채운다 } from './savedInput.js';
import { prefixOf, 엔진칸 } from './store.js';
import { 시작한다, 읽는다, TrialBusyError } from './trial.js';
import { validate } from './validate.js';

const 제한ms = 300_000;

const body = z.object({
  platform: z.enum(['desktop', 'mobile', 'android']),
  baseUrl: z.string().min(1),
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
});

async function 케이스행(tcId: string): Promise<{ platforms: string[]; file_path: string } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ platforms: string[]; file_path: string }>(
    'SELECT platforms, file_path FROM test_case WHERE tc_id = $1',
    [tcId],
  );
  return r.rows[0] ?? null;
}

// file:·javascript: 같은 주소로 창이 열리지 않게 한다
function 웹주소인가(값: string): boolean {
  try {
    const { protocol } = new URL(값);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * 그 케이스 서비스의 대상 서버 줄 가운데 보낸 주소와 출처가 같은 첫 줄(env 순). 없으면 undefined — 계정을 안 채우고 앱은 러너 환경값이다 (실행 §3.2).
 * 테스트 실행은 대상 서버 키 없이 주소만 받아서 출처로 줄을 찾는다
 */
async function 주소의줄(tcId: string, baseUrl: string): Promise<{ 줄: 대상줄 | undefined; 종류: string | undefined }> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ id: string; kind: string }>('SELECT id, kind FROM service WHERE prefix = $1', [prefixOf(tcId)]);
  const 서비스 = r.rows[0];
  const 종류 = 서비스?.kind;
  const 보낸출처 = 출처(baseUrl);
  // 깨진 주소끼리(null) 같다고 보지 않는다
  if (서비스 === undefined || 보낸출처 === null) return { 줄: undefined, 종류 };
  return { 줄: (await 대상줄들읽기(Number(서비스.id))).find((줄) => 출처(줄.baseUrl) === 보낸출처), 종류 };
}

async function 저장값으로채운다(
  tcId: string,
  platform: Platform,
  계정들: 역할계정[],
  params: Record<string, unknown>,
  expected: Record<string, unknown>,
  schemas: { param_schema: unknown; expected_schema: unknown },
): Promise<{ params: Record<string, unknown>; expected: Record<string, unknown> }> {
  const { pool } = await import('../db/index.js');
  const client = await pool.connect();
  try {
    const [채움] = await 저장값을채운다(client, [{ tcId, platforms: [platform], params, expected }], new Map([[tcId, schemas]]), 계정들);
    return { params: 채움!.params, expected: 채움!.expected };
  } finally {
    client.release();
  }
}

async function 러너에서돌린다(주소: string, 요청: ExecuteRequest): Promise<ExecuteResponse> {
  const res = await 러너에보낸다('/execute', 요청, httpTimeoutMs(요청.timeoutMs), 주소);
  if (res.status < 200 || res.status >= 300) throw new Error(`러너가 ${res.status}로 거절했다: ${JSON.stringify(res.json)}`);
  return res.json as ExecuteResponse;
}

export default async function trialRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tcId: string } }>('/cases/:tcId/test-run', async (req, reply) => {
    // 기본값을 두지 않는다. 서버가 도는 기계에서만 「내 컴퓨터」가 뜻이 맞아서 켠 곳에서만 켠다
    const 러너주소 = process.env.LOCAL_RUNNER_URL;
    if (러너주소 === undefined || 러너주소 === '') {
      return reply.code(409).send({
        error: 'TRIAL_OFF',
        detail: '이 서버에는 테스트 실행이 켜져 있지 않습니다. 켜는 법은 docs/SETUP.md 의 「내 컴퓨터 러너」를 보세요',
      });
    }

    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    const { platform, baseUrl } = parsed.data;
    if (!웹주소인가(baseUrl)) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: 'baseUrl 은 http:// 또는 https:// 주소여야 합니다' });
    }

    const { tcId } = req.params;
    const 행 = await 케이스행(tcId);
    const schemas = await caseSchemas(tcId);
    if (행 === null || schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });
    if (!행.platforms.includes(platform)) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `${tcId} 는 ${platform} 환경을 지원하지 않습니다` });
    }

    // 진짜 실행과 같은 길로 요청에 없는 칸을 저장값 · 대상 서버 계정으로 채운다 — 저장된 비밀번호는 화면이 모른다(「입력됨」)
    const { 줄, 종류 } = await 주소의줄(tcId, baseUrl);
    const { params, expected } = await 저장값으로채운다(tcId, platform, 줄?.계정들 ?? [], parsed.data.params, parsed.data.expected, {
      param_schema: schemas.paramSchema,
      expected_schema: schemas.expectedSchema,
    });

    const violations = [...validate(schemas.paramSchema, params), ...validate(schemas.expectedSchema, expected)];
    if (violations.length > 0) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', detail: violations[0]!.message, violations });
    }

    // 정식 실행과 같은 규칙 — 그 대상 서버 줄의 앱 파일, 없으면 러너 환경값 (러너 §5.2 · APP-F1-03)
    const 앱 = platform === 'android' ? (줄?.appPath ?? null) : null;
    const 요청: ExecuteRequest = {
      runId: 0,
      historyId: Date.now(),
      tcId,
      platform,
      filePath: 행.file_path,
      baseUrl,
      params,
      expected,
      timeoutMs: 제한ms,
      ...(앱 !== null && { app: 앱 }),
      // 정식 실행과 같은 규칙 — 게임 애플리케이션이면 엔진을 싣는다 (도메인/게임 §3.10 결정 6)
      ...엔진칸(종류, platform),
      // 정식 실행과 같은 규칙 — 그 대상 서버 줄에 API 인증이 있으면 싣는다 (도메인/API §3.8)
      ...(줄 !== undefined && 줄.apiAuths.length > 0 && { apiAuths: 줄.apiAuths }),
    };
    // 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞을 가로챈다. 검증 전에 잡으면 400 경로에서 디바이스가 재기동 때까지 잠긴다
    const 폰씀 = platform === 'android';
    if (폰씀 && !폰을바로잡는다()) {
      // detail 을 싣지 않는다 — 화면 문장이 사유를 다 말하고, 같은 말을 실으면 두 번 뜬다(location.ts 「거절」)
      return reply.code(409).send({ error: 'DEVICE_BUSY' });
    }
    try {
      const 일 = async (): Promise<ExecuteResponse> => {
        try {
          // 정식 실행과 같은 규칙 — 판이 없으면 러너에 안 보내고 미실행으로 닫는다 (도메인/API §3.8 「응답 모양 확인」)
          const 판 = await 케이스판(tcId);
          if ('사유' in 판) return na(요청, 판.사유);
          return await 러너에서돌린다(러너주소, { ...요청, ...판 });
        } finally {
          if (폰씀) 폰을놓는다();
        }
      };
      const trialId = 시작한다(req.user?.username ?? '알 수 없음', 일, {
        paramSchema: schemas.paramSchema,
        expectedSchema: schemas.expectedSchema,
        params,
        expected,
      });
      return reply.code(202).send({ trialId });
    } catch (err) {
      // 시작한다 가 던지면 일이 불리지 않았으므로 finally 가 안 돈다 — 여기서 놓는다
      if (폰씀) 폰을놓는다();
      if (err instanceof TrialBusyError) return reply.code(409).send({ error: err.code, detail: err.message });
      throw err;
    }
  });

  app.get<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId', async (req, reply) => {
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId);
    if (읽음 === null) return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    return 읽음;
  });
}
