// E2E 시나리오의 부품을 차례로 돌리고 부품마다 결과 줄 한 줄을 흘린다. 브라우저에 닿는 일은 받은 함수로만 한다 (SPEC 도메인/러너 §5.2)
// 고정 spec 은 얇은 껍데기이고 판단은 전부 여기 있다 — 그래야 브라우저 없이 검사할 수 있다

// kit 은 타입만 가져온다. 값을 여기서 부르면 kit 파일이 ESM 으로 먼저 올라가, 뒤에 /tests 의 케이스가 require 로
// 같은 파일을 부를 때 러너 이미지에서 부딪힌다 (2026-09-28 이미지 실측). 줄 만들기는 고정 spec 이 한다
import type { ScenarioCaseOutcome, ScenarioPhase } from '@platform/kit/scenario';
import type { ItemStatus, ScenarioCleanup, ScenarioExecuteRequest, ScenarioPartResult, StepResult } from '@platform/kit';

import { API단계, type 토큰모음 } from './apiPart.js';
import { 꽂기, 새부품, 안걸린, type CasePart, type 미룬삭제, type 부품상태, type 상태, type 이음 } from './links.js';

type Part = ScenarioExecuteRequest['parts'][number];

export type RouteHandler = (route: {
  fulfill(response: { status: number; contentType: string; body: string }): Promise<void>;
}) => Promise<void>;

// 케이스 단계 하나가 도는 자리. 웹 단계는 공용 창 위에, 앱 · 게임 단계는 폰 연결 위에 연다
export interface 단계창 {
  runCase(part: CasePart, seq: number, phase: ScenarioPhase, params: Record<string, unknown>): Promise<ScenarioCaseOutcome>;
  // 창 쿠키 · localStorage 에 그 단계 request 의 쿠키를 합친 것 — 한도에 걸린 단계의 늦은 미룬 삭제가 이것으로 나간다
  state(): Promise<상태>;
  // 단계 끝 — 단계 request · 그 단계가 직접 만든 창과 연결을 닫고, 웹 단계는 단계가 건 것을 되돌린다(시나리오 §3.7 결정 3 「단계 끝 되돌리기」).
  // 끊음은 한도에 걸렸을 때다 — 웹 단계는 케이스가 아직 탭을 쥐고 돌아 공용 창째 닫는다. 두 번 불러도 된다
  close(끊음?: boolean): Promise<void>;
}

// 시나리오 끝까지 쓰는 브라우저 창 하나 · 탭 하나. 러너가 열고 러너가 닫는다 (SPEC 도메인/시나리오 §3.7 결정 3)
export interface 창 {
  // 컨텍스트에 건다 — page.route() 는 팝업·새 탭에서 풀린다 (SPEC 도메인/시나리오 §3.7 결정 6)
  route(url: string, handler: RouteHandler): Promise<void>;
  unroute(url: string, handler: RouteHandler): Promise<void>;
  waitForTimeout(ms: number): Promise<void>;
  // 창의 request — 브라우저 로그인(쿠키)을 같이 쓴다 (2026-09-28 사용자). API 부품은 감싸지 않은 것을 쓴다.
  // 머리 · form 은 API 인증 토큰 받기와 Bearer 머리다 (SPEC 도메인/시나리오 §3.7 결정 14)
  fetch(
    url: string,
    options: { method: string; data?: unknown; form?: Record<string, string>; headers?: Record<string, string> },
  ): Promise<{ status(): number; text(): Promise<string>; headers(): Record<string, string> }>;
  // 웹 단계 하나를 이 창 · 이 탭에서 연다. 넘겨받기를 끈 단계면 먼저 로그인 상태를 비운다 (SPEC 도메인/시나리오 §3.7 결정 12 「넘겨받기 끔」)
  단계(부품: 부품상태, 넘겨받기: boolean): Promise<단계창>;
  // 쿠키 · localStorage — 앱 · 게임 단계의 request 가 이것으로 로그인한다
  state(): Promise<상태>;
  // 두 번 불러도 된다
  close(): Promise<void>;
}

export interface PartDeps {
  baseUrl: string;
  // 0 이면 한도 없음 — 루트 설정 timeout 0(무제한)에 모든 부품이 0ms 에 죽지 않게 (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」)
  partTimeoutMs: number;
  이음: 이음;
  // 시나리오를 시작할 때 한 번 부른다. mocks 는 걸린 모킹 목록 — 케이스가 직접 만드는 창에도 다시 건다
  newWindow(mocks: ReadonlyMap<string, RouteHandler>): Promise<창>;
  // 앱 · 게임 단계 자리. 폰 연결은 그 안에서 하나를 같이 쓴다. 없으면 앱 단계가 실패한다
  // state 는 앞 웹 창의 로그인 상태 — 앱 단계 케이스 코드의 request · api 도 그 로그인으로 부른다(웹 단계처럼)
  appWindow?(부품: 부품상태, state: 상태): Promise<단계창>;
  // 앱 · 게임 단계 하나의 한도 — android project 한도다. 없으면 partTimeoutMs (SPEC 도메인/시나리오 §3.7 「동시성 · 시간」)
  appPartTimeoutMs?: number;
  // 응답 코드를 돌려준다. 못 보내면 던진다. 한도는 Playwright 요청 한도로 건다 — 바깥 상한은 그보다 늦게 걸어야 날아가는 삭제와 다음 삭제가 겹치지 않는다
  sendDelete(d: 미룬삭제, 한도: number): Promise<number>;
  write(result: ScenarioPartResult): void;
  writeCleanup(list: ScenarioCleanup[]): void;
}

// 한도에 걸린 부품의 절차를 받으려고 창을 닫은 뒤 기다리는 시간. 창이 닫히면 Playwright 동작이 바로 실패해 대개 곧 온다.
// 닫기 전 상태 읽기에도 같은 상한을 건다 — 멈춘 창에서 안 돌아오면 부품 한도가 무력해진다 (SPEC 도메인/러너 §5.2 「부품 시험 한도」)
const 늦은절차유예 = 5000;
// 부품 한도가 0(없음)일 때 미룬 삭제 하나를 기다리는 상한 — 대상 서버가 안 답해도 다 통과한 시나리오가 판정 없음이 되지 않게 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
const 뒷정리상한 = 30_000;

// 같은 쿠키인지 — (이름 · 도메인 · 경로). 합친상태와 단계 끝 쿠키 더하기(browser.ts)가 같은 열쇠를 쓴다
export const 쿠키열쇠 = (c: 상태['cookies'][number]) => `${c.name}\t${c.domain}\t${c.path}`;

// 창의 쿠키 · localStorage 와 단계 request 의 쿠키를 합친다. 같은 쿠키가 둘에 있으면 창 쪽 (SPEC 도메인/시나리오 §3.7 결정 3)
export function 합친상태(창쪽: 상태, 요청쪽: 상태): 상태 {
  const 쿠키 = new Map(요청쪽.cookies.map((c) => [쿠키열쇠(c), c]));
  for (const c of 창쪽.cookies) 쿠키.set(쿠키열쇠(c), c);
  return { cookies: [...쿠키.values()], origins: 창쪽.origins };
}

// 닫기 · 상태 읽기 실패는 결과를 바꾸지 않지만 흔적은 남긴다 — 창이 새는 것을 나중에 찾을 수 있게. window.ts 도 쓴다
export function 남김(무엇: string) {
  return (thrown: unknown): undefined => {
    console.warn(`[runner] ${무엇}: ${thrown instanceof Error ? thrown.message : String(thrown)}`);
    return undefined;
  };
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
  지금: 단계창,
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

  // 닫힌 도구로 늦게 온 미룬 삭제가 이 상태로 나간다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
  부품.찍은상태 = await 늦어도(지금.state(), 늦은절차유예).catch(남김(`${part.tcId} 한도에 걸린 창 상태를 못 읽었다`));
  await 지금.close(true).catch(남김(`${part.tcId} 한도에 걸린 창을 못 닫았다`));
  const 늦음 = await 늦어도(달림.catch(() => undefined), 늦은절차유예);
  return { outcome: 늦음, 넘었다: true };
}

export async function runParts(parts: readonly Part[], deps: PartDeps): Promise<void> {
  let seq = 0;
  // 끄려면 걸 때의 핸들러가 있어야 한다. 무늬 하나에 하나만 — 같은 무늬를 또 걸면 옛 것을 먼저 푼다
  const 걸린 = new Map<string, RouteHandler>();
  const { 이음 } = deps;
  const 토큰들: 토큰모음 = new Map();

  // 창 하나 · 탭 하나로 시나리오 끝까지 간다. 맨 앞이 API 부품이어도 쿠키를 쌓을 자리가 있다. 창은 연 쪽(러너)이 닫는다 — 실패로 멈춰도
  const 지금창 = await deps.newWindow(걸린);

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

            let 단계: 단계창;
            let 한도 = deps.partTimeoutMs;
            if (part.appStep === true) {
              // 앱 · 게임 단계는 창을 안 연다 — 웹 창과 그 로그인 상태는 그대로 두어 다음 웹 단계가 이어받는다 (SPEC 도메인/시나리오 §3.7 결정 16)
              if (deps.appWindow === undefined) throw new Error('이 실행은 앱 · 게임 단계를 돌릴 수 없다');
              단계 = await deps.appWindow(부품, await 지금창.state());
              한도 = deps.appPartTimeoutMs ?? 한도;
            } else {
              // 같은 창 · 같은 탭에서 돈다. 앞 단계의 시계 고정 · 주입 스크립트는 그 단계 끝에 되돌렸다 (SPEC 도메인/시나리오 §3.7 결정 3)
              단계 = await 지금창.단계(부품, part.carryOver !== false);
            }

            돈부품 = 부품;
            try {
              const { outcome, 넘었다 } = await 한도안에(단계, part, seq, 부품, 꽂음.params, 한도);
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
                error = { message: `단계 제한 시간 ${한도}ms 를 넘었다` };
              }
            } finally {
              // 웹 단계는 단계가 건 것을 되돌리고 창은 남긴다. 앱 단계 자리는 그 단계의 request 만 쥔다 — 폰 연결은 시나리오 끝까지 남는다
              await 단계.close().catch(남김(`${part.tcId} 단계를 못 닫았다`));
            }
            break;
          }
          case 'api': {
            const 결과 = await API단계(지금창, 이음, part, i + 1, 이음.부품주소.get(i + 1) ?? deps.baseUrl, 토큰들);
            bound = 결과.bound;
            if (결과.error !== undefined) {
              status = 'FAIL';
              error = { message: 결과.error };
            }
            break;
          }
          case 'mock': {
            const 옛것 = 걸린.get(part.urlPattern);
            if (옛것 !== undefined) await 지금창.unroute(part.urlPattern, 옛것);
            const { status: 코드, contentType, body } = part;
            const handler: RouteHandler = (route) => route.fulfill({ status: 코드, contentType, body });
            await 지금창.route(part.urlPattern, handler);
            // 다시 걸면 맨 뒤로 — 케이스가 직접 만든 창에 다시 걸 때도 나중 것이 이긴다
            걸린.delete(part.urlPattern);
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
        // 이음 오류가 먼저다 — 돌려줄 응답이 없어 막은 요청 때문에 케이스가 net::ERR_FAILED 로 먼저 실패하면 원인이 가려진다 (SPEC 도메인/시나리오 §3.7 결정 12 「이어 주기 때문에 실패하면」)
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

// 거꾸로 보낸다 — 나중에 만든 것이 먼저 만든 것에 기대 있을 수 있다. 하나가 실패하거나 안 끝나도 나머지는 보낸다 (SPEC 도메인/러너 §5.2 「미룬 삭제」)
async function 뒷정리(deps: PartDeps): Promise<ScenarioCleanup[]> {
  const 상한 = deps.partTimeoutMs > 0 ? deps.partTimeoutMs : 뒷정리상한;
  // 보내는 동안 늦게 온 삭제가 목록에 끼지 않게 먼저 얼린다 — 얼린 뒤 삭제는 미루지 않고 그대로 나간다
  deps.이음.얼림 = true;
  const 보냄: ScenarioCleanup[] = [];
  for (const d of [...deps.이음.미룸].reverse()) {
    const 줄 = { fromSeq: d.fromSeq, method: 'DELETE' as const, url: d.url };
    try {
      // 요청 한도(상한)가 먼저 끝나 Playwright 오류가 남는다. 바깥은 연결 만들기 · 닫기가 멈출 때만 잡는다
      const 끝 = await 늦어도(deps.sendDelete(d, 상한).then((status) => ({ status })), 상한 + 늦은절차유예);
      보냄.push(끝 === undefined ? { ...줄, error: `미룬 삭제가 ${상한}ms 안에 끝나지 않았다` } : { ...줄, status: 끝.status });
    } catch (thrown) {
      보냄.push({ ...줄, error: errorOf(thrown).message });
    }
  }
  return 보냄;
}
