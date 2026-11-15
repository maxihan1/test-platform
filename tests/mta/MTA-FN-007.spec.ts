import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지, 보이나, 앱다시켜기 } from '@platform/kit/parts';
import { z } from 'zod';

import { 꾸러미 } from './helpers/app.helper.js';
import { 로그인하기, 시작화면열기, 시작화면표지 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-007',
  name: '로그인한 계정이 0건인 채 앱을 켜면 시작 화면이 보이고 하단 탭이 보이지 않는다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
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

  await test.step('계정이 0건인 채 앱을 켠다', async () => {
    await 시작화면열기(driver);
    const 시작보임 = await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
    const 탭없음 = await verify('하단 「홈」 탭이 보이지 않는다', await 보이나(driver, 홈.탭.홈), false);
    await verify('로그인한 계정이 0건인 채 앱을 켜면 시작 화면이 보이고 하단 탭이 보이지 않는다', 시작보임 && 탭없음, true);
  });

  await test.step('계정 1건으로 로그인한 뒤 앱을 다시 켠다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 앱다시켜기(driver, 꾸러미);
    const 탭보임 = await verify('하단 「홈」 탭이 보인다', await 뜰때까지(driver, 홈.탭.홈, 30_000), true);
    const 시작없음 = await verify('시작 화면 「로그인」 버튼이 보이지 않는다', await 보이나(driver, 시작화면표지), false);
    await verify('시작 화면 대신 하단 탭이 보인다', 탭보임 && 시작없음, true);
  });
});
