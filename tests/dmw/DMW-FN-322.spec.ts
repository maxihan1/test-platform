import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-322',
  name: '비회원이 /admin 을 열면 로그인 화면으로 간다',
  platforms: ['desktop', 'mobile'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 제목 = new 화면제목(page);

  await test.step('비회원임을 확인한다', async () => {
    await 안내창막기(page);
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('비회원으로 /admin 을 연다', async () => {
    await page.goto(관리자화면.주소);
    await 제목.글('로그인').waitFor();
    const 화면 = await verify('로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
    const 주소 = await verify('주소가 로그인 화면이다', new URL(page.url()).pathname, '/login');
    await verify('비회원이 /admin 을 열면 로그인 화면으로 간다', 화면 && 주소, true);
  });
});
