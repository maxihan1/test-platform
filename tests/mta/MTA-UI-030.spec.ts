import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-030',
  name: '가입용 서버 고르기 화면에 서버를 고르기 전 「다음」이 꺼져 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
    await verify('가입용 서버 고르기 화면에 서버를 고르기 전 「다음」이 꺼져 보인다', await 고르기.다음켜졌나(), false);
  });
});
