import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-025',
  name: '로그인 화면의 브라우저 탭 제목이 「운영자 로그인 | Boss Room」으로 보인다',
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await 로그인.열기();
    await verify('로그인 화면의 브라우저 탭 제목이 「운영자 로그인 | Boss Room」으로 보인다', await 로그인.탭제목(), '운영자 로그인 | Boss Room');
  });
});
