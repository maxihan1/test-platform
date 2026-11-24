// 실행 중인 케이스와 절차의 문맥. verify가 자기를 감싼 절차를 찾는 유일한 통로다 (SPEC §4)
// 전역 변수 대신 AsyncLocalStorage를 쓰는 이유: 절차가 중첩되거나 비동기로 갈라져도 문맥이 섞이지 않는다

import { AsyncLocalStorage } from 'node:async_hooks';

import type { Locator } from '@playwright/test';

import type { ApiCallSeen, AssertionResult, CaseResult, CaseSpec, ElementCheck, ExecuteCase, ShapeCheck, StepResult } from '../types.js';

/** 실패 사진에 표시할 요소 — 웹 Locator · 앱 요소 번호 · 웹뷰 구간 안 요소(webview.ts) */
export type 짚을요소 = Locator | string | { 웹: string; id: string };

export interface StepScope {
  assertions: AssertionResult[];
  // 첫 실패 문장의 소스 줄 번호. 화면의 코드 뷰가 이 줄을 중심으로 연다 (SPEC §8.4)
  line?: number;
  httpTrace?: { request: unknown; response: unknown };
  // API 케이스가 보낸 요청마다 응답 모양 확인 한 줄 (도메인/API §3.8). 확인 문장과 섞지 않는다
  shapeChecks?: ShapeCheck[];
  // 이 절차에서 5xx 를 받은 요청. 판 유무와 상관없이 모든 요청을 본다 — 절차 끝에 기대하지 않은 것만 실패로 만든다 (도메인/API §3.8)
  서버오류?: { method: string; path: string; status: number; 요청: string }[];
  // 이 절차에서 마지막으로 다룬 요소 — 웹은 Locator, 앱은 Appium 요소 번호(웹뷰 구간 안이면 그 웹 맥락과 함께). 실패 사진에 표시할 자리다 (highlight.ts)
  마지막요소?: 짚을요소 | undefined;
  // 처음 실패한 순간의 마지막요소. blocker 가 아닌 실패 뒤에도 절차는 돌아 다른 요소를 다루므로 그때 굳힌다
  실패요소?: 짚을요소 | undefined;
  // 게임 · Android 앱 항목에서만 — 이 절차의 게임 동작 · 앱 명령 · 대상 서버 API 호출이 지나던 화면 객체 함수 · 도우미 이름 (gameFns.ts)
  gameFns?: string[];
  // Android 앱 항목에서만 — 이 절차에서 찾은 요소의 명령이 실패한 화면 파일 함수 이름. 화면 파일이 그 실패를 삼켰어도 지난 함수로 세지 않는다 (gameFns.ts 앱함수를적게건다)
  앱실패함수?: string[];
  // test.cleanup 의 정리 절차 — 판정(verify) · 절차(test.step)를 부르면 던진다
  정리?: true;
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

// 프로시저 하나가 도는 동안의 케이스 장부. test.case 가 구간을 가르고 케이스가 끝나는 대로 판정이 든다 (procedure.ts · SPEC 공통/2 §4 「케이스 판정」)
export interface ProcScope {
  cases: readonly CaseSpec[];
  // 지금 절차가 붙는 케이스의 차례. 케이스 사이 절차는 다음 케이스 것이라 앞 케이스가 끝나면 바로 넘어간다.
  // 보류 케이스는 건너뛰고, 흐름이 끝나면 마지막으로 돈 케이스에 머문다 — 끝 정리가 거기 붙는다
  at: number;
  // at 케이스의 판정이 아직 안 났다
  열림: boolean;
  // at 케이스의 시계가 시작한 때(ms) — 앞 케이스가 끝난 때다. 준비 구간과 케이스 구간을 합쳐 잰다
  시작: number;
  // cases 와 같은 차례 — 케이스마다 모은 절차와 난 판정
  steps: StepResult[][];
  results: (CaseResult | undefined)[];
  // 판정이 났는데 아직 밖으로 안 낸 케이스의 차례. 판정을 정하는 일과 내는 일(첨부 — 기다린다)을 갈라 둔다 —
  // 내는 사이에 한도가 와도 그 한도는 이미 넘어간 다음 케이스 것이다. 같은 차례를 다시 넣으면 한 번 더 낸다(끝 정리 뒤)
  안낸: number[];
  // 판정 한 건을 러너와 Playwright 결과로 낸다. Playwright 에 닿는 일이라 함수로만 담는다
  낸다(result: CaseResult): Promise<void>;
  // 러너가 넘긴 케이스별 입력. 사람이 손으로 돌리면 없다 — 케이스마다 스키마 기본값이다
  받은?: readonly ExecuteCase[];
  // 케이스 한도(ms)와 다음 케이스로 넘어갈 때 그 한도를 다시 거는 손잡이. Playwright 에 닿는 일이라 함수로만 담는다
  한도: number;
  한도를건다(): void;
  // 한도에 끊긴 케이스의 사유. 없으면 Playwright 꼴 글이다 — E2E 단계만 그 단계의 글을 준다
  한도글?: string;
}

export interface RunScope {
  seq: number;
  failed: boolean;
  stopped: boolean;
  // 케이스가 왜 실패했는지 한 줄. 사람이 Playwright 출력만 봐도 알 수 있게 남긴다
  firstFailure?: string;
  // E2E 시나리오에서 사람이 체크를 풀어 건너뛸 「만들기」 절차 제목. 번호는 runStep 이 매기므로 제목으로 지목한다 (SPEC 도메인/시나리오 §3.7 결정 4)
  skip?: ReadonlySet<string>;
  // 시나리오 모드와 프로시저에만 있다. 옛 꼴 단독 실행은 가로채기가 없어 읽을 쪽이 없다.
  // 프로시저는 judged 로 케이스의 준비 구간을 가르고 케이스가 바뀔 때 되돌린다
  phase?: ScenarioPhase;
  // 프로시저에만 있다
  proc?: ProcScope;
  // 게임 항목에서만 있다 — 결과 줄의 elementChecks · apiCalls 로 간다 (공통/3-공유계약 「게임 테스트 타입」)
  elementChecks?: ElementCheck[];
  apiCalls?: ApiCallSeen[];
  // 게임 · Android 앱 항목에서만 — 대상 서버 API 를 부른 도우미 이름도 절차에 적는다(조작 맵 · 앱 조작 맵의 데이터 세팅 줄 — gameFns.ts)
  맵함수?: true;
  // test.cleanup 으로 건 정리 — 몸통이 끝나면 끝 정리로 한 번 더 돈다 (gameScenario.ts)
  정리?: { title: string; fn: () => Promise<void> }[];
  // 스크린샷과 결과 전달은 Playwright에 닿는 일이라 문맥에는 함수로만 담는다. 이 파일이 Playwright를 몰라야 단위 테스트가 가능하다
  capture(seq: number, 요소?: 짚을요소): Promise<string | undefined>;
  emit(result: StepResult): Promise<void>;
}

export const stepScope = new AsyncLocalStorage<StepScope>();
export const runScope = new AsyncLocalStorage<RunScope>();
