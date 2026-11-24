// 케이스 「테스트 실행」 통로 — 실행 기록 없이 서버 러너에서 1건(프로시저 안 케이스면 그 프로시저를 통째로)을 돌리고, 도는 장면을 시작한 사람에게 건넨다 (도메인/실행 §3.2 「테스트 모드」 · §7)

import { PC_PLATFORMS, PC항목인가, type ExecuteRequest, type ExecuteResponse, type Platform } from '@platform/kit';
import type { 역할계정 } from '@platform/kit/accounts';

import type { FastifyInstance, FastifyReply } from 'fastify';
import { z } from 'zod';

import { 케이스판 } from '../apidoc/caseDoc.js';
import { 항목실패를가른다 } from '../reporting/itemFailure.js';
import { artifactsDir } from '../artifactFile.js';
import { 옛시험치우기 } from '../scenario/trial.js';
import { enqueue } from './dispatcher.js';
import { 팜주소 } from './farm.js';
import { 장면을건넨다 } from './live.js';
import { 플랫폼밖인가, 항목제한ms } from './location.js';
import { caseSchemas } from './paramSets.js';
import { PC에서돌린다 } from './pcTrial.js';
import { Chrome차례, PC를놓는다, PC를바로잡는다, 폰을놓는다, 폰을바로잡는다 } from './phone.js';
import { abortRunner, 못간답, 보낸다, 시험진행, 한건 } from './runner.js';
import { 프로시저못도는러너인가 } from './runnerAddr.js';
import { 저장값을채운다 } from './savedInput.js';
import { 돌발팝업을싣는다, 엔진칸 } from './engineField.js';
import { prefixOf } from './store.js';
import { 닫는다, 시작한다, 읽는다, TrialBusyError, type 시험결과 } from './trial.js';
import { 대상줄찾기, 케이스행 } from './trialCase.js';
import { 중단글, 팜폰에서돌린다, type 폰화면함수 } from './trialPhone.js';
import { 프로시저시험감, type 시험감 } from './trialProc.js';
import { validate } from './validate.js';

const 제한ms = 300_000;

// 서버 러너를 여러 사람의 테스트 실행이 같이 쓴다 — 같은 밀리초에 눌러도 산출물 폴더(runs/0/<historyId>)가 겹치지 않게 늘 커지게 낸다.
// ponytail: 성능 녹화(perf/record.ts)도 runs/0 에 Date.now() 를 쓴다 — 같은 밀리초면 겹칠 수 있다. 겹침이 보이면 번호 하나를 같이 쓴다
let 앞번호 = 0;
const 새번호 = (): number => (앞번호 = Math.max(앞번호 + 1, Date.now()));

/**
 * 도는 시험마다 러너에 보낸 번호와 어디까지 갔는지. 러너에 보내기 전이면 중단을 admin 이 닫고, 보낸 뒤면 러너가 끊는다.
 * 일이 끝나면 지운다 (도메인/실행 §3.2 「시험 실행 지금 단계 · 중단 · 정식 실행 화면」)
 */
interface 시험상태 {
  historyId: number;
  보냄: boolean;
  멈춤: boolean;
  /** 누를 때 읽은 단계 제목 — 스캔이 못 셌으면 없다 (도메인/실행 §3.2 「단계 목록은 처음부터 다 보인다」) */
  stepTitles?: string[];
  /** 러너에 보내기 전에 중단했을 때 닫을 결과 — 옛 꼴과 프로시저가 모양이 다르다 */
  중단답: () => 시험결과;
}
const 상태들 = new Map<string, 시험상태>();

const body = z.object({
  platform: z.enum(['desktop', 'mobile', 'android', ...PC_PLATFORMS]),
  // 서버 러너는 회사 내부망에 닿는다 — 사람이 적은 주소가 아니라 대상 서버 이름을 받고 주소는 표에서 찾는다 (도메인/실행 §3.2 「아무 주소나 열지 않는다」).
  // 빠져도 ENV_NOT_FOUND 다 — 옛 화면이 주소(baseUrl)만 보내면 그 까닭이 바로 보이게 (도메인/실행 §7 「테스트 모드 통로」)
  env: z.string().default(''),
  params: z.record(z.string(), z.unknown()).default({}),
  expected: z.record(z.string(), z.unknown()).default({}),
  mobileOn: z.enum(['server', 'vision']).default('server'), // 실행 창의 「가상 기기 · 실제 기기」 — 정식 실행 요청과 같은 이름 · 값 (도메인/실행 §3.2)
});

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

interface 돌릴곳 {
  tcId: string;
  사람: string;
  폰씀: boolean;
  폰Chrome: boolean;
  PC씀: boolean;
  serviceId: number;
  env: string;
  appPath: string | null;
}

/**
 * 디바이스를 잡고 시험을 건다 — 옛 꼴 케이스와 프로시저가 같은 길을 탄다. 검증이 다 끝난 뒤에 부른다 —
 * 검증 전에 디바이스를 잡으면 400 경로에서 디바이스가 재기동 때까지 잠긴다
 */
function 시험을건다(감: 시험감, 곳: 돌릴곳, reply: FastifyReply): FastifyReply {
  const { 폰씀, 폰Chrome, PC씀, 사람 } = 곳;
  // 실제 기기는 팜이 있어야 한다(정식 실행과 같은 409 · 도메인/실행 §3.2 「테스트 모드」)
  if ((폰씀 || 폰Chrome || PC씀) && 팜주소() === undefined) {
    return reply.code(409).send({ error: 'FARM_OFF', detail: '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다' });
  }
  // 같은 디바이스에 연결 둘이 겹치면 뒤 연결이 앞을 가로챈다.
  // PC 는 폰과 따로 선 PC 줄이다 — 정식 실행이 PC 를 쓰는 중이면 기다리지 않고 409 (도메인/게임 §3.10)
  if ((폰씀 && !폰을바로잡는다()) || (PC씀 && !PC를바로잡는다())) {
    // detail 을 싣지 않는다 — 화면 문장이 사유를 다 말하고, 같은 말을 실으면 두 번 뜬다(location.ts 「거절」)
    return reply.code(409).send({ error: 'DEVICE_BUSY' });
  }
  const 줄놓기 = (): void => (폰씀 ? 폰을놓는다() : PC씀 ? PC를놓는다() : undefined);
  try {
    const 일 = async (id: string, 폰화면: 폰화면함수): Promise<시험결과> => {
      const 상태: 시험상태 = {
        historyId: 감.요청.historyId,
        보냄: false,
        멈춤: false,
        중단답: () => 감.결과로(감.못감(중단글)),
        ...(감.stepTitles !== undefined && { stepTitles: 감.stepTitles }),
      };
      상태들.set(id, 상태);
      // 멈췄나를 보고 보냄을 적는 사이에 await 가 없다 — 중단은 둘 중 한 갈래만 탄다
      const 보내기 = async (b: ExecuteRequest): Promise<ExecuteResponse> => {
        if (상태.멈춤) return 감.못감(중단글);
        상태.보냄 = true;
        return 보낸다(b);
      };
      const 멈췄나 = (): boolean => 상태.멈춤;
      try {
        // 정식 실행과 같은 규칙 — 판이 없으면 러너에 안 보내고 미실행으로 닫는다 (도메인/API §3.8 「응답 모양 확인」)
        const 판 = 감.판 === undefined ? {} : await 감.판();
        if ('사유' in 판 && typeof 판.사유 === 'string') return 감.결과로(감.못감(판.사유));
        // 장면 열쇠는 이 시험 번호다
        const 요청 = { ...감.요청, ...판, live: id };
        const 줄 = { serviceId: 곳.serviceId, env: 곳.env };
        // 앱 · 게임은 정식 실행처럼 전역 상한 밖의 디바이스 줄이다. 장면은 러너가 Appium 으로 찍는다 (도메인/실행 §3.2 「테스트 모드」 · 2026-11-05 사용자)
        if (PC씀) return 감.결과로(await PC에서돌린다(요청, 사람, 줄, 폰화면, 보내기, 멈췄나, 감.못감));
        if (폰씀) return 감.결과로(await 팜폰에서돌린다(요청, 사람, { ...줄, appPath: 곳.appPath }, 폰화면, 보내기, 멈췄나, 감.못감));
        // 실제 폰은 디바이스 줄 대신 Chrome 줄 → 브라우저처럼 한 자리 차례다. 장면은 폰 Chrome 탭에서 받는다 (러너 §5.2 「모바일 웹 — 실제 폰 Chrome」)
        if (폰Chrome) return 감.결과로(await Chrome차례(() => enqueue(() => 팜폰에서돌린다(요청, 사람, 'chrome', 폰화면, 보내기, 멈췄나, 감.못감))));
        // 브라우저는 정식 실행과 같은 줄에 한 자리를 쓴다
        return 감.결과로(await enqueue(() => 보내기(요청)));
      } finally {
        상태들.delete(id);
        줄놓기();
      }
    };
    const trialId = 시작한다(사람, 일, 감.명세, 곳.tcId);
    // 치우기가 깨져도 시험은 돈다. 응답도 기다리게 하지 않는다 — E2E 시험 실행과 같다
    void 옛시험치우기(artifactsDir(), Date.now(), { 폴더: '0', 모양: /^\d+$/ }).catch((err: unknown) => {
      console.error('[test-run] 옛 테스트 실행 사진 폴더를 치우지 못했다', err);
    });
    return reply.code(202).send({ trialId });
  } catch (err) {
    // 시작한다 가 던지면 일이 불리지 않았으므로 finally 가 안 돈다 — 여기서 놓는다
    줄놓기();
    if (err instanceof TrialBusyError) return reply.code(409).send({ error: err.code, detail: err.message });
    throw err;
  }
}

export default async function trialRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { tcId: string } }>('/cases/:tcId/test-run', async (req, reply) => {
    const parsed = body.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    const { platform, env, mobileOn } = parsed.data;

    const { tcId } = req.params;
    const 행 = await 케이스행(tcId);
    const schemas = await caseSchemas(tcId);
    if (행 === null || schemas === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });
    // 시험은 선언한 값 하나만 받는다 — 화면이 「Windows」 칸이면 선언한 윈도우 값을 하나씩 차례로 보낸다 (도메인/게임 §3.10 「윈도우 PC」)
    if (!행.platforms.includes(platform)) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `${tcId} 는 ${platform} 환경을 지원하지 않습니다` });
    }
    const 대상 = await 대상줄찾기(tcId, env);
    if (대상 === null) {
      const detail = env === '' ? '대상 서버를 고르지 않았습니다' : `${prefixOf(tcId)} 에 ${env} 대상 서버가 없습니다`;
      return reply.code(400).send({ error: 'ENV_NOT_FOUND', detail });
    }
    const { 줄, 종류, 게임플랫폼, serviceId } = 대상;
    const PC씀 = PC항목인가(platform);
    if (플랫폼밖인가(종류, 게임플랫폼, platform)) return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `${tcId} 의 ${platform} 디바이스는 이 애플리케이션에서 돌지 않습니다` });

    const 곳: 돌릴곳 = {
      tcId,
      사람: req.user?.username ?? '알 수 없음',
      폰씀: platform === 'android',
      폰Chrome: platform === 'mobile' && mobileOn === 'vision', // 실행 창에서 고른 곳
      PC씀,
      serviceId,
      env: 줄.env,
      appPath: 줄.appPath,
    };

    // 프로시저 안 케이스는 프로시저가 통째로 돈다 — 그 케이스 하나만 따로 돌리는 길은 없다 (도메인/실행 §3.2 「테스트 프로시저 실행」)
    if ((행.proc_id ?? null) !== null) {
      // 못 도는 러너에는 프로시저 파일을 보내지 않는다 — 정식 실행과 같은 409 (도메인/실행 §3.2 「러너 능력」)
      if (await 프로시저못도는러너인가()) return reply.code(409).send({ error: 'RUNNER_NO_PROCEDURE' });
      const 감 = await 프로시저시험감({
        tcId, procId: 행.proc_id!, platform, historyId: 새번호(), 줄, 종류, serviceId, params: parsed.data.params, expected: parsed.data.expected,
      });
      if (감 === null) return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: tcId });
      if ('violations' in 감) return reply.code(400).send({ error: 'INVALID_PARAMS', detail: 감.violations[0]!.message, violations: 감.violations });
      return 시험을건다(감, 곳, reply);
    }

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
      platform,
      filePath: 행.file_path,
      baseUrl: 줄.baseUrl,
      cases: [{ tcId, params, expected }],
      timeoutMs: 항목제한ms(tcId, 제한ms),
      // 정식 실행과 같은 규칙 — 게임 애플리케이션이면 엔진 · 조작 맵의 돌발 팝업을 싣는다 (도메인/게임 §3.10 결정 6 · 31)
      ...엔진칸(종류, platform, 줄.adminKey), ...(await 돌발팝업을싣는다(종류, platform, serviceId)),
      // 정식 실행과 같은 규칙 — 그 대상 서버 줄에 API 인증이 있으면 싣는다 (도메인/API §3.8)
      ...(줄.apiAuths.length > 0 && { apiAuths: 줄.apiAuths }),
    };
    const 감: 시험감 = {
      요청,
      못감: (까닭, stack) => 못간답(요청, 까닭, stack),
      결과로: 한건,
      명세: [{ paramSchema: schemas.paramSchema, expectedSchema: schemas.expectedSchema, params, expected }],
      판: () => 케이스판(tcId),
      ...(행.step_titles !== null && { stepTitles: 행.step_titles }),
    };
    return 시험을건다(감, 곳, reply);
  });

  app.get<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId', async (req, reply) => {
    // 그 케이스의 시험만 읽는다 — 문은 주소의 tcId 로 권한을 봤다
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId, req.params.tcId);
    if (읽음 === null) return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    // 정식 실행 실패 카드와 같은 유형 · 한 줄이다. 보관소가 결과를 이미 가려 두어 여기서는 다시 안 가린다.
    // ponytail: 가린 뒤에 색 코드를 걷는다 — 숫자 비밀(예: 31)이 색 코드 속 숫자를 덮으면 한 줄에 깨진 글자가 남는다(비밀은 안 샌다). 거슬리면 보관할 때 가르게 옮긴다
    if (읽음.status === 'DONE') {
      // 프로시저면 케이스마다 한 건을 result 옆에 싣는다 — result 는 누른 케이스 한 건 그대로다 (도메인/실행 §7 「케이스 테스트 실행」)
      const { results, ...r } = 읽음.result;
      // 실패 유형은 누른 케이스의 절차로만 가른다 — result.steps 는 프로시저 전체라 다른 케이스의 실패 절차가 섞여 있다
      const 절차 = results?.find((c) => c.tcId === req.params.tcId)?.steps ?? r.steps;
      const failure = 항목실패를가른다({ status: r.status, finished: true, error: r.error, steps: 절차 }, (글) => 글);
      return { status: 읽음.status, result: r, ...(results !== undefined && { results }), failure };
    }
    // 러너에 보낸 시험만 지금 단계를 묻는다. 러너가 아직 모르거나 못 닿으면 빈 칸이다 — 오류가 아니다
    const 상태 = 읽음.status === 'RUNNING' ? 상태들.get(req.params.trialId) : undefined;
    // 단계 제목은 차례를 기다리는 중에도 싣는다 — 화면이 시작하자마자 전체 단계를 그린다 (도메인/실행 §7 「케이스 테스트 실행」)
    const 실음 = 상태?.stepTitles === undefined ? 읽음 : { ...읽음, stepTitles: 상태.stepTitles };
    if (상태?.보냄 !== true) return 실음;
    const 단계 = (await 시험진행()).find((s) => s.historyId === 상태.historyId);
    return 단계 === undefined ? 실음 : { ...실음, step: { seq: 단계.seq, title: 단계.title, elapsedMs: 단계.elapsedMs } };
  });

  // 시작한 사람만 멈춘다 — 남의 번호 · 다른 케이스 주소는 결과 읽기처럼 404 다.
  // 끝나는 것과 누르는 것이 겹치는 경합이라 이미 끝났으면 오류가 아니라 false 다 (도메인/실행 §7 「케이스 테스트 실행」)
  app.post<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId/abort', async (req, reply) => {
    const 사람 = req.user?.username ?? '알 수 없음';
    const { trialId } = req.params;
    const 읽음 = 읽는다(사람, trialId, req.params.tcId);
    if (읽음 === null) return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: trialId });
    const 상태 = 읽음.status === 'RUNNING' ? 상태들.get(trialId) : undefined;
    if (상태 === undefined) return { aborted: false };
    // 보낸 뒤면 결과는 러너 답 그대로다 — 겹치면 TIMEOUT · PASS · FAIL 일 수 있고 고쳐 쓰지 않는다.
    // ponytail: 보낸 직후 러너가 그 번호를 받기 전(/health 확인 · 전송 — 2초 안쪽)이면 false 다. 정식 실행 중단도 같은 틈이 있다
    if (상태.보냄) return { aborted: await abortRunner(상태.historyId) };
    상태.멈춤 = true;
    return { aborted: 닫는다(사람, trialId, 상태.중단답()) };
  });

  // 끝난 시험도 404 다 — 러너가 장면을 버렸고, 화면은 마지막으로 받은 장면을 그대로 둔다
  app.get<{ Params: { tcId: string; trialId: string } }>('/cases/:tcId/test-run/:trialId/live', async (req, reply) => {
    // 그 케이스의 시험만 읽는다 — 문은 주소의 tcId 로 권한을 봤다
    const 읽음 = 읽는다(req.user?.username ?? '알 수 없음', req.params.trialId, req.params.tcId);
    if (읽음?.status !== 'RUNNING') return reply.code(404).send({ error: 'TRIAL_NOT_FOUND', detail: req.params.trialId });
    return 장면을건넨다(reply, req.params.trialId);
  });
}
