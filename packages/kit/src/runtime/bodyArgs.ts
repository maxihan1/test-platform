// 케이스 · 프로시저 본문에 넘기는 인자를 만들고 절차 결과를 리포터로 흘린다. test.ts 와 procedure.ts 가 같이 쓴다 (SPEC §4)

import type { APIRequestContext, Page, TestInfo } from '@playwright/test';

import { PC_PLATFORM_LABEL, PC항목인가, type ApiAuth, type StepResult } from '../types.js';
import { api만들기, 어드민도구 } from './apiAuth.js';
import type { AppDriver } from './app.js';
import type { GameDriver } from './game.js';
import { 앱을지켜본다, 웹을지켜본다 } from './highlight.js';
import { traced } from './http.js';
import { STEP_ATTACHMENT } from './protocol.js';

// 브라우저 케이스에는 page, android 앱 케이스에는 driver 만 있다. 윈도우 PC 항목은 game 뿐이다. game 은 게임 애플리케이션 항목에만, admin 은 대상 서버 줄에 어드민 키가 있을 때만. 없는 쪽을 꺼내면 던진다
export interface CaseBodyArgs<P, E> {
  page: Page;
  driver: AppDriver;
  game: GameDriver;
  // 대상 서버 줄의 어드민 키를 머리로 붙인 요청 도구 — 게임 케이스의 준비 · 서버 값 읽기 (도메인/게임 §3.10 「케이스 꼴」)
  admin: APIRequestContext;
  request: APIRequestContext;
  // 그 이름 API 인증의 토큰을 붙인 요청 도구. request 는 「인증 없이」다 (도메인/API §3.8 「API 인증」)
  api: (name: string) => APIRequestContext;
  params: P;
  expected: E;
}

export type CaseBody<P, E> = (args: CaseBodyArgs<P, E>) => Promise<void> | void;

// 프로시저 본문에는 params · expected 가 없다 — 케이스마다 test.case 가 넘긴다. 웹은 프로시저를 쓰지 않아 page 도 없다 (SPEC 공통/2 §4 「테스트 프로시저」)
export type ProcedureBody = (args: Pick<CaseBodyArgs<never, never>, 'driver' | 'game' | 'admin' | 'request' | 'api'>) => Promise<void> | void;

// desktop·mobile은 코드 안에서만 쓰는 값이다. 사람이 읽는 자리에는 PC·모바일로 적는다 (SPEC §8)
export function platformLabel(project: string): string {
  if (project === 'desktop') return 'PC';
  if (project === 'mobile') return '모바일';
  if (project === 'android') return 'Android 앱';
  if (PC항목인가(project)) return PC_PLATFORM_LABEL[project];
  return project;
}

export type Side = { page: Page } | { driver: AppDriver; game?: GameDriver } | { game: GameDriver };
type AdminKey = { header: string; value: string };

// 없는 칸(page / driver / game / admin)은 꺼내면 던진다. 열거되면 `{ ...args }` 나 `({ page, ...rest })` 만 써도 터지므로 숨긴다.
// inputs 가 없으면 프로시저 본문이다 — params · expected 도 없는 칸이다
export function bodyArgs<P, E>(
  tcId: string,
  request: APIRequestContext,
  inputs: { params: P; expected: E } | undefined,
  side: Side,
  인증들: readonly ApiAuth[],
  문서: unknown,
  토큰도구: APIRequestContext = request,
  키?: AdminKey,
): CaseBodyArgs<P, E> {
  const 없는칸: [string, string][] =
    'page' in side
      ? [['driver', `${tcId}은 브라우저 케이스라 driver 가 없다`]]
      : 'driver' in side
        ? [['page', `${tcId}은 Android 앱 케이스라 page 가 없다 — driver 를 쓴다`]]
        : [
            ['page', `${tcId}은 PC 항목이라 page 가 없다 — game 을 쓴다`],
            ['driver', `${tcId}은 PC 항목이라 driver 가 없다 — game 을 쓴다`],
          ];
  if (!('game' in side && side.game !== undefined)) {
    없는칸.push(['game', `${tcId}은 게임 애플리케이션 항목이 아니라 game 이 없다`]);
  }
  if (키 === undefined) {
    없는칸.push(['admin', `${tcId}의 대상 서버 줄에 어드민 키가 없어 admin 을 쓸 수 없다 — 설정 › 대상 서버 줄의 어드민 키를 채운다`]);
  }
  if (inputs === undefined) {
    for (const 칸 of ['params', 'expected']) 없는칸.push([칸, `${tcId}은 프로시저라 본문에 ${칸} 가 없다 — 케이스마다 test.case 가 넘긴다`]);
  }
  // 비밀값은 처음부터, 받은 토큰은 받는 대로 더해진다. 어드민 키 값도 기록 · 오류 글에서 가린다 (공통/3-공유계약 「게임 테스트 타입」 adminKey).
  // `Bearer <토큰>` 꼴이면 토큰만 따로 나와도 가리게 칸 뒤 마디도 넣는다 (도메인/인증 §7 adminKey)
  const 비밀 = new Set([...인증들.map((a) => a.clientSecret), ...(키 === undefined ? [] : [키.value, 키.value.slice(키.value.lastIndexOf(' ') + 1)])]);
  // 판 원문이 있으면 request · api(…) 의 모든 응답을 그 판과 견준다 (도메인/API §3.8 「응답 모양 확인」)
  const 감싼 = traced(request, 비밀, 문서);
  const args = {
    request: 감싼,
    api: api만들기(인증들, 감싼, 토큰도구, 비밀),
    ...(키 === undefined ? {} : { admin: 어드민도구(감싼, 키) }),
    ...(inputs === undefined ? {} : { params: inputs.params, expected: inputs.expected }),
    // 케이스가 다룬 요소를 적는 판으로 넘긴다 — 실패 사진에 그 요소를 표시한다 (highlight.ts)
    ...('page' in side ? { page: 웹을지켜본다(side.page) } : 'driver' in side ? { ...side, driver: 앱을지켜본다(side.driver) } : side),
  };
  for (const [칸, message] of 없는칸) {
    Object.defineProperty(args, 칸, {
      get(): never {
        throw new Error(message);
      },
      enumerable: false,
    });
  }
  return args as unknown as CaseBodyArgs<P, E>;
}

export async function emit(testInfo: TestInfo, result: StepResult): Promise<void> {
  await testInfo.attach(STEP_ATTACHMENT, {
    body: JSON.stringify(result),
    contentType: 'application/json',
  });
}
