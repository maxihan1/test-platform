import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-273',
  name: '비회원이 /admin 을 열면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('비회원으로 화면을 연다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', ((await (await page.request.get('/api/session')).json()) as { user: unknown }).user, null, { blocker: true });
  });

  await test.step('관리자 화면 /admin 을 연다', async () => {
    await page.goto('/admin');
    await 로그인.폼.waitFor();
    await verify('비회원이 /admin 을 열면 로그인 화면으로 간다', await 로그인.제목.isVisible(), true);
  });
});
