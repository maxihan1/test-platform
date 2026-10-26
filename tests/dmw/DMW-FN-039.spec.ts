import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-039',
  name: '체크하지 않고 공지 팝업을 닫으면 새로 고칠 때 공지 팝업이 다시 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page, { 공지: false });

  await test.step('공지 팝업이 뜬 홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.공지창.뜰때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    await verify('공지 팝업이 보인다', await 홈.공지창.창.isVisible(), true, { blocker: true });
  });

  await test.step('체크하지 않고 공지 팝업을 닫은 뒤 새로 고친다', async () => {
    await 홈.공지창.버튼('닫기').click();
    await 홈.공지창.사라질때까지();
    await page.reload();
    await 홈.공지창.뜰때까지();
    await verify('체크하지 않고 공지 팝업을 닫으면 새로 고칠 때 공지 팝업이 다시 보인다', await 홈.공지창.창.isVisible(), true);
  });
});
