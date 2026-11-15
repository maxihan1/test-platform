import { defineCase, test, verify } from '@platform/kit';

import { 로그인서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-023',
  name: '로그인용 서버 고르기 화면 입력 칸에 힌트 「서버 URL」이 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('로그인용 서버 고르기 화면을 연다', async () => {
    await 로그인서버고르기까지(driver);
    await verify('로그인용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await verify('로그인용 서버 고르기 화면 입력 칸에 힌트 「서버 URL」이 보인다', await 고르기.입력칸글(), '서버 URL');
  });
});
