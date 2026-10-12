import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-159',
  name: '가격 슬라이더를 맨 오른쪽으로 옮기면 「~ 500,000원」이 보인다',
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

  await test.step('가격 슬라이더를 맨 왼쪽으로 옮겨 둔다', async () => {
    await 목록.슬라이더맞추기(0);
    await verify('가격 슬라이더가 맨 왼쪽에 있다', await 목록.가격표시.innerText(), '~ 0원', { blocker: true });
  });

  await test.step('가격 슬라이더를 맨 오른쪽으로 옮긴다', async () => {
    await 목록.슬라이더맞추기(500000);
    await verify('가격 슬라이더를 맨 오른쪽으로 옮기면 「~ 500,000원」이 보인다', await 목록.가격표시.innerText(), '~ 500,000원');
  });

  await test.step('가격 슬라이더에 500,001원을 넣는다', async () => {
    await 목록.슬라이더넣기(500001);
    await verify('가격 슬라이더에 500,001원을 넣어도 「~ 500,000원」을 넘지 않는다', await 목록.가격표시.innerText(), '~ 500,000원');
  });
});
