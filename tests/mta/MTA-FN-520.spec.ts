import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 앱다시켜기 } from './helpers/app.helper.js';
import { 홈으로돌아가기, 쓰는화면, 크롬이될때까지 } from './helpers/settings.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 동작설정화면 } from './pages/set-behavior.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-520',
  name: '설정 「링크 열기」를 「시스템 브라우저」로 바꾸고 「추가 설정」을 누르면 링크는 「링크 열기」 설정에 따라 앱 안 브라우저(Custom Tabs) 또는 시스템 브라우저로 열린다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 동작 = new 동작설정화면(driver);
  const 정보 = new 앱정보화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  try {
    await test.step('설정 「링크 열기」를 「시스템 브라우저」로 바꾸고 「추가 설정」을 누른다', async () => {
      await 설정.줄누르기('동작');
      await verify('동작 화면이 열린다', await 동작.떴나(), true);
      await 동작.줄누르기('링크 열기');
      await verify('선택지에 「시스템 브라우저」가 있다', await 동작.선택지보이나('시스템 브라우저'), true);
      await 동작.줄누르기('시스템 브라우저');
      await 홈으로돌아가기(driver);
      await 설정.열기();
      await 설정.줄누르기('Mastodon에 대해');
      await verify('「Mastodon에 대해」 화면이 열린다', await 정보.떴나(), true);
      await 정보.줄누르기('추가 설정');
      const 크롬 = await verify('크롬 앱이 열린다', await 크롬이될때까지(driver), true);
      const 탭아님 = await verify('앱 안 브라우저(Custom Tabs)가 아니다', !(await 쓰는화면(driver)).includes('CustomTab'), true);
      await verify('설정 「링크 열기」를 「시스템 브라우저」로 바꾸고 「추가 설정」을 누르면 링크는 「링크 열기」 설정에 따라 앱 안 브라우저(Custom Tabs) 또는 시스템 브라우저로 열린다', 크롬 && 탭아님, true);
    }, { capture: true });
  } finally {
    await 앱다시켜기(driver);
  }
});
