// 케이스 「테스트 실행」 통로 — 실행 기록 없이 서버 러너에서 1건을 돌리고, 도는 장면을 시작한 사람에게 건넨다 (도메인/실행 §3.2 「테스트 모드」 · §7)

import type { ExecuteRequest, ExecuteResponse, Platform } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 케이스판 } from '../apidoc/caseDoc.js';
import { artifactsDir } from '../artifactFile.js';
import { 대상줄들읽기, type 대상줄 } from '../authoring/reverse.js';
import { 옛시험치우기 } from '../scenario/trial.js';
import { 깔앱파일 } from './buildFile.js';
import { enqueue } from './dispatcher.js';
import { 팜주소, 팜폰으로 } from './farm.js';
import { 사람팜토큰 } from './farmToken.js';
import { 장면을건넨다 } from './live.js';
import { caseSchemas } from './paramSets.js';
import { 폰을놓는다, 폰을바로잡는다 } from './phone.js';
import { na, 보낸다 } from './runner.js';
import { 저장값을채운다 } from './savedInput.js';
import { 엔진칸 } from './engineField.js';
import { prefixOf } from './store.js';
import { 시작한다, 읽는다, TrialBusyError } from './trial.js';
import { validate } from './validate.js';

const 제한ms = 300_000;

// 서버 러너를 여러 사람의 테스트 실행이 같이 쓴다 — 같은 밀리초에 눌러도 산출물 폴더(runs/0/<historyId>)가 겹치지 않게 늘 커지게 낸다.
// ponytail: 성능 녹화(perf/record.ts)도 runs/0 에 Date.now() 를 쓴다 — 같은 밀리초면 겹칠 수 있다. 겹침이 보이면 번호 하나를 같이 쓴다
let 앞번호 = 0;
const 새번호 = (): number => (앞번호 = Math.max(앞번호 + 1, Date.now()));

const body = z.object({
  platform: z.enum(['desktop', 'mobile', 'android']),
  // 서버 러너는 회사 내부망에 닿는다 — 사람이 적은 주소가 아니라 대상 서버 이름을 받고 주소는 표에서 찾는다 (도메인/실행 §3.2 「아무 주소나 열지 않는다」).
  // 빠져도 ENV_NOT_FOUND 다 — 옛 화면이 주소(baseUrl)만 보내면 그 까닭이 바로 보이게 (도메인/실행 §7 「테스트 모드 통로」)
  env: z.string().default(''),
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

/** 그 케이스 애플리케이션의 그 이름 대상 서버 줄. 애플리케이션이나 줄이 없으면 null */
async function 대상줄찾기(tcId: string, env: string): Promise<{ 줄: 대상줄; 종류: string; serviceId: number } | null> {
  const { pool } = await import('../db/index.js');
  const r = await pool.query<{ id: string; kind: string }>('SELECT id, kind FROM service WHERE prefix = $1', [prefixOf(tcId)]);
  const 서비스 = r.rows[0];
  if (서비스 === undefined) return null;
  const 줄 = (await 대상줄들읽기(Number(서비스.id))).find((c) => c.env === env);
  return 줄 === undefined ? null : { 줄, 종류: 서비스.kind, serviceId: Number(서비스.id) };
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

/**
 * Android 앱 · 게임 — 정식 실행과 같은 길로 누른 사람 토큰으로 팜 빈 폰을 잡고 놓는다(러너 §5.2 「디바이스 팜 접속 방식」).
 * 앱 파일은 폰을 잡은 뒤 정한다 — 올린 빌드의 서명 주소에 기한이 있다 (도메인/실행 §3.11)
 */
async function 팜폰에서돌린다(
  요청: ExecuteRequest,
  사람: string,
  앱재료: { serviceId: number; env: string; appPath: string | null },
  폰화면: (url: string | undefined) => void,
): Promise<ExecuteResponse> {
  const 팜 = 팜주소();
  // 받은 뒤 서버를 다시 띄우며 값을 지웠을 때뿐이다 — 통로가 FARM_OFF 로 먼저 거절한다
  if (팜 === undefined) return na(요청, '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  let 토큰: string | undefined;
  try {
    토큰 = await 사람팜토큰(사람);
  } catch (err) {
    return na(요청, '누른 사람의 통합계정 토큰을 읽지 못했습니다', err instanceof Error ? err.message : String(err));
  }
  const 결과 = await 팜폰으로(
    팜,
    async (udid, 화면) => {
      if (화면 !== undefined) 폰화면(화면);
      let app: string | null;
      try {
        app = await 깔앱파일(앱재료.serviceId, 앱재료.env, 앱재료.appPath);
      } catch (err) {
        return na(요청, err instanceof Error ? err.message : String(err));
      }
      return 보낸다(요청, { ...요청, udid, ...(토큰 !== undefined && { farmToken: 토큰 }), ...(app !== null && { app }) });
    },
    (까닭) => na(요청, 까닭),
    undefined,
    undefined,
    undefined,
    토큰,
  );
  // 팜폰으로 가 폰을 놓고 돌아왔다 — 결과를 적기 전 틈에 닫힌 링크를 내지 않는다
  폰화면(undefined);
  return 결과;
}

export default async function trialRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tcId: string } }>('/cases/:tcId/test-run', async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    const { platform, env } = parsed.data;

    const { tcId } = req.params;
    const 행 = await 케이스행(tcId);
    const schemas = await caseSchemas(tcId);
    if (행 === null || schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });
    if (!행.platforms.includes(platform)) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `${tcId} 는 ${platform} 환경을 지원하지 않습니다` });
    }
    const 대상 = await 대상줄찾기(tcId, env);
    if (대상 === null) {
      const detail = env === '' ? '대상 서버를 고르지 않았습니다' : `${prefixOf(tcId)} 에 ${env} 대상 서버가 없습니다`;
      return reply.code(400).send({ error: 'ENV_NOT_FOUND', detail });
    }
    const { 줄, 종류, serviceId } = 대상;

    // 진짜 실행과 같은 길로 요청에 없는 칸을 저장값 · 대상 서버 계정으로 채운다 — 저장된 비밀번호는 화면이 모른다(「입력됨」)
    const { params, expected } = await 저장값으로채운다(tcId, platform, 줄.계정들, parsed.data.params, parsed.data.expected, {
      param_schema: schemas.paramSchema,
      expected_schema: schemas.expectedSchema,
    });

    const violations = [...validate(schemas.paramSchema, params), ...validate(schemas.expectedSchema, expected)];
    if (violations.length > 0) {
      return reply.code(400).send({ error: 'INVALID_PARAMS', detail: violations[0]!.message, violations });
    }

    const 요청: ExecuteRequest = {
      runId: 0,
      historyId: 새번호(),
      tcId,
      platform,
      filePath: 행.file_path,
      baseUrl: 줄.baseUrl,
      params,
      expected,
      timeoutMs: 제한ms,
      // 정식 실행과 같은 규칙 — 게임 애플리케이션이면 엔진을 싣는다 (도메인/게임 §3.10 결정 6)
      ...엔진칸(종류, platform, 줄.adminKey),
      // 정식 실행과 같은 규칙 — 그 대상 서버 줄에 API 인증이 있으면 싣는다 (도메인/API §3.8)
      ...(줄.apiAuths.length > 0 && { apiAuths: 줄.apiAuths }),
    };
    const 폰씀 = platform === 'android';
    if (폰씀 && 팜주소() === undefined) {
      return reply.code(409).send({ error: 'FARM_OFF', detail: '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다' });
    }
    // 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞을 가로챈다. 검증 전에 잡으면 400 경로에서 디바이스가 재기동 때까지 잠긴다
    if (폰씀 && !폰을바로잡는다()) {
      // detail 을 싣지 않는다 — 화면 문장이 사유를 다 말하고, 같은 말을 실으면 두 번 뜬다(location.ts 「거절」)
      return reply.code(409).send({ error: 'DEVICE_BUSY' });
    }
    const 사람 = req.user?.username ?? '알 수 없음';
    try {
      const 일 = async (id: string, 폰화면: (url: string | undefined) => void): Promise<ExecuteResponse> => {
        try {
          // 정식 실행과 같은 규칙 — 판이 없으면 러너에 안 보내고 미실행으로 닫는다 (도메인/API §3.8 「응답 모양 확인」)
          const 판 = await 케이스판(tcId);
          if ('사유' in 판) return na(요청, 판.사유);
          // 앱 · 게임은 정식 실행처럼 전역 상한 밖의 디바이스 줄이고 Appium 이라 장면 열쇠를 안 싣는다 (도메인/실행 §3.2 「테스트 모드」)
          if (폰씀) return await 팜폰에서돌린다({ ...요청, ...판 }, 사람, { serviceId, env: 줄.env, appPath: 줄.appPath }, 폰화면);
          // 브라우저는 정식 실행과 같은 줄에 한 자리를 쓴다. 장면 열쇠는 이 시험 번호다
          return await enqueue(() => 보낸다(요청, { ...요청, ...판, live: id }));
        } finally {
          if (폰씀) 폰을놓는다();
        }
      };
      const trialId = 시작한다(
        사람,
        일,
        { paramSchema: schemas.paramSchema, expectedSchema: schemas.expectedSchema, params, expected },
        tcId,
      );
      // 치우기가 깨져도 시험은 돈다. 응답도 기다리게 하지 않는다 — E2E 시험 실행과 같다
      void 옛시험치우기(artifactsDir(), Date.now(), { 폴더: '0', 모양: /^\d+$/ }).catch((err: unknown) => {
        console.error('[test-run] 옛 테스트 실행 사진 폴더를 치우지 못했다', err);
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
    // 그 케이스의 시험만 읽는다 — 문은 주소의 tcId 로 권한을 봤다
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId, req.params.tcId);
    if (읽음 === null) return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    return 읽음;
  });

  // 끝난 시험도 404 다 — 러너가 장면을 버렸고, 화면은 마지막으로 받은 장면을 그대로 둔다
  app.get<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId/live', async (req, reply) => {
    // 그 케이스의 시험만 읽는다 — 문은 주소의 tcId 로 권한을 봤다
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId, req.params.tcId);
    if (읽음?.status !== 'RUNNING') return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    return 장면을건넨다(reply, req.params.trialId);
  });
}
