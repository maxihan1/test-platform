import { defineCase, test, verify } from '@platform/kit';

import { 상품번호, 상품조회 } from './components/data.component.js';
import { 머리글 } from './components/header.component.js';
import { 안내창끄기 } from './components/session.component.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-269',
  name: '수량이 최소 1이면 「−」 버튼이 눌리지 않는다',
  platforms: ['desktop'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
  techniques: ['경계값 분석'],
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);
  const 머리 = new 머리글(page);

  await test.step('재고가 10개 넘는 상품 상세를 연다', async () => {
    await 안내창끄기(page, { 공지: false, 설문: false });
    await 상세.열기(상품번호.니트가디건);
    await 상세.수량칸.waitFor();
    await 머리.로그인링크.waitFor();
    await verify('비회원이다', await 머리.로그인링크.isVisible(), true, { blocker: true });
    await verify('재고가 10개 넘는 상품이다', (await 상품조회(page.request, 상품번호.니트가디건)).stock > 10, true, { blocker: true });
    await verify('수량이 최소 1이면 「−」 버튼이 눌리지 않는다', await 상세.수량줄이기.isDisabled(), true);
  });

  await test.step('수량 칸에 0을 적고 칸을 벗어난다', async () => {
    await 상세.수량적기(0);
    await 상세.수량칸.blur();
    await verify('수량 칸에 0을 넣으면 수량이 1로 돌아간다', await 상세.수량칸.inputValue(), '1');
  });

  await test.step('수량 「+」를 수량이 10이 될 때까지 누른다', async () => {
    await 상세.수량늘리기를(9);
    await verify('재고가 10개 넘는 상품은 수량 10에서 「+」 버튼이 눌리지 않는다', await 상세.수량과늘리기상태(), '수량 10 · 「+」 눌리지 않음');
  });

  await test.step('수량 칸에 11을 적고 칸을 벗어난다', async () => {
    await 상세.수량적기(11);
    await 상세.수량칸.blur();
    await verify('수량 칸에 11을 넣으면 수량이 10으로 바뀐다', await 상세.수량칸.inputValue(), '10');
  });

  await test.step('재고가 1개인 상품 상세를 연다', async () => {
    await 상세.열기(상품번호.콜드브루);
    await 상세.수량칸.waitFor();
    await verify('재고가 1개인 상품이다', (await 상품조회(page.request, 상품번호.콜드브루)).stock, 1, { blocker: true });
    await verify('재고가 1개면 수량 1에서 「+」 버튼이 눌리지 않는다', await 상세.수량과늘리기상태(), '수량 1 · 「+」 눌리지 않음');
  });
});
