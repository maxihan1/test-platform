import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-001',
  name: '홈 화면의 머리글과 바닥글에 로고 · 메뉴 · 로그인 영역 · 약관 링크가 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: z.object({}),
  expected: z.object({}),
});

test(spec, async ({ page }) => {
  const 홈 = new 홈화면(page);
  const 머리 = new 머리글(page);

  await test.step('홈 화면을 연다', async () => {
    await 홈.공지팝업을치운다();
    await 홈.열기();
    await 머리.로그인링크.waitFor();
    await 홈.저작권문구.waitFor();
    const 로고 = await 머리.로고.boundingBox();
    const 메뉴 = await 머리.주메뉴.boundingBox();
    const 로그인 = await 머리.로그인링크.boundingBox();
    const 장바구니 = await 머리.장바구니.boundingBox();
    const 메뉴가운데 = (메뉴?.x ?? 0) + (메뉴?.width ?? 0) / 2;
    await verify('머리글 왼쪽에 로고 「데모마켓」이 보인다', (await 머리.로고.isVisible()) && (로고?.x ?? 9999) < (메뉴?.x ?? 0), true);
    const 메뉴보임 = await Promise.all([머리.커뮤니티, 머리.쇼핑, 머리.고객센터].map((요소) => 요소.isVisible()));
    await verify(
      '머리글 가운데에 메뉴 「커뮤니티」 · 「쇼핑」 · 「고객센터」가 보인다',
      메뉴보임.every(Boolean) && 메뉴가운데 > (로고?.x ?? 0) + (로고?.width ?? 0) && 메뉴가운데 < (로그인?.x ?? 0),
      true,
    );
    await verify(
      '머리글 오른쪽에 로그인 영역과 장바구니 아이콘이 보인다',
      (await 머리.로그인링크.isVisible()) && (await 머리.장바구니.isVisible()) && (로그인?.x ?? 0) > 메뉴가운데 && (장바구니?.x ?? 0) > 메뉴가운데,
      true,
    );
    await verify(
      '비회원에게는 머리글 오른쪽에 「로그인」 · 「회원가입」 링크가 보인다',
      (await 머리.로그인링크.isVisible()) && (await 머리.회원가입링크.isVisible()),
      true,
    );
    await verify('비회원에게는 장바구니 아이콘 옆에 숫자 배지가 보이지 않는다', await 머리.장바구니배지.isVisible(), false);
    await verify(
      '바닥글에 「이용약관」 · 「개인정보처리방침」 링크가 보인다',
      (await 홈.이용약관링크.isVisible()) && (await 홈.개인정보링크.isVisible()),
      true,
    );
    await verify('바닥글에 「© 2026 DemoMarket」 문구가 보인다', await 홈.저작권문구.isVisible(), true);
  });
});
