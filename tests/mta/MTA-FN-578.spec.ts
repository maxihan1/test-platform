import { defineCase, test, verify } from '@platform/kit';

import { 서버고르기화면 } from './pages/server-chooser.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-578',
  name: '서버 URL 입력에 점이 없으면 서버 카드를 찾지 않는다',
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
  await test.step('가입 경로 서버 고르기를 연다', async () => {
    await 시작.누르기('다른서버선택');
    await verify('서버 고르기 입력칸이 보인다', await 서버화면.떴나(), true, { blocker: true });
  });
  await test.step('가입 경로 서버 고르기에 점이 없는 「maxihan」을 적는다', async () => {
    await 서버화면.서버적기('maxihan');
    await verify('서버 URL 입력에 점이 없으면 서버 카드를 찾지 않는다', (await 서버화면.카드글자들()).filter((글) => 글.includes('maxihan')).join(', '), '');
  }, { capture: true });
});
