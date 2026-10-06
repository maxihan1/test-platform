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

// E2E 시나리오에서 러너가 만들어 건넨 표시판. kit 은 적기만 하고 러너의 가로채기가 읽는다 (SPEC 공통/3-공유계약 §5.1 ④)
export interface ScenarioPhase {
  // 뒷정리 미루기는 첫 절차가 선 뒤에만 건다. 그 전 삭제는 앞 부품 찌꺼기를 치우는 준비다
  started: boolean;
  // 숫자인 이유: 절차가 겹치면 안쪽이 끝나도 바깥은 아직 절차 안이다
  inStep: number;
  // 요청을 바꾸는 이어 주기는 blocker 가 아닌 첫 판정 전(준비 구간)에서만 건다. 시험 대상을 꾸미면 버그를 숨긴다
  judged: boolean;
}

export interface RunScope {
  seq: number;
  failed: boolean;
  stopped: boolean;
  // 케이스가 왜 실패했는지 한 줄. 사람이 Playwright 출력만 봐도 알 수 있게 남긴다
  firstFailure?: string;
  // E2E 시나리오에서 사람이 체크를 풀어 건너뛸 「만들기」 절차 제목. 번호는 runStep 이 매기므로 제목으로 지목한다 (SPEC 도메인/시나리오 §3.7 결정 4)
  skip?: ReadonlySet<string>;
  // 시나리오 모드에서만 있다. 단독 실행은 가로채기가 없어 읽을 쪽이 없다
  phase?: ScenarioPhase;
  // 스크린샷과 결과 전달은 Playwright에 닿는 일이라 문맥에는 함수로만 담는다. 이 파일이 Playwright를 몰라야 단위 테스트가 가능하다
  capture(seq: number): Promise<string | undefined>;
  emit(result: StepResult): Promise<void>;
}

export const stepScope = new AsyncLocalStorage<StepScope>();
export const runScope = new AsyncLocalStorage<RunScope>();
