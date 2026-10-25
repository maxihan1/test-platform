import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-045',
  name: '이벤트 띠의 X 를 누르면 띠가 보이지 않는다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page);

  await test.step('이벤트 띠가 뜬 홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.이벤트띠.waitFor();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('이벤트 띠가 보인다', await 홈.이벤트띠.isVisible(), true, { blocker: true });
  });

  await test.step('이벤트 띠의 X 를 누른다', async () => {
    await 홈.이벤트띠닫기.click();
    await verify('이벤트 띠의 X 를 누르면 띠가 보이지 않는다', await 홈.이벤트띠.isVisible(), false);
  });
});
