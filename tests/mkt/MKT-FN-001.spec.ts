import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-001',
  name: '쇼핑 화면에서 「데모마켓」 로고를 누르면 홈 화면으로 간다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);
  const 홈 = new 홈화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 화면에서 「데모마켓」 로고를 누른다', async () => {
    await 쇼핑.머리글.로고.click();
    await 홈.제목.waitFor();
    await verify('쇼핑 화면에서 「데모마켓」 로고를 누르면 홈 화면으로 간다', new URL(page.url()).pathname, '/');
  });
});
