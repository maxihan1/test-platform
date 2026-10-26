import { defineCase, test, verify } from '@platform/kit';

import { 화면가운데인가 } from './helpers/member-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-033',
  name: '홈에 처음 들어오면 가운데에 공지 팝업과 「닫기」 버튼, 「오늘 하루 보지 않기」 체크박스가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  await 안내창막기(page, { 공지: false });

  await test.step('공지 팝업을 숨기지 않은 브라우저로 홈 화면을 연다', async () => {
    await 홈.열기();
    await 홈.공지창이자리잡을때까지();
    await verify('비회원이다', await 홈.머리.로그인.isVisible(), true, { blocker: true });
    const 팝업 = await verify('공지 팝업이 보인다', await 홈.공지창.창.isVisible(), true);
    const 가운데 = await verify('공지 팝업이 화면 가운데에 있다', await 화면가운데인가(page, 홈.공지창.창), true);
    const 닫기 = await verify('공지 팝업에 「닫기」 버튼이 보인다', await 홈.공지창.버튼('닫기').isVisible(), true);
    const 체크 = await verify(
      '공지 팝업에 「오늘 하루 보지 않기」 체크박스가 보인다',
      await 홈.공지체크.isVisible(),
      true,
    );
    await verify('홈에 처음 들어오면 가운데에 공지 팝업과 「닫기」 버튼, 「오늘 하루 보지 않기」 체크박스가 보인다', 팝업 && 가운데 && 닫기 && 체크, true);
  });
});
