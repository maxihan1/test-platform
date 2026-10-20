import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 운영툴화면 } from './pages/ops.page.js';

export const spec = defineCase({
  tcId: 'MKO-FN-009',
  name: '비회원이 주소 「/ops」를 열면 로그인 화면으로 간다',
  platforms: ['desktop'],
  techniques: ['동등 분할'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 운영툴 = new 운영툴화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 계정이 없다', await 로그인한아이디(page), null, { blocker: true });
  });

  await test.step('주소 「/ops」를 연다', async () => {
    await 운영툴.열기();
    const 주소 = await verify('주소가 「/login」이다', new URL(page.url()).pathname, 로그인화면.주소);
    const 머리글 = await verify('「로그인」 머리글이 보인다', await 로그인.머리글.isVisible(), true);
    await verify('비회원이 주소 「/ops」를 열면 로그인 화면으로 간다', 주소 && 머리글, true);
  });
});
