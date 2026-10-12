import { defineCase, test, verify } from '@platform/kit';

import { 세션아이디 } from './helpers/common-tools.helper.js';
import { 최신순인가 } from './helpers/member-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-034',
  name: '「최신글」 탭을 누르면 작성 순 글 5건이 보인다',
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);

  await test.step('비회원인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 세션아이디(page), null, { blocker: true });
  });

  await test.step('홈을 열고 「인기글」 탭이 골라져 있는지 확인한다', async () => {
    await 방해막기(page);
    await 홈.열기();
    await 홈.글링크들.first().waitFor();
    await verify('「인기글」 탭이 골라져 있다', await 홈.인기글탭.getAttribute('aria-selected'), 'true', { blocker: true });
  });

  await test.step('홈에서 「최신글」 탭을 누른다', async () => {
    await 홈.최신글탭.click();
    await 홈.글링크들.first().waitFor();
    const 글들 = await 홈.글항목들.allInnerTexts();
    await verify(
      '「최신글」 탭을 누르면 작성 순 글 5건이 보인다',
      { 골라진탭: await 홈.최신글탭.getAttribute('aria-selected'), 건수: 글들.length, 작성순: 최신순인가(글들) },
      { 골라진탭: 'true', 건수: 5, 작성순: true },
    );
  });
});
