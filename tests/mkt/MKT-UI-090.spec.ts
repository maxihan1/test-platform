import { defineCase, test, verify } from '@platform/kit';

import { 상품번호 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-090',
  name: '상품 상세에 수량 「−」 · 「+」 버튼과 숫자 칸이 보인다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.수량칸.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    const 보임 = await Promise.all([상세.수량줄이기.isVisible(), 상세.수량늘리기.isVisible(), 상세.수량칸.isVisible()]);
    await verify('상품 상세에 수량 「−」 · 「+」 버튼과 숫자 칸이 보인다', 보임, [true, true, true]);
  });
});
