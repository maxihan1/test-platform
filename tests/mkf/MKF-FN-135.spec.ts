import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 상품목록 } from './helpers/shop.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-135',
  name: '가격 슬라이더를 0원으로 맞추면 값이 「~ 0원」으로 보인다',
  techniques: ['경계값 분석'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 목록 = new 상품목록화면(page);

  await test.step('방해 요소를 막는다', async () => {
    await 방해막기(page);
  });

  await test.step('로그인하지 않은 상태인지 확인한다', async () => {
    await verify('로그인한 회원이 없다', (await 세션사용자(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('상품 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('상품 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('가격 슬라이더를 0원으로 맞춘다', async () => {
    await 목록.슬라이더맞추기(0);
    await verify('가격 슬라이더를 0원으로 맞추면 값이 「~ 0원」으로 보인다', await 목록.가격표시.innerText(), '~ 0원');
  });

  await test.step('가격 슬라이더를 500,000원으로 맞춘다', async () => {
    const 전체 = await 상품목록(page.request);
    await 목록.슬라이더맞추기(500000);
    await 목록.총개수.filter({ hasText: '총 ' + String(전체.total) + '개' }).waitFor();
    await 목록.모두내리기();
    await verify('가격 슬라이더를 500,000원으로 맞추면 전체 상품이 보인다', (await 목록.카드이름들()).sort(), 전체.items.map((상품줄) => 상품줄.name).sort());
  });

  await test.step('가격 슬라이더를 500,001원으로 맞추려 한다', async () => {
    await 목록.슬라이더넣기(500001);
    await verify('가격 슬라이더는 500,000원보다 크게 맞춰지지 않는다', await 목록.가격슬라이더.inputValue(), '500000');
  });
});
