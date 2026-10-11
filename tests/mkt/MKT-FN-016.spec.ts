import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 모달 } from './components/modal.component.js';
import { 곧보이는가, 일부막기 } from './helpers/home.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-016',
  name: '「오늘 하루 보지 않기」 없이 닫고 새로 고치면 공지 팝업이 다시 뜬다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);
  const 창 = new 모달(page);

  await test.step('공지 팝업을 「오늘 하루 보지 않기」 없이 닫고 새로 고친다', async () => {
    await 일부막기(page, { 쿠키: true, 설문: true });
    await 홈.열기();
    await 창.창.waitFor();
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('공지 팝업의 「오늘 하루 보지 않기」 는 꺼져 있다', await 홈.공지체크박스.isChecked(), false, { blocker: true });
    await 창.버튼('닫기').click();
    await 창.창.waitFor({ state: 'detached' });
    await page.reload();
    await verify('「오늘 하루 보지 않기」 없이 닫고 새로 고치면 공지 팝업이 다시 뜬다', await 곧보이는가(창.창, 5000), true);
  });

  await test.step('공지 팝업에서 「오늘 하루 보지 않기」 를 켜고 「닫기」 를 누른 뒤 홈 화면을 다시 연다', async () => {
    await 홈.공지체크박스.check();
    await 창.버튼('닫기').click();
    await 창.창.waitFor({ state: 'detached' });
    await 홈.추천까지열기();
    await verify('「오늘 하루 보지 않기」 를 켜고 닫은 뒤 홈 화면을 다시 열면 공지 팝업이 뜨지 않는다', await 창.창.isVisible(), false);
  });
});
