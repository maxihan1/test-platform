import { defineCase, test, verify } from '@platform/kit';
import { 보이나 } from '@platform/kit/parts';

import { 로그인서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-025',
  name: '로그인용 서버 고르기 화면에 필터 칩이 보이지 않는다',
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
    await verify('제목 「돌아오신 것을 환영합니다」가 보인다', await 고르기.글보이나('돌아오신 것을 환영합니다'), true, { blocker: true });
  });

  await test.step('로그인용 서버 고르기 화면의 필터 칩을 확인한다', async () => {
    const 영역 = await verify('필터 칩 영역이 보이지 않는다', await 보이나(driver, 고르기.필터영역), false);
    const 칩 = await verify('「모든 언어」 칩이 보이지 않는다', await 보이나(driver, 고르기.화면글('모든 언어')), false);
    await verify('로그인용 서버 고르기 화면에 필터 칩이 보이지 않는다', 영역 === false && 칩 === false, true);
  });
});
