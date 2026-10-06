import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-014',
  name: '너비 768px 쇼핑 화면 머리글에 햄버거 버튼 「메뉴 열기」가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '화면 너비가 768px 이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('너비 768px 로 쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await page.setViewportSize({ width: 768, height: 900 });
    await 쇼핑.열기();
    await verify('화면 너비가 768px 이다', page.viewportSize()?.width, 768, { blocker: true });
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.count(), 1, { blocker: true });
    await verify('너비 768px 쇼핑 화면 머리글에 햄버거 버튼 「메뉴 열기」가 보인다', await 쇼핑.머리글.햄버거.isVisible(), true);
    await verify('너비 768px 머리글에서는 「커뮤니티」 메뉴가 접혀 보이지 않는다', await 쇼핑.화면안에보이나(쇼핑.머리글.커뮤니티메뉴), false);
  });
});
