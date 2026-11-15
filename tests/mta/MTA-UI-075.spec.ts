import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 서버고르고다음, 시작화면열기 } from './helpers/login.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';
import { 웹로그인화면 } from './pages/web-login.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-075',
  name: '로그인 경로에서 우리 서버를 고르고 「다음」을 누르면 앱 안 브라우저 창에 서버 로그인 화면이 열린다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: z.object({
    서버주소: z.string().describe('브라우저 주소 줄에 보이는 서버 주소').default('mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, expected }) => {
  const 시작 = new 시작화면(driver);
  const 고르기 = new 서버고르기화면(driver);
  const 웹 = new 웹로그인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('로그인 경로에서 우리 서버를 고르고 「다음」을 누른다', async () => {
    await 시작.누르기('로그인');
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await 서버고르고다음(driver);
    const 열림 = await verify('앱 안 브라우저 창 주소 줄이 보인다', await 웹.브라우저떴나(), true);
    const 서버주소 = await verify('브라우저 주소 줄이 우리 서버 주소와 같다', await 웹.주소글(), expected.서버주소);
    await verify('로그인 경로에서 우리 서버를 고르고 「다음」을 누르면 앱 안 브라우저 창에 서버 로그인 화면이 열린다', 열림 && 서버주소, true);
  });
});
