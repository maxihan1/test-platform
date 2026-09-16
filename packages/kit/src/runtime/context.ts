// 실행 중인 케이스와 절차의 문맥. verify가 자기를 감싼 절차를 찾는 유일한 통로다 (SPEC §4)
// 전역 변수 대신 AsyncLocalStorage를 쓰는 이유: 절차가 중첩되거나 비동기로 갈라져도 문맥이 섞이지 않는다

import { AsyncLocalStorage } from 'node:async_hooks';

import type { AssertionResult, StepResult } from '../types.js';

export interface StepScope {
  assertions: AssertionResult[];
  // 첫 실패 문장의 소스 줄 번호. 화면의 코드 뷰가 이 줄을 중심으로 연다 (SPEC §8.4)
  line?: number;
  httpTrace?: { request: unknown; response: unknown };
}

export interface RunScope {
  seq: number;
  failed: boolean;
  stopped: boolean;
  // 스크린샷과 결과 전달은 Playwright에 닿는 일이라 문맥에는 함수로만 담는다. 이 파일이 Playwright를 몰라야 단위 테스트가 가능하다
  capture(seq: number): Promise<string | undefined>;
  emit(result: StepResult): Promise<void>;
}

export const stepScope = new AsyncLocalStorage<StepScope>();
export const runScope = new AsyncLocalStorage<RunScope>();
