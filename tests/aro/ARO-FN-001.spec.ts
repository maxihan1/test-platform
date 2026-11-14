import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-001',
  name: '로그인하지 않은 채 「/users」를 열면 로그인 화면으로 가고 주소의 next 값이 「/users」다',
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인하지 않은 채 「/users」 주소를 연다', async () => {
    await 로그인.보호화면열기('/users');
    const 화면 = await verify('로그인 화면이 보인다', await 로그인.제목.isVisible(), true);
    const 다음 = await verify('주소의 next 값이 「/users」다', 로그인.다음주소(), '/users');
    await verify('로그인하지 않은 채 「/users」를 열면 로그인 화면으로 가고 주소의 next 값이 「/users」다', 화면 && 다음, true);
  });
});
