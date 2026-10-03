import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쿠키띠 } from './components/cookie-bar.component.js';
import { 게시판목록 } from './pages/board-list.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-012',
  name: '「동의」를 누르면 쿠키 안내 띠가 사라지고 이 브라우저에서 다시 나오지 않는다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 띠 = new 쿠키띠(page);
  const 목록 = new 게시판목록(page);

  await test.step('쿠키 안내 띠에서 「동의」를 누른다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.설문을치운다();
    await 홈.열기();
    await 띠.동의.click();
    await verify('「동의」를 누르면 쿠키 안내 띠가 보이지 않는다', await 띠.영역.isVisible(), false);
  });

  await test.step('쿠키 안내 띠에서 「동의」를 누르고 다른 화면을 연다', async () => {
    await 홈.동의기록을지운다();
    await 홈.열기();
    await 홈.저작권문구.waitFor();
    await 띠.동의.click();
    await 목록.열기();
    await 홈.저작권문구.waitFor();
    await verify('「동의」를 누른 뒤에는 이 브라우저에서 쿠키 안내 띠가 다시 나오지 않는다', await 띠.영역.isVisible(), false);
  });
});
