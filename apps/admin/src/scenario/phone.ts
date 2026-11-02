// 앱 · 게임 단계가 있는 시나리오의 폰 — 싣는 값 · 팜에서 한 번 잡고 놓기 · 못 잡았을 때 닫는 응답 (SPEC 도메인/시나리오 §3.7 결정 16)

import type { ScenarioExecuteRequest, ScenarioExecuteResponse, ScenarioPart } from '@platform/kit';

import { 깔앱파일 } from '../execution/buildFile.js';
import { 엔진칸 } from '../execution/engineField.js';
import { 팜주소, 팜폰으로 } from '../execution/farm.js';
import { callScenarioRunner } from '../execution/runner.js';

import { type 쓰는앱, 앱종류들 } from './apps.js';
import { 앱단계인가, 케이스접두사 } from './mixed.js';

/** 폰에 깔 앱 파일을 정할 재료. 앱 파일은 폰을 잡은 뒤 정한다 — 올린 빌드의 서명 주소에 기한이 있다 */
export interface 폰앱 {
  serviceId: number;
  env: string;
  appPath: string | null;
}

/**
 * 앱 · 게임 단계가 있으면 그 애플리케이션의 폰 재료와 요청에 한 벌 싣는 게임 칸. 없으면 null.
 * 조립 검사가 앱 · 게임 애플리케이션을 하나만 남겼으므로 첫 앱 · 게임 단계의 것이다
 */
export function 폰값(parts: readonly ScenarioPart[], 앱들: ReadonlyMap<string, 쓰는앱>, env: string): { 폰: 폰앱; 칸: Pick<ScenarioExecuteRequest, 'engine' | 'adminKey'> } | null {
  const 종류 = 앱종류들(앱들);
  const 첫 = parts.find((p) => 앱단계인가(p, 종류));
  if (첫?.kind !== 'case') return null;
  const 앱 = 앱들.get(케이스접두사(첫.tcId))!;
  return { 폰: { serviceId: 앱.serviceId, env, appPath: 앱.appPath }, 칸: 엔진칸(앱.kind, 'android', 앱.adminKey) };
}

/** 시나리오 제한 시간에 10분을 더한 값이 들어가는 가장 짧은 잡기 — 늘리기를 부르지 않는다. 60분 상한이라 120분이면 늘 든다 */
export function 잡는분(timeoutMs: number): number {
  const 필요 = timeoutMs / 60_000 + 10;
  return [30, 60, 120].find((분) => 분 >= 필요) ?? 120;
}

/** 러너에 못 보냈을 때 — 첫 단계가 까닭을 지닌 NA, 뒤 단계는 안 돈 NA(NOT_RUN)다 */
export function 못돌린응답(단계수: number, 까닭: string): ScenarioExecuteResponse {
  return {
    status: 'NA',
    durationMs: 0,
    parts: Array.from({ length: 단계수 }, (_, i) => ({
      seq: i + 1,
      status: 'NA' as const,
      durationMs: 0,
      steps: [],
      mocks: [],
      error: { message: i === 0 ? 까닭 : 'NOT_RUN' },
    })),
    error: { message: 까닭 },
  };
}

/** 앱 파일을 정해 싣는다. 서명 주소를 못 만들면(바깥 주소가 비었다) 그 까닭을 돌려준다 — 옛 앱 파일로 물러서지 않는다 */
async function 앱실기(요청: ScenarioExecuteRequest, 폰: 폰앱): Promise<ScenarioExecuteRequest | string> {
  try {
    const app = await 깔앱파일(폰.serviceId, 폰.env, 폰.appPath);
    return app === null ? 요청 : { ...요청, app };
  } catch (err) {
    return err instanceof Error ? err.message : String(err);
  }
}

/** 내 컴퓨터 러너 — 거기 꽂은 폰에서 돈다. 팜을 잡지 않는다 (§7 「시험 실행 규칙」) */
export async function 꽂은폰으로(요청: ScenarioExecuteRequest, 폰: 폰앱, 주소: string): Promise<ScenarioExecuteResponse> {
  const 실은 = await 앱실기(요청, 폰);
  return typeof 실은 === 'string' ? 못돌린응답(요청.parts.length, 실은) : callScenarioRunner(실은, 주소);
}

/**
 * 서버 러너 — 팜에서 빈 폰 하나를 시나리오 동안 잡고, 러너가 답하면(통과 · 실패 · 러너 고장 모두) 놓는다.
 * 토큰찾기는 누른 사람 토큰을 준다(없으면 undefined — 서버 몫). 잡은 토큰을 러너에도 실어야 팜이 연결을 받는다 (러너 §5.2 「팜 토큰은 누른 사람 것이 먼저다」)
 */
export async function 팜폰으로돌린다(
  요청: ScenarioExecuteRequest,
  폰: 폰앱,
  토큰찾기: () => Promise<string | undefined>,
): Promise<ScenarioExecuteResponse> {
  const 팜 = 팜주소();
  // 요청을 받은 뒤 서버를 다시 띄우며 값을 지웠을 때뿐이다 — 실행 통로가 FARM_OFF 로 먼저 거절한다
  if (팜 === undefined) return 못돌린응답(요청.parts.length, '이 서버에는 Device VISION(DEVICE_FARM_URL)이 연결되어 있지 않습니다');
  let 토큰: string | undefined;
  try {
    토큰 = await 토큰찾기();
  } catch (err) {
    return 못돌린응답(요청.parts.length, `누른 사람의 통합계정 토큰을 읽지 못했습니다: ${err instanceof Error ? err.message : String(err)}`);
  }
  return 팜폰으로(
    팜,
    async (udid) => {
      const 실은 = await 앱실기({ ...요청, udid, ...(토큰 !== undefined && { farmToken: 토큰 }) }, 폰);
      return typeof 실은 === 'string' ? 못돌린응답(요청.parts.length, 실은) : callScenarioRunner(실은);
    },
    (까닭) => 못돌린응답(요청.parts.length, 까닭),
    undefined,
    undefined,
    잡는분(요청.timeoutMs),
    토큰,
  );
}
