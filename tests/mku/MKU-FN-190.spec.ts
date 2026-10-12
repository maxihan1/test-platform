import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 요청세기 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-190',
  name: '리뷰 탭을 처음 누르면 그때 리뷰를 불러와 보여 준다',
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

  const 리뷰요청 = 요청세기(page, /\/api\/products\/1\/reviews/);

  await test.step('상품 상세를 열기만 한다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await verify('상품 상세를 열기만 해서는 리뷰를 불러오지 않는다', 리뷰요청.수(), 0);
  });

  await test.step('리뷰 탭을 처음 누른다', async () => {
    await 상세.열기(1);
    await 상세.화면기다리기();
    await 상세.리뷰탭.click();
    await 상세.리뷰불러오기기다리기();
    await verify('리뷰 탭을 처음 누르면 그때 리뷰를 불러와 보여 준다', 리뷰요청.수() >= 1 && (await 상세.리뷰글들.count()) > 0, true);
  });
});
