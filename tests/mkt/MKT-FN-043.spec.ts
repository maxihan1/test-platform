import { defineCase, test, verify } from '@platform/kit';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 게시판목록화면 } from './pages/board-list.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-043',
  name: '글이 11건 이상이면 한 페이지에 글 10개가 보이고 끝 페이지에서 「이전」 「다음」이 눌리지 않는다',
  precondition: ['글이 11건 이상이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 게시판목록화면(page);
  const 총수: number = (await (await page.request.get('/api/posts?size=1')).json()).total;
  const 마지막쪽 = Math.ceil(총수 / 10);

  await test.step('게시판 목록 첫 페이지를 연다', async () => {
    await 목록.열기();
    await 목록.글줄().first().waitFor();
    await verify('글이 11건 이상이다', 총수 >= 11, true, { blocker: true });
    await verify('한 페이지에 글 10개가 보인다', await 목록.일반글줄().count(), 10);
    await verify('첫 페이지에서는 「이전」이 눌리지 않는다', await 목록.이전버튼().isDisabled(), true);
  });

  await test.step('마지막 페이지를 연다', async () => {
    await new 쿠키띠(page).동의하기();
    await 목록.쪽버튼(마지막쪽).click();
    await 목록.글줄().first().waitFor();
    await verify('마지막 페이지에서는 「다음」이 눌리지 않는다', await 목록.다음버튼().isDisabled(), true);
  });
});
