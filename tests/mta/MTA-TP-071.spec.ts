import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 목록들, 목록지우기 } from './helpers/api.helper.js';
import { 만들기빠르게두번누르기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록만들기화면 } from './pages/list-create.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

const 공백이름 = defineCase({
  tcId: 'MTA-FN-659',
  name: '목록 이름에 공백만 넣고 「만들기」를 누르면 빈 이름처럼 「비워둘 수 없습니다」로 막힌다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 목록 만들기 1단계를 열었다'],
  techniques: ['오류 추정'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    공백: z.string().min(1).describe('목록 이름 칸에 적을 글 — 공백 문자만').default('   '),
  }),
  expected: null,
});

const 두번누르기 = defineCase({
  tcId: 'MTA-FN-660',
  name: '「만들기」를 빠르게 두 번 누르면 「QA 두번」 목록은 하나만 생긴다',
  platforms: ['android'],
  precondition: ['목록 만들기 1단계에 「QA 두번」 이름을 적었다'],
  techniques: ['오류 추정'],
  params: z.object({ 이름: z.string().min(3).max(30).describe('만들 목록 이름 — 「QA」로 시작').default('QA 두번') }),
  expected: z.object({ 개수: z.number().describe('같은 이름으로 생기는 목록 수').default(1) }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-071',
  name: '목록 만들기 — 오류 추정',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [공백이름, 두번누르기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 목록관리화면(driver);
  const 만들기 = new 목록만들기화면(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 만든 목록을 지운다', async () => {
    if (나 !== undefined) await 목록지우기(나, 'QA');
  });

  await test.case(공백이름, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('목록 이름에 공백만 적고 「만들기」를 누른다', async () => {
      await 관리.열기();
      await 관리.만들기누르기();
      await 만들기.이름적기(params.공백);
      await 만들기.단계버튼누르기();
      await verify('목록 이름에 공백만 넣고 「만들기」를 누르면 빈 이름처럼 「비워둘 수 없습니다」로 막힌다', await 만들기.글있나('비워둘 수 없습니다', 10_000), true);
    });
  });

  await test.case(두번누르기, async ({ params, expected }) => {
    await test.step('목록 만들기 1단계에 이름을 적는다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.만들기누르기();
      await 만들기.이름적기(params.이름);
      await verify('목록 이름 칸에 적은 이름이 보인다', await 만들기.이름값(), params.이름, { blocker: true });
    });
    await test.step('「만들기」를 빠르게 두 번 누른다', async () => {
      await 만들기빠르게두번누르기(driver);
      await verify('목록 만들기 2단계가 열린다', await 만들기.두번째단계떴나(20_000), true);
      await verify('「만들기」를 빠르게 두 번 누르면 「QA 두번」 목록은 하나만 생긴다', (await 목록들(나!)).filter((목록) => 목록.title === params.이름).length, expected.개수);
    });
  });
});
