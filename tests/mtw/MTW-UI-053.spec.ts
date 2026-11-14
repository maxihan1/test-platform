import { defineCase, test, verify } from '@platform/kit';

import { 한국어로 } from './helpers/page-setup.helper.js';
import { 실시간피드화면 } from './pages/public-feed.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-053',
  name: '로그인 안내 창에서 「계정 생성」을 누르면 가입 화면으로 간다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 실시간피드화면(page);

  await test.step('로그인 전 실시간 피드에서 글의 「좋아요」를 눌러 로그인 안내 창을 연다', async () => {
    await 한국어로(page);
    await 화면.열기();
    await 화면.좋아요.click();
    await 화면.안내창.창.waitFor();
    await verify('로그인 안내 창에 「계정 생성」이 보인다', await 화면.안내창.계정생성.isVisible(), true, { blocker: true });
  });

  await test.step('로그인 안내 창에서 「계정 생성」을 누른다', async () => {
    await 화면.안내창.계정생성.click();
    await 화면.가입등록.waitFor();
    await verify('로그인 안내 창에서 「계정 생성」을 누르면 가입 화면으로 간다', new URL(page.url()).pathname, '/auth/sign_up');
    await verify('「마스토돈에서 가입」 창은 뜨지 않는다', await 화면.가입안내창.isVisible(), false);
  });
});
