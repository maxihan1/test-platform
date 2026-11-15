import { defineCase, test, verify } from '@platform/kit';

import { 로그인서버고르기까지 } from './helpers/signup-flow.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-021',
  name: '로그인용 서버 고르기 화면에 제목 「돌아오신 것을 환영합니다」와 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다',
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
    const 제목 = await verify('제목 「돌아오신 것을 환영합니다」가 보인다', await 고르기.글보이나('돌아오신 것을 환영합니다'), true);
    const 안내 = await verify('안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', await 고르기.글보이나('계정을 생성한 서버에 로그인하세요.'), true);
    await verify('로그인용 서버 고르기 화면에 제목 「돌아오신 것을 환영합니다」와 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', 제목 && 안내, true);
  });
});
