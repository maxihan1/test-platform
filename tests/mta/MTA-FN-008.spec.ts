import { defineCase, test, verify } from '@platform/kit';
import { 앱다시켜기, 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 꾸러미 } from './helpers/app.helper.js';
import { 들어온계정인가, 로그인하기, 시작화면열기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-008',
  name: '로그인한 뒤 앱을 끄고 다시 켜면 그 계정의 홈 화면이 바로 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('로그인한 뒤 앱을 끄고 다시 켠다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 앱다시켜기(driver, 꾸러미);
    const 홈보임 = await verify('다시 켠 앱에 홈 화면 글쓰기 버튼이 보인다', await 뜰때까지(driver, 홈.글쓰기, 30_000), true);
    const 같은계정 = await verify('다시 켠 앱에 로그인했던 계정이 들어와 있다', await 들어온계정인가(driver, params.loginId ?? ''), true);
    await verify('로그인한 뒤 앱을 끄고 다시 켜면 그 계정의 홈 화면이 바로 보인다', 홈보임 && 같은계정, true);
  });
});
