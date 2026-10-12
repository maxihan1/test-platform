import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 처음방문인가, 화면아래붙었나 } from './helpers/common-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-029',
  name: '처음 방문한 브라우저로 홈을 열면 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
  precondition: ['처음 방문한 브라우저다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 쿠키 = new 쿠키띠(page);
  const 홈 = new 홈화면(page);

  await test.step('처음 방문한 브라우저인지 확인한다', async () => {
    await verify('브라우저에 저장된 방문 기록이 없다', await 처음방문인가(page), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 쿠키띠: false });
    await 홈.열기();
    await 쿠키.띠.waitFor();
    await verify(
      '처음 방문한 브라우저로 홈을 열면 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」와 「동의」 버튼이 보인다',
      { 안내글: await 쿠키.안내.isVisible(), 동의버튼: await 쿠키.동의.isVisible(), 화면아래: await 화면아래붙었나(쿠키.띠) },
      { 안내글: true, 동의버튼: true, 화면아래: true },
    );
  });
});
