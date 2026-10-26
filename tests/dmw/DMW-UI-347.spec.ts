import { defineCase, test, verify } from '@platform/kit';

import { 화면제목 } from './components/page-heading.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 비밀번호찾기화면 } from './pages/find-password.page.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-347',
  name: '비밀번호 찾기 화면에서 「로그인으로 돌아가기」를 누르면 로그인 화면이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 찾기 = new 비밀번호찾기화면(page);
  const 로그인 = new 로그인화면(page);
  const 제목 = new 화면제목(page);
  await 안내창막기(page);

  await test.step('비밀번호 찾기 화면의 「로그인으로 돌아가기」를 누른다', async () => {
    await 찾기.열기();
    await 찾기.로그인으로돌아가기.click();
    await 로그인.아이디.waitFor();
    await verify('비밀번호 찾기 화면에서 「로그인으로 돌아가기」를 누르면 로그인 화면이 보인다', await 제목.글('로그인').isVisible(), true);
  });
});
