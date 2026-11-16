import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄, 글읽기 } from './helpers/app.helper.js';
import { 홈으로 } from './helpers/nav.helper.js';
import { 글이될때까지읽기, 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-511',
  name: '게시 기본값을 바꾸고 화면을 나갔다 다시 열면 바꾼 값이 그대로 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: z.object({
    바꿀값: z.string().describe('게시 기본값 「공개 범위」로 고르는 값 — 모든 사용자 · 팔로워만 · 본인만 가운데 하나').default('팔로워만'),
    다른값: z.string().describe('바꿀 값이 지금 값과 같을 때 대신 고르는 값').default('본인만'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  let 원래값 = '';
  let 목표 = '';
  let 바꿈 = false;
  try {
    await test.step('프로필 고쳐도 되는 계정으로 로그인해 홈 화면을 연다', async () => {
      await 로그인하기(driver, params.loginId, params.loginPassword);
      await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    });
    await test.step('계정 설정을 연다', async () => {
      await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
    });
    await test.step('계정 설정에서 「게시 기본값」을 연다', async () => {
      await verify('게시 기본값 화면이 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
    });
    await test.step('게시 기본값 「공개 범위」를 바꾸고 화면을 나갔다 다시 연다', async () => {
      원래값 = await 글읽기(driver, 설정.부제순서(1));
      목표 = 원래값 === expected.바꿀값 ? expected.다른값 : expected.바꿀값;
      await 설정.줄누르기('공개 범위');
      await driver.$(설정.화면글정확히(목표)).click();
      바꿈 = true;
      await verify('「공개 범위」 부제가 고른 값으로 바뀐다', await 글이될때까지읽기(driver, 설정.부제순서(1), 목표), 목표, { blocker: true });
      await driver.back();
      await verify('계정 설정으로 돌아온다', await 뜰때까지(driver, 설정.굴려서줄('게시 기본값'), 10_000), true, { blocker: true });
      await verify('게시 기본값 화면이 다시 열린다', await 설정줄열기(driver, '게시 기본값'), true, { blocker: true });
      await verify('게시 기본값을 바꾸고 화면을 나갔다 다시 열면 바꾼 값이 그대로 보인다', await 글이될때까지읽기(driver, 설정.부제순서(1), 목표), 목표);
    });
  } finally {
    if (바꿈) {
      await 홈으로(driver);
      await 계정설정열기(driver, 계정줄(params.loginId ?? ''));
      await 설정줄열기(driver, '게시 기본값');
      if ((await 글읽기(driver, 설정.부제순서(1))) !== 원래값) {
        await 설정.줄누르기('공개 범위');
        await driver.$(설정.화면글정확히(원래값)).click();
        await 글이될때까지읽기(driver, 설정.부제순서(1), 원래값);
      }
      await driver.back();
    }
  }
});
