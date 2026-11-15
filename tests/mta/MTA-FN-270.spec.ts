import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-270',
  name: '내용이 없는 글쓰기에서 닫기를 누르면 확인 창 없이 홈 화면으로 돌아간다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 글쓰기 = new 글쓰기화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
  });

  await test.step('빈 글쓰기에서 닫기를 누른다', async () => {
    await driver.$(글쓰기.닫기).click();
    const 돌아옴 = await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true);
    const 창없음 = await verify('확인 창이 보이지 않는다', await 보이나(driver, 글쓰기.창.확인버튼), false);
    await verify('내용이 없는 글쓰기에서 닫기를 누르면 확인 창 없이 홈 화면으로 돌아간다', 돌아옴 && 창없음, true);
  });
});
