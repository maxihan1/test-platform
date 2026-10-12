import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-357',
  name: '수량 칸에 0을 넣으면 수량이 1로 바뀐다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 상세 = new 상품상세화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세 수량 칸에 0을 넣고 칸을 벗어난다', async () => {
    await 상세.수량적기('0');
    await verify('수량 칸에 0을 넣으면 수량이 1로 바뀐다', await 상세.수량값(), '1');
  });

  await test.step('상품 상세 수량이 1인 채로 둔다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify('수량이 1이면 「수량 줄이기」 버튼이 비활성이다', await 상세.줄이기.isDisabled(), true);
  });

  await test.step('상품 상세 수량 칸에 10을 넣고 칸을 벗어난다', async () => {
    await 상세.수량적기('10');
    await verify('수량이 10이면 「수량 늘리기」 버튼이 비활성이다', await 상세.늘리기.isDisabled(), true);
  });

  await test.step('상품 상세 수량 칸에 11을 넣고 칸을 벗어난다', async () => {
    await 상세.수량적기('11');
    await verify('수량 칸에 11을 넣으면 수량이 10으로 바뀐다', await 상세.수량값(), '10');
  });
});
