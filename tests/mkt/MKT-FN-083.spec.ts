import { defineCase, test, verify } from '@platform/kit';

import { 머리글 } from './components/header.component.js';
import { 방해막기 } from './helpers/account.helper.js';
import { 옵션상품번호, 재고1상품 } from './helpers/shop.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-083',
  name: '수량이 1이면 「−」 가 눌리지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다', '재고가 1인 상품이다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ page, request }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('상품 상세를 연다', async () => {
    await 방해막기(page);
    await 상세.열기(옵션상품번호);
    await verify('머리글에 「로그인」 링크가 보인다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('수량이 1이면 「−」 가 눌리지 않는다', await 상세.수량줄이기.isDisabled(), true);
  });

  await test.step('수량 「+」 를 10까지 누른다', async () => {
    for (let 번 = 1; 번 < 10; 번 += 1) await 상세.수량늘리기.click();
    await verify('수량이 10이다', await 상세.수량칸.inputValue(), '10', { blocker: true });
    await verify('수량이 10이면 「+」 가 눌리지 않는다', await 상세.수량늘리기.isDisabled(), true);
  });

  await test.step('재고가 1인 상품 상세를 연다', async () => {
    await 상세.열기((await 재고1상품(request)).id);
    await verify('재고가 1인 상품은 수량 1에서 「+」 가 눌리지 않는다', await 상세.수량늘리기.isDisabled(), true);
  });
});
