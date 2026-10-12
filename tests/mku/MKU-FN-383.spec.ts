import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 상품상세조회 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-383',
  name: '수량 칸에 0을 넣으면 1로 고쳐진다',
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
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('수량 칸에 0을 넣는다', async () => {
    await 상세.수량적기('0');
    await verify('수량 칸에 0을 넣으면 1로 고쳐진다', await 상세.수량값(), '1');
  });

  await test.step('수량 칸에 1을 넣는다', async () => {
    await 상세.수량적기('1');
    await verify('수량 칸에 1을 넣으면 1이 그대로 남는다', await 상세.수량값(), '1');
  });

  await test.step('수량 칸에 99를 넣는다', async () => {
    const 상품 = await 상품상세조회(page.request, 1);
    await 상세.수량적기('99');
    await verify('수량 칸에 99를 넣으면 최대 수량으로 고쳐진다', await 상세.수량값(), String(상품.maxQty));
  });
});
