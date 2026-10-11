import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 옵션상품번호 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-084',
  name: '수량 칸에 0을 적으면 1로 고쳐진다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세 화면을 연다', async () => {
    await 방해막기(page);
    await 상세.열기(옵션상품번호);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
  });

  await test.step('수량 칸에 0을 적는다', async () => {
    await 상세.수량적기(0);
    await verify('수량 칸에 0을 적으면 1로 고쳐진다', await 상세.수량칸.inputValue(), '1');
  });

  await test.step('수량 칸에 11을 적는다', async () => {
    await 상세.수량적기(11);
    await verify('수량 칸에 11을 적으면 10으로 고쳐진다', await 상세.수량칸.inputValue(), '10');
  });
});
