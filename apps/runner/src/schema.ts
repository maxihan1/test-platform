// 러너 HTTP 계약(SPEC §5.2)의 요청 모양 — 입구가 이 꼴로 거른다. 라우트 처리는 routes.ts 가 한다

import { 앱파일값인가, type ScenarioLink, type ScenarioPart, type ScenarioResponseRef } from '@platform/kit';
import { 값주입이름 } from '@platform/kit/protocol';
import { z } from 'zod';

import { 앱단계에못거는것 } from './scenarioGate.js';

// 주소는 http(s) 만 받는다 — 규칙은 admin 설정과 같은 kit 의 것이다 (러너 §5.2 「대상 서버마다 다른 앱 파일」)
const 앱파일경로 = z.string().min(1).refine(앱파일값인가, 'app 은 파일 경로나 http(s) 주소여야 한다');
// 자식 환경변수와 HTTP 머리로 간다 — 줄바꿈 · 공백이 섞이면 머리가 깨지고 다른 머리를 끼워 넣을 수 있다. admin 이 pat_ 200자 이하만 받는다(auth/farmToken.ts)
const 팜토큰 = z.string().min(1).max(200).regex(/^\S+$/);

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
export const 판상한 = { bodyLimit: 16 * 1024 * 1024 };

// 성능 시나리오 녹화 — 오면 HAR 를 artifacts/perf-record/<jobId>/ 에 남긴다 (공통/3-공유계약 「성능 테스트 타입」)
const recordHar = z.object({ jobId: z.number().int().positive() }).optional();

// 게임 애플리케이션 항목만. 원문이 지나간다 — 머리는 kit 이 admin 요청에 넣는다 (공통/3-공유계약 「게임 테스트 타입」)
const adminKey = z.object({ header: z.string().min(1), value: z.string().min(1) }).optional();

export const executeRequest = z.object({
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
  // 누른 사람의 팜 토큰. 안 적으면 버려져 서버 몫 토큰으로 붙고, 그 사람이 잡은 폰을 팜이 거절한다 (도메인/러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
  farmToken: 팜토큰.optional(),
  // z.object 는 모르는 칸을 버린다 — 여기 안 적으면 게임 항목이 앱처럼 돈다 (도메인/러너 §5.2 종류 결정 3)
  engine: z.literal('GAME').optional(),
  adminKey,
  apiAuths,
  apiDoc,
  recordHar,
});

export const appScreenRequest = z.object({ app: 앱파일경로.optional(), udid: z.string().min(1).optional() });

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
    // 앱 · 게임 단계 — admin 이 애플리케이션 종류로 정해 싣는다. 창 대신 폰 연결로 돈다 (SPEC 도메인/시나리오 §3.7 결정 16)
    appStep: z.boolean().optional(),
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
// 한글은 한 글자가 3바이트라 글자 수로 재면 빠져나간다. 절대 경로로 풀고 판 원문을 경로로 바꾼 뒤에 잰다
export const 목록상한 = 120_000;


export const scenarioRequest = z
  .object({
    runId: z.number().nullable(),
    // 사진 폴더 경로(runs/trial/<trialId>/)에 그대로 들어간다. UUID 가 아니면 ../ 로 빠져나갈 수 있다
    trialId: z.string().uuid().optional(),
    platform: z.enum(['desktop', 'mobile', 'android']),
    // 폰 연결이 시나리오에 하나라 요청에 한 벌이다. 뜻은 /execute 의 같은 칸과 같다 (SPEC 도메인/시나리오 §3.7 결정 16)
    app: 앱파일경로.optional(),
    udid: z.string().min(1).optional(),
    farmToken: 팜토큰.optional(),
    engine: z.literal('GAME').optional(),
    adminKey,
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
  .refine((r) => r.runId !== null || r.trialId !== undefined, '시험 실행에는 trialId 가 있어야 한다')
  .superRefine((r, ctx) => {
    const 까닭 = 앱단계에못거는것(r.parts);
    if (까닭 !== undefined) ctx.addIssue({ code: 'custom', message: 까닭 });
  });

// 실행 묶음 전체를 끊는 일은 admin이 자기가 아는 historyId를 하나씩 부르는 것으로 한다.
// runId 단위 중단을 여기 두면 러너가 실행 묶음을 알아야 한다 (SPEC §5.2)
export const abortRequest = z.object({ historyId: z.number() });
