// 고정 spec 이 kit 과 맞춰야 하는 글자 — 결과 줄 · 뒷정리 줄 표시자와 등록부 열쇠. kit 을 값으로 부르지 않으려고 옮겨 적는다 (wire.test.ts 가 같은지 지킨다)
// 왜 안 부르나 — 케이스 파일이 kit 을 require 로 부를지 import 로 부를지는 그 파일이 어디 있느냐로 갈린다(/tests 는 package.json 이 없어 require).
// 여기서 kit 을 한 방식으로 먼저 올리면 같은 kit 파일이 두 방식으로 섞여 죽는다 — 이미지에서는 'Unexpected token export',
// 로컬에서는 'does not provide an export named' 였다 (2026-09-28 실측)

import type { ScenarioCaseRunner } from '@platform/kit/scenario';
import type { ScenarioCleanup, ScenarioPartResult } from '@platform/kit';

export const SCENARIO_PART_MARKER = '@@SCENARIO_PART@@';
export const SCENARIO_CLEANUP_MARKER = '@@SCENARIO_CLEANUP@@';
export const SCENARIO_REGISTRY_KEY = 'platform.scenarioCases';

export function 꺼냄(tcId: string): ScenarioCaseRunner | undefined {
  const g = globalThis as unknown as Record<symbol, Map<string, ScenarioCaseRunner> | undefined>;
  return g[Symbol.for(SCENARIO_REGISTRY_KEY)]?.get(tcId);
}

export function 부품줄(result: ScenarioPartResult): string {
  return `${SCENARIO_PART_MARKER}${JSON.stringify(result)}\n`;
}

export function 뒷정리줄(list: ScenarioCleanup[]): string {
  return `${SCENARIO_CLEANUP_MARKER}${JSON.stringify(list)}\n`;
}
