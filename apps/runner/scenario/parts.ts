// E2E 시나리오의 부품을 차례로 돌리고 부품마다 결과 줄 한 줄을 흘린다. 브라우저에 닿는 일은 받은 함수로만 한다 (SPEC 도메인/러너 §5.2)
// 고정 spec 은 얇은 껍데기이고 판단은 전부 여기 있다 — 그래야 브라우저 없이 검사할 수 있다

// kit 은 타입만 가져온다. 값을 여기서 부르면 kit 파일이 ESM 으로 먼저 올라가, 뒤에 /tests 의 케이스가 require 로
// 같은 파일을 부를 때 러너 이미지에서 부딪힌다 (2026-09-28 이미지 실측). 줄 만들기는 고정 spec 이 한다
import type { BrowserContext } from '@playwright/test';
import type { ScenarioCaseOutcome, ScenarioPhase } from '@platform/kit/scenario';
import type { ItemStatus, ScenarioExecuteRequest, ScenarioPartResult, StepResult } from '@platform/kit';

type Part = ScenarioExecuteRequest['parts'][number];
type CasePart = Extract<Part, { kind: 'case' }>;

export type RouteHandler = (route: {
  fulfill(response: { status: number; contentType: string; body: string }): Promise<void>;
}) => Promise<void>;

// 쿠키 · localStorage. 다음 창이 이것만 이어받는다 (SPEC 도메인/시나리오 §3.7 결정 3)
type 상태 = Awaited<ReturnType<BrowserContext['storageState']>>;

// 브라우저 컨텍스트 하나와 그에 딸린 것. 러너가 열고 러너가 닫는다
export interface 창 {
  // 컨텍스트에 건다 — page.route() 는 팝업·새 탭에서 풀린다 (SPEC 도메인/시나리오 §3.7 결정 6)
  route(url: string, handler: RouteHandler): Promise<void>;
  unroute(url: string, handler: RouteHandler): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  // 창의 request — 브라우저 로그인(쿠키)을 같이 쓴다 (2026-09-28 사용자)
  fetch(url: string, options: { method: string; data?: unknown }): Promise<{ status(): number }>;
  runCase(part: CasePart, seq: number, phase: ScenarioPhase, params: Record<string, unknown>): Promise<ScenarioCaseOutcome>;
  state(): Promise<상태>;
  close(): Promise<void>;
}

export interface PartDeps {
  baseUrl: string;
  partTimeoutMs: number;
  newWindow(state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>): Promise<창>;
  write(result: ScenarioPartResult): void;
}

// new URL(path, base) 로 합치면 대상 주소의 경로(/shop)가 날아간다. `//` 로 시작하는 path 는 러너 입구가 막는다
export function 주소(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, '') + path;
}

function errorOf(thrown: unknown): { message: string; stack?: string } {
  const err = thrown instanceof Error ? thrown : new Error(String(thrown));
  return { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
}

export async function runParts(parts: readonly Part[], deps: PartDeps): Promise<void> {
  let seq = 0;
  // 끄려면 걸 때의 핸들러가 있어야 한다. 무늬 하나에 하나만 — 같은 무늬를 또 걸면 옛 것을 먼저 푼다
  const 걸린 = new Map<string, RouteHandler>();

  // 창은 연 쪽(러너)이 닫는다 — 실패로 멈춰도
  const 지금창 = await deps.newWindow(undefined, 걸린);

  try {
    for (const [i, part] of parts.entries()) {
      const startedAt = Date.now();
      let status: ItemStatus = 'PASS';
      let steps: StepResult[] = [];
      let error: { message: string; stack?: string } | undefined;

      try {
        switch (part.kind) {
          case 'case': {
            const outcome = await 지금창.runCase(part, seq, { started: false, inStep: 0, judged: false }, part.params);
            seq = outcome.seq;
            steps = outcome.steps;
            if (outcome.failed) {
              status = 'FAIL';
              error = outcome.error;
            }
            break;
          }
          case 'api': {
            const res = await 지금창.fetch(주소(deps.baseUrl, part.path), {
              method: part.method,
              ...(part.body === undefined ? {} : { data: part.body }),
            });
            if (res.status() !== part.expectStatus) {
              status = 'FAIL';
              error = { message: `응답 코드 ${res.status()} — 기대 ${part.expectStatus}` };
            }
            break;
          }
          case 'mock': {
            const 옛것 = 걸린.get(part.urlPattern);
            if (옛것 !== undefined) await 지금창.unroute(part.urlPattern, 옛것);
            const { status: 코드, contentType, body } = part;
            const handler: RouteHandler = (route) => route.fulfill({ status: 코드, contentType, body });
            await 지금창.route(part.urlPattern, handler);
            걸린.set(part.urlPattern, handler);
            break;
          }
          case 'unmock': {
            // 안 건 무늬를 끄는 것은 이미 원하는 상태다. 실패로 만들 까닭이 없다
            const handler = 걸린.get(part.urlPattern);
            if (handler !== undefined) {
              await 지금창.unroute(part.urlPattern, handler);
              걸린.delete(part.urlPattern);
            }
            break;
          }
          case 'wait':
            await 지금창.waitForTimeout(part.ms);
            break;
        }
      } catch (thrown) {
        // 줄 없이 끝나면 러너가 이 부품을 「안 돌았음」으로 채워 원인이 사라진다. 실패 줄로 남긴다
        status = 'FAIL';
        error = errorOf(thrown);
      }

      deps.write({
        seq: i + 1,
        status,
        durationMs: Date.now() - startedAt,
        steps,
        mocks: [...걸린.keys()],
        ...(error === undefined ? {} : { error }),
      });

      // 실패한 부품에서 멈춘다. 뒤 부품을 NOT_RUN 으로 채우는 일은 러너가 한다 — 자식이 죽어도 채울 수 있어야 한다
      if (status === 'FAIL') return;
    }
  } finally {
    await 지금창.close();
  }
}
