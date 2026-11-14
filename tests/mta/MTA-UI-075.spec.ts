import { defineCase, test, verify } from '@platform/kit';

import { 서버웹화면떴나, 크롬이앞에떴나 } from './helpers/onboarding.helper.js';
import { 로그인경로서버고르기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-075',
  name: '로그인 경로에서 서버를 고르고 진행하면 앱 안 브라우저 창(Custom Tabs)으로 서버 로그인 화면이 열린다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로에서 우리 서버를 고르고 「다음」을 누른다', async () => {
    await 로그인경로서버고르기(driver);
    const 브라우저 = await verify('앱 안 브라우저 창이 뜬다', await 크롬이앞에떴나(driver), true);
    const 로그인화면 = await verify('서버 로그인 화면이 보인다', await 서버웹화면떴나(driver), true);
    await verify('로그인 경로에서 서버를 고르고 진행하면 앱 안 브라우저 창(Custom Tabs)으로 서버 로그인 화면이 열린다', 브라우저 && 로그인화면, true);
  }, { capture: true });
});
