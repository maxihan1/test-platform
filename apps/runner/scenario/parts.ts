// E2E 시나리오의 부품을 차례로 돌리고 부품마다 결과 줄 한 줄을 흘린다. 브라우저에 닿는 일은 받은 함수로만 한다 (SPEC 도메인/러너 §5.2)
// 고정 spec 은 얇은 껍데기이고 판단은 전부 여기 있다 — 그래야 브라우저 없이 검사할 수 있다

// kit 은 타입만 가져온다. 값을 여기서 부르면 kit 파일이 ESM 으로 먼저 올라가, 뒤에 /tests 의 케이스가 require 로
// 같은 파일을 부를 때 러너 이미지에서 부딪힌다 (2026-09-28 이미지 실측). 줄 만들기는 고정 spec 이 한다
import type { ScenarioCaseOutcome, ScenarioPhase } from '@platform/kit/scenario';
import type { ItemStatus, ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult, StepResult } from '@platform/kit';

import { 꽂기, 새부품, 안걸린, type 미룬삭제, type 부품상태, type 상태, type 이음 } from './links.js';

type Part = ScenarioExecuteRequest['parts'][number];
type CasePart = Extract<Part, { kind: 'case' }>;

export type RouteHandler = (route: {
  fulfill(response: { status: number; contentType: string; body: string }): Promise<void>;
}) => Promise<void>;

// 브라우저 컨텍스트 하나와 그에 딸린 것. 러너가 열고 러너가 닫는다
export interface 창 {
  // 컨텍스트에 건다 — page.route() 는 팝업·새 탭에서 풀린다 (SPEC 도메인/시나리오 §3.7 결정 6)
  route(url: string, handler: RouteHandler): Promise<void>;
  unroute(url: string, handler: RouteHandler): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  // 창의 request — 브라우저 로그인(쿠키)을 같이 쓴다 (2026-09-28 사용자). API 부품은 감싸지 않은 것을 쓴다
  fetch(url: string, options: { method: string; data?: unknown }): Promise<{ status(): number }>;
  runCase(part: CasePart, seq: number, phase: ScenarioPhase, params: Record<string, unknown>): Promise<ScenarioCaseOutcome>;
  // 쿠키 · localStorage. 다음 창이 이것만 이어받는다 (SPEC 도메인/시나리오 §3.7 결정 3)
  state(): Promise<상태>;
  // 창 · 부품 request · 그 부품이 직접 만든 연결까지. 두 번 불러도 된다
  close(): Promise<void>;
}

export interface PartDeps {
  baseUrl: string;
  // 0 이면 한도 없음 — 루트 설정 timeout 0(무제한)에 모든 부품이 0ms 에 죽지 않게 (계획 결정 16)
  partTimeoutMs: number;
  이음: 이음;
  // 부품이 있으면 그 부품의 이어 주기를 그 창 · 그 창의 도구에 건다
  newWindow(state: 상태 | undefined, mocks: ReadonlyMap<string, RouteHandler>, 부품?: 부품상태): Promise<창>;
  // 응답 코드를 돌려준다. 못 보내면 던진다
  sendDelete(d: 미룬삭제): Promise<number>;
  write(result: ScenarioPartResult): void;
  writeCleanup(list: ScenarioCleanup[]): void;
}

// 한도에 걸린 부품의 절차를 받으려고 창을 닫은 뒤 기다리는 시간. 창이 닫히면 Playwright 동작이 바로 실패해 대개 곧 온다 (계획 결정 4)
const 늦은절차유예 = 5000;

// new URL(path, base) 로 합치면 대상 주소의 경로(/shop)가 날아간다. `//` 로 시작하는 path 는 러너 입구가 막는다
export function 주소(baseUrl: string, path: string): string {
  return baseUrl.replace(/\/+$/, '') + path;
}

// 앞 창의 쿠키 · localStorage 와 앞 부품 request 의 쿠키를 합친다. 같은 쿠키가 둘에 있으면 창 쪽 (SPEC 도메인/시나리오 §3.7 결정 3)
export function 합친상태(창쪽: 상태, 요청쪽: 상태): 상태 {
  const 열쇠 = (c: 상태['cookies'][number]) => `${c.name}\t${c.domain}\t${c.path}`;
  const 쿠키 = new Map(요청쪽.cookies.map((c) => [열쇠(c), c]));
  for (const c of 창쪽.cookies) 쿠키.set(열쇠(c), c);
  return { cookies: [...쿠키.values()], origins: 창쪽.origins };
}

function errorOf(thrown: unknown): { message: string; stack?: string } {
  const err = thrown instanceof Error ? thrown : new Error(String(thrown));
  return { message: err.message, ...(err.stack === undefined ? {} : { stack: err.stack }) };
}

// 먼저 끝나는 쪽을 받고 타이머를 지운다 — 남은 타이머가 자식 프로세스 종료를 늦추지 않게
async function 늦어도<T>(일: Promise<T>, ms: number): Promise<T | undefined> {
  let 타이머: ReturnType<typeof setTimeout> | undefined;
  return Promise.race([
    일,
    new Promise<undefined>((done) => {
      타이머 = setTimeout(() => done(undefined), ms);
    }),
  ]).finally(() => clearTimeout(타이머));
}

// 케이스 부품 하나를 부품 시험 한도 안에서 돌린다. 넘으면 상태를 찍고 창을 닫는다 — 끝없는 기다림이
// 시나리오 전체 제한 시간까지 가 판정 없음(TIMEOUT)이 되면 「틀린 건너뛰기는 언제나 빨강」이 깨진다 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」)
async function 한도안에(
  지금: 창,
  part: CasePart,
  seq: number,
  부품: 부품상태,
  params: Record<string, unknown>,
  한도: number,
): Promise<{ outcome: ScenarioCaseOutcome | undefined; 넘었다: boolean }> {
  const 달림 = 지금.runCase(part, seq, 부품.phase, params);
  if (한도 <= 0) return { outcome: await 달림, 넘었다: false };

  // 달림이 던지면 그대로 던진다 — 부르는 쪽이 이음 오류와 함께 실패 줄로 적는다
  const 먼저 = await 늦어도(달림.then((outcome) => ({ outcome })), 한도);
  if (먼저 !== undefined) return { outcome: 먼저.outcome, 넘었다: false };

  // 닫힌 도구로 늦게 온 미룬 삭제가 이 상태로 나간다 (계획 결정 6)
  부품.찍은상태 = await 지금.state().catch(() => undefined);
  await 지금.close().catch(() => undefined);
  const 늦음 = await 늦어도(달림.catch(() => undefined), 늦은절차유예);
  return { outcome: 늦음, 넘었다: true };
}

export async function runParts(parts: readonly Part[], deps: PartDeps): Promise<void> {
  let seq = 0;
  // 끄려면 걸 때의 핸들러가 있어야 한다. 무늬 하나에 하나만 — 같은 무늬를 또 걸면 옛 것을 먼저 푼다
  const 걸린 = new Map<string, RouteHandler>();
  const { 이음 } = deps;

  // 맨 앞이 API 부품이어도 쿠키를 쌓을 자리가 있게 빈 창 하나로 시작한다. 창은 연 쪽(러너)이 닫는다 — 실패로 멈춰도
  let 지금창 = await deps.newWindow(undefined, 걸린);

  try {
    for (const [i, part] of parts.entries()) {
      const startedAt = Date.now();
      let status: ItemStatus = 'PASS';
      let steps: StepResult[] = [];
      let error: { message: string; stack?: string } | undefined;
      let bound: Record<string, unknown> | undefined;
      // 케이스를 돌리기 시작한 부품 — 예외로 끝나도 이음 오류 · 안 걸린 이어 주기를 실어야 해서 블록 밖에 둔다
      let 돈부품: 부품상태 | undefined;

      try {
        switch (part.kind) {
          case 'case': {
            const 부품 = 새부품(i + 1, part.links);
            const 꽂음 = await 꽂기(이음, part, 부품);
            if ('오류' in 꽂음) {
              status = 'FAIL';
              error = { message: 꽂음.오류 };
              break;
            }
            bound = 꽂음.bound;

            // 부품마다 새 창 — 앞 케이스의 시계 고정 · 주입 스크립트가 뒤로 새지 않게 로그인 상태만 넘긴다 (SPEC 도메인/시나리오 §3.7 결정 3)
            const 넘김 = part.carryOver === false ? undefined : await 지금창.state();
            const 앞창 = 지금창;
            // 앞 창을 닫다가 던져도 새 창이 지금 창이어야 끝에 닫힌다
            지금창 = await deps.newWindow(넘김, 걸린, 부품);
            await 앞창.close();

            돈부품 = 부품;
            const { outcome, 넘었다 } = await 한도안에(지금창, part, seq, 부품, 꽂음.params, deps.partTimeoutMs);
            if (outcome !== undefined) {
              seq = outcome.seq;
              steps = outcome.steps;
              if (outcome.failed) {
                status = 'FAIL';
                error = outcome.error;
              }
            }
            if (넘었다) {
              status = 'FAIL';
              error = { message: `부품 제한 시간 ${deps.partTimeoutMs}ms 를 넘었다` };
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
            // 케이스의 API 요청도 같은 모킹을 거친다. 다시 걸면 맨 뒤로 — 브라우저 route 처럼 나중 것이 이긴다 (SPEC 도메인/시나리오 §3.7 결정 6)
            이음.모킹.delete(part.urlPattern);
            이음.모킹.set(part.urlPattern, { status: 코드, contentType, body });
            break;
          }
          case 'unmock': {
            // 안 건 무늬를 끄는 것은 이미 원하는 상태다. 실패로 만들 까닭이 없다
            const handler = 걸린.get(part.urlPattern);
            if (handler !== undefined) {
              await 지금창.unroute(part.urlPattern, handler);
              걸린.delete(part.urlPattern);
            }
            이음.모킹.delete(part.urlPattern);
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

      if (돈부품 !== undefined) {
        // 이음 오류가 먼저다 — 돌려줄 응답이 없어 막은 요청 때문에 케이스가 net::ERR_FAILED 로 먼저 실패하면 원인이 가려진다 (계획 결정 12)
        const 이음오류 = 돈부품.오류;
        if (이음오류 !== undefined) {
          status = 'FAIL';
          error = { ...error, message: error === undefined ? 이음오류 : `${이음오류} · ${error.message}` };
        }
        const 안 = status === 'FAIL' ? 안걸린(돈부품) : undefined;
        if (안 !== undefined) error = { ...error, message: error === undefined ? 안 : `${error.message}\n${안}` };
      }

      deps.write({
        seq: i + 1,
        status,
        durationMs: Date.now() - startedAt,
        steps,
        mocks: [...걸린.keys()],
        ...(bound === undefined ? {} : { bound }),
        ...(error === undefined ? {} : { error }),
      });

      // 실패한 부품에서 멈춘다. 뒤 부품을 NOT_RUN 으로 채우는 일은 러너가 한다 — 자식이 죽어도 채울 수 있어야 한다
      if (status === 'FAIL') break;
    }
  } finally {
    // 멈춰도 미룬 삭제는 보낸다 — 안 보내면 앞 부품이 만든 데이터가 대상 서버에 남는다 (SPEC 도메인/시나리오 §3.7 결정 9)
    deps.writeCleanup(await 뒷정리(deps));
    await 지금창.close();
  }
}

// 거꾸로 보낸다 — 나중에 만든 것이 먼저 만든 것에 기대 있을 수 있다. 하나가 실패해도 나머지는 보낸다 (계획 결정 15)
async function 뒷정리(deps: PartDeps): Promise<ScenarioCleanup[]> {
  // 보내는 동안 늦게 온 삭제가 목록에 끼지 않게 먼저 얼린다 — 얼린 뒤 삭제는 미루지 않고 그대로 나간다
  deps.이음.얼림 = true;
  const 보냄: ScenarioCleanup[] = [];
  for (const d of [...deps.이음.미룸].reverse()) {
    const 줄 = { fromSeq: d.fromSeq, method: 'DELETE' as const, url: d.url };
    try {
      보냄.push({ ...줄, status: await deps.sendDelete(d) });
    } catch (thrown) {
      보냄.push({ ...줄, error: errorOf(thrown).message });
    }
  }
  return 보냄;
}
