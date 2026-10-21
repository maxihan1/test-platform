// 러너 HTTP 계약(SPEC §5.2)의 라우트를 등록한다. 포트를 여는 일은 server.ts가 한다 —
// listen을 라우트와 같은 파일에 두면 테스트가 import하는 순간 포트가 열려 붙지 못한다

import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';

import { 앱파일값인가, type ScenarioLink, type ScenarioPart, type ScenarioResponseRef } from '@platform/kit';
import { 값주입이름 } from '@platform/kit/protocol';
import type { FastifyInstance } from 'fastify';
import { z } from 'zod';

import { 앱화면을읽는다, 화면을읽는중인가 } from './appScreen.js';
import { abort, execute, resolveSpecPath, running, testsDir } from './execute.js';
import { 팜증적받기를줄세운다 } from './farmEvidence.js';
import { registerPerfDeviceRoutes } from './perfDevice.js';
import { executeScenario } from './scenario.js';

const require = createRequire(import.meta.url);
// 이미지 태그와 라이브러리 버전이 어긋나면 브라우저를 못 찾는다. /health가 그 확인 창구다 (SPEC §9)
const { version: playwrightVersion } = require('@playwright/test/package.json') as { version: string };

// 주소는 http(s) 만 받는다 — 규칙은 admin 설정과 같은 kit 의 것이다 (러너 §5.2 「대상 서버마다 다른 앱 파일」)
const 앱파일경로 = z.string().min(1).refine(앱파일값인가, 'app 은 파일 경로나 http(s) 주소여야 한다');

// 비밀값 원문이 지나간다. 모양만 보고 그대로 kit 에 넘긴다 — 토큰 받기는 kit 몫이다 (SPEC 도메인/러너 §5.2 「API 케이스 실행」)
const apiAuths = z
  .array(
    z.object({
      name: z.string().min(1).max(20),
      tokenUrl: z
        .string()
        .refine((u) => (u.startsWith('/') && !u.startsWith('//')) || /^https?:\/\//.test(u), '토큰 주소는 / 로 시작하거나 http(s) 주소여야 한다'),
      clientId: z.string().min(1),
      clientSecret: z.string(),
    }),
  )
  .optional();

// 케이스가 만들어진 판 원문. 모양 확인은 kit 몫이라 판 번호만 본다 (SPEC 도메인/러너 §5.2 「API 케이스 실행」)
const apiDoc = z.object({ version: z.number().int().min(1), doc: z.record(z.string(), z.unknown()) }).optional();

// 판 원문이 5MB 까지라 Fastify 기본 상한(1MiB)이면 413 이 난다 (SPEC 도메인/러너 §5.2 「API 케이스 실행」)
const 판상한 = { bodyLimit: 16 * 1024 * 1024 };

// 성능 시나리오 녹화 — 오면 HAR 를 artifacts/perf-record/<jobId>/ 에 남긴다 (공통/3-공유계약 「성능 테스트 타입」)
const recordHar = z.object({ jobId: z.number().int().positive() }).optional();

const executeRequest = z.object({
  runId: z.number(),
  historyId: z.number(),
  tcId: z.string(),
  platform: z.enum(['desktop', 'mobile', 'android']),
  filePath: z.string(),
  baseUrl: z.string(),
  params: z.record(z.string(), z.unknown()),
  expected: z.record(z.string(), z.unknown()),
  timeoutMs: z.number().int().positive().default(300_000),
  app: 앱파일경로.optional(),
  udid: z.string().min(1).optional(),
  apiAuths,
  apiDoc,
  recordHar,
});

const appScreenRequest = z.object({ app: 앱파일경로.optional(), udid: z.string().min(1).optional() });

// `//host` 는 / 로 시작해도 다른 호스트로 풀린다. 대상 주소 밖으로 못 나가게 여기서 막는다
const 대상경로 = z.string().startsWith('/').refine((p) => !p.startsWith('//'), '경로가 // 로 시작한다');
const scenarioMethod = z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']);
// 0번 부품은 없다. 부품 번호는 1부터다
const 부품번호 = z.number().int().positive();
const responseRef = z.object({
  fromSeq: 부품번호,
  method: scenarioMethod,
  urlPattern: z.string().min(1),
  jsonPath: z.string().min(1),
});

// 이어 주기 종류의 정본은 SPEC 도메인/시나리오 §3.7 결정 12 「이어 주기」 표다.
// 넘겨받기를 끈 부품에 이어 주기가 달렸는지는 admin 조립 검사가 본다 — 입구는 모양만 본다
const scenarioLink = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('reuse'), method: scenarioMethod, urlPattern: z.string().min(1), fromSeq: 부품번호 }),
  z.object({ kind: z.literal('block'), method: scenarioMethod, urlPattern: z.string().min(1) }),
  z.object({
    kind: z.literal('rewrite'),
    method: scenarioMethod,
    urlPattern: z.string().min(1),
    // {} 자리가 없으면 앞 데이터가 아니라 모음 주소(PUT /api/todos)로 가고, 둘이면 첫 자리만 바뀐다 — 꼭 하나 (SPEC 도메인/시나리오 §3.7 결정 12 「값 꺼내기」)
    to: z.object({ method: z.enum(['PUT', 'PATCH']), path: 대상경로.refine((p) => p.split('{}').length === 2, '수정 요청 경로에 {} 자리가 꼭 하나 있어야 한다'), value: responseRef }),
  }),
  z.object({ kind: z.literal('bind'), param: z.string().min(1), value: responseRef }),
]);

// E2E 시나리오 조립 목록. 부품 종류와 대기 상한의 정본은 SPEC 도메인/시나리오 §3.7 「부품」 표다 — 여기는 그것을 옮긴 것이다
const scenarioPart = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('case'),
    tcId: z.string().min(1),
    params: z.record(z.string(), z.unknown()),
    expected: z.record(z.string(), z.unknown()),
    skipSteps: z.array(z.string()),
    // z.object 는 모르는 칸을 오류 없이 버린다. 여기 안 적으면 admin 이 실어 보낸 이어 주기가 러너에서 조용히 사라진다
    carryOver: z.boolean().optional(),
    links: z.array(scenarioLink).optional(),
    filePath: z.string().min(1),
    // 시작 애플리케이션이 아닌 단계가 돌 주소. 없으면 요청 전체 baseUrl (SPEC 도메인/시나리오 §3.7 결정 13)
    baseUrl: z.string().url().optional(),
    apiAuths,
    apiDoc,
  }),
  z.object({
    kind: z.literal('api'),
    method: scenarioMethod,
    path: 대상경로,
    body: z.unknown().optional(),
    expectStatus: z.number().int(),
    baseUrl: z.string().url().optional(),
    // API 인증 이름 · 값 주입 · 응답 값 확인 (SPEC 도메인/시나리오 §3.7 결정 14). 이름이 인증 목록에 있는지는 부를 때 본다
    auth: z.string().min(1).max(20).optional(),
    values: z.array(z.object({ name: z.string().regex(값주입이름), value: responseRef })).optional(),
    expectJson: z.array(z.object({ jsonPath: z.string().min(1), equals: z.unknown() })).optional(),
    apiAuths,
  }),
  z.object({
    kind: z.literal('mock'),
    urlPattern: z.string().min(1),
    status: z.number().int(),
    contentType: z.string(),
    body: z.string(),
  }),
  z.object({ kind: z.literal('unmock'), urlPattern: z.string().min(1) }),
  z.object({ kind: z.literal('wait'), ms: z.number().int().positive().max(60_000) }),
]);

// kit 에 칸이 더해졌는데 여기 안 적으면 입구가 그 칸을 조용히 버린다 — 빠진 칸 이름이 typecheck 오류로 뜬다.
// case 갈래는 kit 에 없는 filePath 를 더 가지므로 「kit 에 있는데 zod 에 없는 칸」 쪽만 본다
type 빠진칸<K, Z> = Exclude<keyof K, keyof Z>;
type 입구이어주기<K> = Extract<z.infer<typeof scenarioLink>, { kind: K }>;
({}) satisfies Record<
  | 빠진칸<Extract<ScenarioPart, { kind: 'case' }>, Extract<z.infer<typeof scenarioPart>, { kind: 'case' }>>
  // service 는 admin 이 baseUrl 로 풀어 보낸다 — 러너는 안 받는다
  | Exclude<빠진칸<Extract<ScenarioPart, { kind: 'api' }>, Extract<z.infer<typeof scenarioPart>, { kind: 'api' }>>, 'service'>
  | 빠진칸<Extract<ScenarioLink, { kind: 'reuse' }>, 입구이어주기<'reuse'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'block' }>, 입구이어주기<'block'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>, 입구이어주기<'rewrite'>>
  | 빠진칸<Extract<ScenarioLink, { kind: 'rewrite' }>['to'], 입구이어주기<'rewrite'>['to']>
  | 빠진칸<Extract<ScenarioLink, { kind: 'bind' }>, 입구이어주기<'bind'>>
  | 빠진칸<ScenarioResponseRef, z.infer<typeof responseRef>>,
  never
>;

// 조립 목록은 환경변수 하나로 넘긴다. 리눅스는 값 하나를 128KiB **바이트**로 자른다 — 넘으면 자식을 못 띄워 500 이 된다.
// 한글은 한 글자가 3바이트라 글자 수로 재면 빠져나간다. 절대 경로로 푼 뒤에 잰다
const 목록상한 = 120_000;

const scenarioRequest = z
  .object({
    runId: z.number().nullable(),
    // 사진 폴더 경로(runs/trial/<trialId>/)에 그대로 들어간다. UUID 가 아니면 ../ 로 빠져나갈 수 있다
    trialId: z.string().uuid().optional(),
    platform: z.enum(['desktop', 'mobile']),
    baseUrl: z.string(),
    parts: z.array(scenarioPart).min(1),
    // 시나리오 제한 시간은 60분을 넘지 않는다 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」)
    timeoutMs: z.number().int().positive().max(3_600_000),
    // 서비스 지도가 본 DELETE 마다 한 줄이다. 자식 환경변수로 가므로 줄 수를 막는다 — 1000줄이면 약 60KB
    deleteStatuses: z
      .array(z.object({ host: z.string().max(255), path: z.string().max(2000), status: z.number().int().min(200).max(299) }))
      .max(1000)
      .optional(),
    recordHar,
  })
  .refine((r) => r.runId !== null || r.trialId !== undefined, '시험 실행에는 trialId 가 있어야 한다');

// 실행 묶음 전체를 끊는 일은 admin이 자기가 아는 historyId를 하나씩 부르는 것으로 한다.
// runId 단위 중단을 여기 두면 러너가 실행 묶음을 알아야 한다 (SPEC §5.2)
const abortRequest = z.object({ historyId: z.number() });

export function registerRoutes(app: FastifyInstance): void {
  app.get('/health', async () => ({ ok: true, playwrightVersion }));

  registerPerfDeviceRoutes(app);

  app.post('/execute', 판상한, async (request, reply) => {
    const parsed = executeRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    const req = parsed.data;
    const specPath = resolveSpecPath(testsDir, req.filePath);
    if (specPath === null || !existsSync(specPath)) {
      return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: req.filePath });
    }

    try {
      const res = await execute(req, specPath);
      // 큰 영상을 받느라 답이 늦으면 admin 의 디바이스 줄이 막힌다. 답한 뒤에 받는다 (SPEC 도메인/러너 §5.2 「디바이스 팜 접속 방식」)
      if (req.platform === 'android') 팜증적받기를줄세운다(req.runId, req.historyId, res.status);
      return res;
    } catch (err) {
      // 자식 프로세스를 띄우지도 못한 경우다. 케이스 실패가 아니라 러너 고장이므로 500이다 (SPEC §5.2)
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 작성 AI 가 앱 케이스를 쓰려고 폰 화면을 읽는다. 돌고 있는 앱 항목이 있으면 폰을 가로채니 막는다 —
  // 브라우저 항목은 폰을 안 쓴다. 서버 러너가 팜 폰을 읽게 된 뒤로 웹 실행 중에도 읽혀야 한다 (SPEC 도메인/러너 §5.2 「앱 화면 읽기」)
  app.post('/app-screen', async (request, reply) => {
    const parsed = appScreenRequest.safeParse(request.body ?? {});
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }
    if ([...running.values()].some((r) => r.platform === 'android') || 화면을읽는중인가()) {
      return reply.code(409).send({ error: 'RUNNER_BUSY', detail: '이 러너가 이미 실행이나 화면 읽기를 하고 있다' });
    }
    try {
      return { screen: await 앱화면을읽는다(parsed.data) };
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 시나리오 1개 = 프로세스 1개. 진행 알림과 중단 통로는 없다 — 제한 시간이 상한이다 (SPEC 도메인/러너 §5.2)
  app.post('/execute-scenario', 판상한, async (request, reply) => {
    const parsed = scenarioRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    // 케이스 부품도 /execute 와 같은 경로 검사를 지난다. 자식의 작업 폴더가 달라 절대 경로로 풀어 넘긴다
    const parts = [];
    for (const part of parsed.data.parts) {
      if (part.kind !== 'case') {
        parts.push(part);
        continue;
      }
      const specPath = resolveSpecPath(testsDir, part.filePath);
      if (specPath === null) {
        return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `테스트 뿌리 밖이다: ${part.filePath}` });
      }
      if (!existsSync(specPath)) {
        return reply.code(404).send({ error: 'CASE_NOT_FOUND', detail: part.filePath });
      }
      parts.push({ ...part, filePath: specPath });
    }
    if (Buffer.byteLength(JSON.stringify(parts)) > 목록상한) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: `단계 목록이 ${목록상한}바이트를 넘는다` });
    }

    try {
      return await executeScenario({ ...parsed.data, parts });
    } catch (err) {
      // 자식 프로세스를 띄우지도 못한 경우다. 러너 고장이므로 500이다 (SPEC §5.2)
      const detail = err instanceof Error ? err.message : String(err);
      return reply.code(500).send({ error: 'RUNNER_ERROR', detail });
    }
  });

  // 경과를 여기서 그때그때 재서 낸다. 시작 시각을 보내면 화면 기계의 시계와 어긋난 만큼이
  // 그대로 오차가 된다 — 러너는 컨테이너 안이다 (SPEC §5.2)
  // **historyId 는 지도의 열쇠를 쓴다.** progress.step 안의 값은 자식이 stdout 에 스스로 적은 것이라
  // 케이스 코드가 남의 번호를 찍으면 그 절차 제목이 남의 실행 화면에 뜬다 — admin 의 거르기는
  // 「이 실행의 항목인가」만 보므로 그대로 통과한다. 러너는 진짜 값을 이미 알고 있다 (execute() 가 건 열쇠다)
  app.get('/progress', async () => ({
    items: [...running.entries()].flatMap(([historyId, { progress }]) =>
      progress === undefined
        ? []
        : [{ ...progress.step, historyId, elapsedMs: Date.now() - progress.시작한때 }],
    ),
  }));

  app.post('/abort', async (request, reply) => {
    const parsed = abortRequest.safeParse(request.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_REQUEST', detail: parsed.error.message });
    }

    // 이미 끝났거나 모르는 historyId면 false다. 경합이지 고장이 아니므로 404로 만들지 않는다 (SPEC §5.2)
    return { aborted: abort(parsed.data.historyId) };
  });
}
