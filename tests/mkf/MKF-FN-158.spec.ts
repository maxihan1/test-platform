import { defineCase, test, verify } from '@platform/kit';

import { 리뷰있는상품 } from './helpers/shop-extra.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 요청세기 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-158',
  name: '상품 상세를 열기만 하면 리뷰 목록 요청이 나가지 않는다',
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

  const 상품 = await 리뷰있는상품(page.request);

  const 리뷰요청 = 요청세기(page, new RegExp('/api/products/' + String(상품.id) + '/reviews'));

  await test.step('상품 상세를 열고 리뷰 요청이 나갔는지 본다', async () => {
    await 상세.열기(상품.id);
    await 상세.화면기다리기();
    await page.evaluate(() => new Promise<void>((끝) => requestAnimationFrame(() => requestAnimationFrame(() => 끝()))));
    await verify('상품 상세를 열기만 하면 리뷰 목록 요청이 나가지 않는다', 리뷰요청.수(), 0);
  });

  await test.step('「리뷰」 탭을 처음 누른다', async () => {
    await 상세.리뷰탭.click();
    await 상세.리뷰불러오기기다리기();
    await verify('「리뷰」 탭을 처음 누르면 리뷰 목록 요청이 나가고 리뷰가 보인다', 리뷰요청.수() >= 1 && (await 상세.리뷰글들.count()) > 0, true);
  });
});
