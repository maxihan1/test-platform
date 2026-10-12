import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 세션아이디, 처음방문인가, 화면아래붙었나 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-027',
  name: '처음 방문한 홈 아래에 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
  precondition: ['쿠키 안내에 동의한 적 없는 비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);
  const 홈 = new 홈화면(page);

  await test.step('쿠키 안내에 동의한 적 없는 비회원인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await 홈.열기();
    await 쿠키.띠.waitFor();
    await verify(
      '처음 방문한 홈 아래에 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
      { 안내글: await 쿠키.안내.isVisible(), 동의버튼: await 쿠키.동의.isVisible(), 화면아래: await 화면아래붙었나(쿠키.띠) },
      { 안내글: true, 동의버튼: true, 화면아래: true },
    );
  });
});
