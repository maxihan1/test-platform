import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 보이나, 앱다시켜기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-007',
  name: '계정이 하나도 없으면 하단 탭 대신 시작 화면이 나온다',
  platforms: ['android'],
  techniques: ['경계값 분석'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 홈 = new 홈화면(driver);

  await test.step('앱을 새로 켠다', async () => {
    await 앱다시켜기(driver);
    const 시작보임 = await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
    const 탭없음 = await verify('하단 탭에 「홈」이 보이지 않는다', await 보이나(driver, 홈.탭.홈), false);
    await verify('계정이 하나도 없으면 하단 탭 대신 시작 화면이 나온다', 시작보임 && 탭없음, true);
  });
  await test.step('로그인한 뒤 하단 탭을 본다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    const 탭보임 = await verify('하단 탭에 「홈」이 보인다', await 보이나(driver, 홈.탭.홈), true);
    const 시작없음 = await verify('시작 화면의 「로그인」 버튼이 보이지 않는다', await 보이나(driver, 시작.로그인), false);
    await verify('시작 화면 대신 하단 탭이 나온다', 탭보임 && 시작없음, true);
  }, { capture: true });
});
