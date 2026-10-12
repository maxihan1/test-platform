import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 사라졌나 } from './helpers/view.helper.js';

export const spec = defineCase({
  tcId: 'MKS-FN-396',
  name: '「공지사항」 팝업에서 「닫기」를 누르면 팝업이 보이지 않는다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 방해막기(page, { 공지팝업: false });
    await 홈.열기();
    await 홈.공지창.waitFor();
  });

  await test.step('공지사항 팝업이 보이는지 확인한다', async () => {
    await verify('홈에 「공지사항」 팝업이 보인다', await 홈.공지창.isVisible(), true, { blocker: true });
  });

  await test.step('홈의 「공지사항」 팝업에서 「닫기」를 누른다', async () => {
    await 홈.공지닫기.click();
    await verify('「공지사항」 팝업에서 「닫기」를 누르면 팝업이 보이지 않는다', await 사라졌나(홈.공지창), true);
  });
});
