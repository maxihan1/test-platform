import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 화면글정확, 화면글포함 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-201',
  name: '글쓰기에서 「언어」를 누르면 「기본값」과 언어 목록이 있는 「언어」 창이 열린다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('글쓰기에서 「언어」를 누른다', async () => {
    await driver.$(글쓰기.언어).click();
    const 창 = await verify('언어 목록 창이 열린다', await 뜰때까지(driver, 글쓰기.언어창, 10_000), true);
    const 제목 = await verify('창 제목 「언어」가 보인다', await 뜰때까지(driver, 화면글정확('언어'), 10_000), true);
    const 기본값 = await verify('「기본값」이 보인다', await 뜰때까지(driver, 화면글포함('기본값'), 10_000), true);
    const 목록 = await verify('언어 목록 줄이 보인다', await 뜰때까지(driver, 'android=new UiSelector().className("android.widget.CheckedTextView")', 10_000), true);
    await verify('글쓰기에서 「언어」를 누르면 「기본값」과 언어 목록이 있는 「언어」 창이 열린다', 창 && 제목 && 기본값 && 목록, true);
  });
});
