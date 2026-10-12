import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 재고많은상품, 재고적은상품 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-152',
  name: '수량 칸에 0 을 넣으면 수량이 1 로 바뀐다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다', '재고가 10개보다 적은 상품이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  const 많은 = await 재고많은상품(page.request);
  const 적은 = await 재고적은상품(page.request);

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(많은.id);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세 수량 칸에 0 을 넣는다', async () => {
    await 상세.수량적기('0');
    await verify('수량 칸에 0 을 넣으면 수량이 1 로 바뀐다', await 상세.수량값(), '1');
  });

  await test.step('상품 상세 수량 1 에서 「−」를 누른다', async () => {
    await 상세.줄이기.click({ force: true });
    await verify('수량 1 에서는 「−」를 눌러도 수량이 1 이다', await 상세.수량값(), '1');
  });

  await test.step('재고가 10개 넘는 상품 수량을 「+」로 10 까지 올린다', async () => {
    await 상세.늘리기누르기(9);
    await verify('재고가 10개 넘는 상품은 수량이 10 까지 올라간다', await 상세.수량값(), '10');
  });

  await test.step('재고가 10개 넘는 상품 수량 칸에 11 을 넣는다', async () => {
    await 상세.수량적기('11');
    await verify('수량 칸에 11 을 넣으면 수량이 10 으로 바뀐다', await 상세.수량값(), '10');
  });

  await test.step('재고가 10개보다 적은 상품 상세를 연다', async () => {
    await 상세.열기(적은.id);
    await 상세.화면기다리기();
    await verify('재고가 10개보다 적은 상품이 있다', 적은.stock > 0 && 적은.stock < 10, true, { blocker: true });
  });

  await test.step('그 상품 수량을 「+」로 끝까지 올린다', async () => {
    await 상세.늘리기끝까지누르기(12);
    await verify('재고가 10개보다 적은 상품은 수량이 재고 수에서 멈춘다', await 상세.수량값(), String(적은.stock));
  });
});
