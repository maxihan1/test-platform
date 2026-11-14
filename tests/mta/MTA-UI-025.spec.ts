import { defineCase, test, verify } from '@platform/kit';

import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-025',
  name: '로그인 경로 서버 고르기에는 필터 칩이 없다',
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
    await verify('로그인 경로 서버 고르기에는 필터 칩이 없다', await 서버화면.필터줄이보이나(), false);
  }, { capture: true });
});
