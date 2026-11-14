import { defineCase, test, verify } from '@platform/kit';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-021',
  name: '로그인 경로 서버 고르기 화면 제목은 「돌아오신 것을 환영합니다」이고 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다',
  platforms: ['android'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: null,
  expected: null,
});

test(spec, async ({ driver }) => {
  const 시작 = new 시작화면(driver);
  const 서버화면 = new 서버고르기화면(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('시작 화면에서 「로그인」을 누른다', async () => {
    await 시작.누르기('로그인');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
    const 제목 = await verify('화면 제목이 「돌아오신 것을 환영합니다」다', await 문구가보이나(driver, '돌아오신 것을 환영합니다'), true);
    const 안내 = await verify('안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', await 문구가보이나(driver, '계정을 생성한 서버에 로그인하세요.'), true);
    await verify('로그인 경로 서버 고르기 화면 제목은 「돌아오신 것을 환영합니다」이고 안내 「계정을 생성한 서버에 로그인하세요.」가 보인다', 제목 && 안내, true);
  }, { capture: true });
});
