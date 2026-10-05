import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-034',
  name: '쿠키 안내 띠의 「동의」를 누르면 띠가 사라진다',
  platforms: ['desktop'],
  precondition: ['처음 방문한 비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 쇼핑.열기();
    await verify('처음 방문한 비회원이다', (await 쇼핑.머리글.로그인링크.isVisible()) && (await 쇼핑.쿠키띠.영역.isVisible()), true, { blocker: true });
  });

  await test.step('쿠키 안내 띠의 「동의」를 누른다', async () => {
    await 쇼핑.쿠키띠.동의버튼.click();
    await verify('쿠키 안내 띠의 「동의」를 누르면 띠가 사라진다', await 쇼핑.쿠키띠.영역.isVisible(), false);
  });

  await test.step('쇼핑 화면을 새로 고친다', async () => {
    await 쇼핑.새로고침();
    await verify('동의한 브라우저에는 쿠키 안내 띠가 다시 보이지 않는다', await 쇼핑.쿠키띠.영역.isVisible(), false);
  });
});
