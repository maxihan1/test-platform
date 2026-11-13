import { defineCase, test, verify } from '@platform/kit';

import { 로그인화면 } from './pages/login.page.js';
import { 쿠키값심기, 쿠키읽기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-718',
  name: '깨진 anyrpg_ops 쿠키로 「/users」를 열면 /login?next=%2Fusers 로 가고 쿠키가 지워진다',
  precondition: ['로그인하지 않았다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);

  await test.step('로그인 화면을 연다', async () => {
    await verify('로그인 화면이 열려 있다', await 로그인.열렸나(), true, { blocker: true });
  });

  await test.step('깨진 anyrpg_ops 쿠키를 심고 「/users」를 연다', async () => {
    await 쿠키값심기(page, 'anyrpg_ops', 'broken');
    await 로그인.보호화면열기('/users');
    const 주소 = new URL(page.url());
    const 이동 = await verify('로그인 화면의 주소가 /login?next=%2Fusers 다', 주소.pathname + 주소.search, '/login?next=%2Fusers');
    const 지움 = await verify('깨진 anyrpg_ops 쿠키가 지워진다', await 쿠키읽기(page, 'anyrpg_ops'), undefined);
    await verify('깨진 anyrpg_ops 쿠키로 「/users」를 열면 /login?next=%2Fusers 로 가고 쿠키가 지워진다', 이동 && 지움, true);
  });
});
