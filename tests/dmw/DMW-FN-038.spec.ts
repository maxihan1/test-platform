import { defineCase, test, verify } from '@platform/kit';

import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-038',
  name: '「오늘 하루 보지 않기」를 켜고 닫으면 홈을 다시 열어도 공지 팝업이 보이지 않는다',
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

  await test.step('「오늘 하루 보지 않기」를 켜고 공지 팝업을 닫은 뒤 홈 화면을 다시 연다', async () => {
    await 홈.공지체크.check();
    await 홈.공지창.버튼('닫기').click();
    await 홈.공지창.사라질때까지();
    await 홈.열고설정응답까지();
    await verify('「오늘 하루 보지 않기」를 켜고 닫으면 홈을 다시 열어도 공지 팝업이 보이지 않는다', await 홈.공지창.창.isVisible(), false);
  });
});
