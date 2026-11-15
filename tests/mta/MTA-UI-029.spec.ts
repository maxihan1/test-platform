import { defineCase, test, verify } from '@platform/kit';

import { 가입서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-029',
  name: '가입용 서버 고르기에서 「초대 링크 사용하기」를 누르면 「초대 링크 입력하기」 입력 창이 뜬다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 고르기 = new 서버고르기화면(driver);

  await test.step('앱을 켜서 가입용 서버 고르기 화면을 연다', async () => {
    await 가입서버고르기까지(driver);
    await verify('가입용 서버 고르기 입력 칸이 보인다', await 고르기.그려질때까지(), true, { blocker: true });
  });

  await test.step('가입용 서버 고르기에서 「초대 링크 사용하기」를 누른다', async () => {
    await 고르기.초대링크사용누르기();
    await verify('가입용 서버 고르기에서 「초대 링크 사용하기」를 누르면 「초대 링크 입력하기」 입력 창이 뜬다', await 고르기.글보이나('초대 링크 입력하기'), true);
  });
});
