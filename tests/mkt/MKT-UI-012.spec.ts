import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-012',
  name: '처음 방문하면 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」가 보인다',
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
    await verify(
      '처음 방문하면 화면 아래에 쿠키 안내 띠 「서비스 개선을 위해 쿠키를 사용합니다.」가 보인다',
      await 쇼핑.쿠키띠.안내문구.isVisible(),
      true,
    );
    await verify('쿠키 안내 띠에 「동의」 버튼이 보인다', await 쇼핑.쿠키띠.동의버튼.isVisible(), true);
    await verify('쿠키 안내 띠가 화면 아래 내용을 덮어 보인다', await 쇼핑.쿠키띠가덮고있나(), true);
  });
});
