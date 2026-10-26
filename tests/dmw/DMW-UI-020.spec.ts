import { defineCase, test, verify } from '@platform/kit';

import { 쿠키안내 } from './components/cookie-bar.component.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-020',
  name: '처음 방문하면 화면 아래에 쿠키 안내 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 쿠키 = new 쿠키안내(page);
  await 안내창막기(page, { 쿠키: false });

  await test.step('처음 방문한 브라우저로 홈 화면을 연다', async () => {
    await 홈.열기();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('홈 화면이 보인다', await 홈.추천제목.isVisible(), true, { blocker: true });
    const 문구 = await verify('쿠키 안내 「서비스 개선을 위해 쿠키를 사용합니다.」가 보인다', await 쿠키.문구.isVisible(), true);
    const 동의 = await verify('쿠키 안내의 「동의」 버튼이 보인다', await 쿠키.동의.isVisible(), true);
    await verify('처음 방문하면 화면 아래에 쿠키 안내 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다', 문구 && 동의, true);
  });
});
