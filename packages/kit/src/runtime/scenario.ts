// E2E 시나리오 모드 — 케이스가 자기 실행 함수를 등록부에 올리고 러너 고정 spec 이 꺼내 부른다 (SPEC 공통/3-공유계약 §5.1)
// 테스트 코드가 부르는 곳이 아니라 러너가 부르는 곳이다. 그래서 runtime/index.ts 배럴이 아니라 '@platform/kit/scenario' 로 낸다

import type { APIRequestContext, Page } from '@playwright/test';

import type { StepResult } from '../types.js';
import type { ScenarioPhase } from './context.js';
import { SCENARIO_CLEANUP_MARKER, SCENARIO_PART_MARKER } from './protocol.js';

// 러너가 결과 줄 · 뒷정리 줄을 가를 때 같은 표시자를 봐야 한다
export { SCENARIO_CLEANUP_MARKER, SCENARIO_PART_MARKER };
// 러너가 표시판을 만들려면 모양을 알아야 한다. 고정 spec 은 이 진입점에서 타입만 가져간다
export type { ScenarioPhase };

export interface ScenarioCaseInput {
  page: Page;
  request: APIRequestContext;
  platform: string;
  params: unknown;
  expected: unknown;
  skipSteps: readonly string[];
  // 앞 부품까지 쓴 절차 순번. 시나리오 전체에서 이어져야 스크린샷이 서로를 안 덮는다
  seq: number;
  // 러너가 건넨 표시판. kit 이 적고 러너의 가로채기가 읽는다 (SPEC 공통/3-공유계약 §5.1 ④)
  phase?: ScenarioPhase;
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
