// E2E 시나리오 모드 — 케이스가 자기 실행 함수를 등록부에 올리고 러너 고정 spec 이 꺼내 부른다 (SPEC 공통/3-공유계약 §5.1)
// 테스트 코드가 부르는 곳이 아니라 러너가 부르는 곳이다. 그래서 runtime/index.ts 배럴이 아니라 '@platform/kit/scenario' 로 낸다

import type { APIRequestContext, Page } from '@playwright/test';

import type { ApiAuth, DeviceInfo, StepResult } from '../types.js';
import { closeApp, openApp, readDevice, type AppDriver } from './app.js';
import type { ScenarioPhase } from './context.js';
import { isGame, openGame, type KitGame } from './game.js';
import { SCENARIO_CLEANUP_MARKER, SCENARIO_DEVICE_MARKER, SCENARIO_PART_MARKER } from './protocol.js';

// 러너가 결과 줄 · 뒷정리 줄 · 기기 줄을 가를 때 같은 표시자를 봐야 한다
export { SCENARIO_CLEANUP_MARKER, SCENARIO_DEVICE_MARKER, SCENARIO_PART_MARKER };
// 러너가 표시판을 만들려면 모양을 알아야 한다. 고정 spec 은 이 진입점에서 타입만 가져간다
export type { ScenarioPhase };

// 웹 단계는 page, 앱 · 게임 단계는 driver(게임이면 game 도)를 받는다. 둘 다 없으면 부품이 실패한다 (도메인/시나리오 §3.7 결정 16)
export interface ScenarioCaseInput {
  page?: Page;
  driver?: AppDriver;
  game?: KitGame;
  // 대상 서버 줄의 어드민 키. 게임 단계에만 온다 — 웹 단계 케이스 코드에는 안 넘긴다
  adminKey?: { header: string; value: string };
  request: APIRequestContext;
  platform: string;
  params: unknown;
  expected: unknown;
  skipSteps: readonly string[];
  // 앞 부품까지 쓴 절차 순번. 시나리오 전체에서 이어져야 스크린샷이 서로를 안 덮는다
  seq: number;
  // 러너가 건넨 표시판. kit 이 적고 러너의 가로채기가 읽는다 (SPEC 공통/3-공유계약 §5.1 ④)
  phase?: ScenarioPhase;
  // 그 부품 애플리케이션 · 짝지은 대상 서버의 API 인증. 조립 목록의 부품 줄에서 온다 (도메인/러너 §5.2 「API 케이스 실행」)
  apiAuths?: readonly ApiAuth[];
  // 그 부품 케이스가 만들어진 판 원문. 러너가 부품 줄의 파일을 읽어 넘긴다 — 있으면 응답마다 모양을 견준다 (도메인/API §3.8)
  apiDoc?: unknown;
  // 토큰 받기에만 쓰는 감싸지 않은 도구 — request 는 이어 주기 · 모킹을 거쳐 토큰 요청이 가짜 응답이나 이어 주기 값이 될 수 있다
  tokenRequest?: APIRequestContext;
}

export interface ScenarioCaseOutcome {
  seq: number;
  steps: StepResult[];
  failed: boolean;
  error?: { message: string; stack?: string };
}

export type ScenarioCaseRunner = (input: ScenarioCaseInput) => Promise<ScenarioCaseOutcome>;

// 등록부를 globalThis 에 한 벌만 둔다. 케이스 파일과 고정 spec 이 kit 을 다른 경로로 불러도 같은 것을 본다.
// 등록하는 것은 본체가 아니라 **그 케이스의 kit 인스턴스로 감싼 실행 함수**다 — 본체 안 step() 은
// 자기 kit 의 문맥(AsyncLocalStorage)을 읽으므로, 다른 인스턴스가 감싸면 문맥을 못 찾는다
// 러너 고정 spec 은 kit 을 값으로 못 불러 이 글자를 옮겨 적는다 (apps/runner/scenario/wire.ts)
export const SCENARIO_REGISTRY_KEY = 'platform.scenarioCases';
const 열쇠 = Symbol.for(SCENARIO_REGISTRY_KEY);

function 등록부(): Map<string, ScenarioCaseRunner> {
  const g = globalThis as unknown as Record<symbol, Map<string, ScenarioCaseRunner> | undefined>;
  g[열쇠] ??= new Map();
  return g[열쇠];
}

export function registerScenarioCase(tcId: string, runner: ScenarioCaseRunner): void {
  등록부().set(tcId, runner);
}

// 꺼내도 지우지 않는다. 같은 케이스를 두 번 쓰면 두 번째 import 는 캐시라 다시 등록하지 않는다.
// 러너 고정 spec 은 이것을 안 부르고 같은 등록부를 wire.ts 로 직접 읽는다 — kit 검사와 wire.test 가 쓰는 통로다
export function scenarioCase(tcId: string): ScenarioCaseRunner | undefined {
  return 등록부().get(tcId);
}

// 앱 · 게임 단계가 쓰는 폰 연결 — 시나리오에 하나다. 여는 일은 kit 이 하고(Appium · 게임 SDK 를 아는 곳), 언제 열고 닫을지는 러너 고정 spec 이 정한다.
// 고정 spec 은 kit 을 값으로 못 불러 케이스처럼 등록부(globalThis)로 꺼낸다 — 앱 케이스 파일을 import 하면 이미 올라 있다 (도메인/시나리오 §3.7 결정 16)
export interface ScenarioPhone {
  driver: AppDriver;
  game?: KitGame;
  device?: DeviceInfo;
}

export interface ScenarioPhoneOpener {
  open(env: Record<string, string | undefined>): Promise<ScenarioPhone>;
  close(phone: ScenarioPhone): Promise<void>;
}

// 러너 고정 spec 이 옮겨 적는다 (apps/runner/scenario/wire.ts)
export const SCENARIO_PHONE_KEY = 'platform.scenarioPhone';

const 폰열기: ScenarioPhoneOpener = {
  async open(env) {
    const driver = await openApp(env);
    // 판을 못 읽어도 단계는 돈다 — 결과 머리에 빈칸일 뿐이다
    const device = await readDevice(driver).catch((err: unknown) => {
      console.error(`[kit] 기기 정보를 읽지 못했다: ${err instanceof Error ? err.message : String(err)}`);
      return undefined;
    });
    if (!isGame(env)) return { driver, ...(device && { device }) };
    // 게임 SDK 에 못 붙으면 연 연결을 아무도 모른다 — 여기서 닫는다. 못 닫아도 러너가 번호 파일로 닫는다
    try {
      return { driver, game: await openGame(env), ...(device && { device }) };
    } catch (err) {
      await closeApp(driver).catch((e: unknown) => console.error(`[kit] Appium 연결을 닫지 못했다: ${e instanceof Error ? e.message : String(e)}`));
      throw err;
    }
  },
  close: (phone) => closeApp(phone.driver),
};

export function registerScenarioPhone(): void {
  const g = globalThis as unknown as Record<symbol, ScenarioPhoneOpener | undefined>;
  g[Symbol.for(SCENARIO_PHONE_KEY)] ??= 폰열기;
}
