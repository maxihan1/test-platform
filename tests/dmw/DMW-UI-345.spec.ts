import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 가입완료화면 } from './pages/signup-done.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-345',
  name: '가입 완료 화면에서 「로그인하러 가기」를 누르면 로그인 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 완료 = new 가입완료화면(page);
  const 로그인 = new 로그인화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('가입 완료 화면의 「로그인하러 가기」를 누른다', async () => {
    await 완료.열기();
    await 완료.로그인하러가기.click();
    await 로그인.아이디.waitFor();
    await verify('가입 완료 화면에서 「로그인하러 가기」를 누르면 로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
  });
});
