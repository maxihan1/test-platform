import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-346',
  name: '로그인 화면에서 「회원가입」을 누르면 회원가입 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 로그인 = new 로그인화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('로그인 화면의 「회원가입」 링크를 누른다', async () => {
    await 로그인.열기();
    await 로그인.회원가입링크.click();
    await 로그인.머리.그려질때까지();
    await verify('로그인 화면에서 「회원가입」을 누르면 회원가입 화면이 보인다', await 제목.글('회원가입').isVisible(), true);
  });

  await test.step('로그인 화면의 「비밀번호 찾기」 링크를 누른다', async () => {
    await 로그인.열기();
    await 로그인.비밀번호찾기링크.click();
    await 로그인.머리.그려질때까지();
    await verify('로그인 화면에서 「비밀번호 찾기」를 누르면 비밀번호 찾기 화면이 보인다', await 제목.글('비밀번호 찾기').isVisible(), true);
  });

  await test.step('「로그인 상태 유지」 체크박스를 누른다', async () => {
    await 로그인.열기();
    await 로그인.상태유지.click();
    await verify('로그인 화면에서 「로그인 상태 유지」를 누르면 체크가 켜진다', await 로그인.상태유지.isChecked(), true);
  });
});
