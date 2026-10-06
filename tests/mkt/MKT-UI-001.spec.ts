import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창끄기 } from './components/session.component.js';
import { 쇼핑화면 } from './pages/common-shop.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-001',
  name: '쇼핑 화면 머리글 왼쪽에 「데모마켓」 로고가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 쇼핑 = new 쇼핑화면(page);

  await test.step('쇼핑 화면을 연다', async () => {
    await 안내창끄기(page);
    await 쇼핑.열기();
    await verify('비회원이다', await 쇼핑.머리글.로그인링크.isVisible(), true, { blocker: true });
    const 로고 = await 쇼핑.가로중심(쇼핑.머리글.로고);
    const 메뉴 = await 쇼핑.가로중심(쇼핑.머리글.주메뉴);
    const 장바구니 = await 쇼핑.가로중심(쇼핑.머리글.장바구니링크);
    await verify('쇼핑 화면 머리글 왼쪽에 「데모마켓」 로고가 보인다', (await 쇼핑.머리글.로고.isVisible()) && 로고 < 메뉴, true);
    await verify(
      '머리글 가운데에 「커뮤니티」 · 「쇼핑」 · 「고객센터」 메뉴가 보인다',
      (await 쇼핑.머리글.커뮤니티메뉴.isVisible()) && (await 쇼핑.머리글.쇼핑메뉴.isVisible()) && (await 쇼핑.머리글.고객센터메뉴.isVisible()) && 로고 < 메뉴 && 메뉴 < 장바구니,
      true,
    );
    await verify('머리글 오른쪽에 장바구니 아이콘이 보인다', (await 쇼핑.머리글.장바구니링크.isVisible()) && 메뉴 < 장바구니, true);
  });
});
