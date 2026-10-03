import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 공통보충화면 } from './pages/common-misc.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-005',
  name: '처음 방문하면 화면 아래에 쿠키 안내 띠와 「동의」 버튼이 보인다',
  precondition: ['처음 방문한 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 공통보충화면(page);
  const 띠 = new 쿠키띠(page);

  await test.step('홈 화면을 연다', async () => {
    await new 홈화면(page).열기();
    await 띠.영역().waitFor();
    await verify('화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」가 보인다', await 화면.쿠키안내문구().isVisible(), true, { blocker: true });
    await verify('쿠키 안내 띠에 「동의」 버튼이 보인다', await 띠.동의버튼().isVisible(), true);
    await verify(
      '동의하기 전의 쿠키 안내 띠는 화면 아래쪽에 붙어 아래 내용을 덮는다',
      [(await 화면.쿠키띠아래끝과화면아래끝의차()) <= 1, await 화면.쿠키띠위치방식()],
      [true, 'fixed'],
    );
  });
});
