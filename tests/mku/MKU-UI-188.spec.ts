import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자, 회색인가 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-188',
  name: '품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다',
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

  await test.step('상품 목록을 연다', async () => {
    await 목록.열기();
    await 목록.첫화면기다리기();
    await 목록.모두내리기();
    const 덮개들 = await 목록.품절카드덮개들();
    await verify('품절 상품 카드에 회색 덮개와 「품절」 표시가 보인다', 덮개들.length > 0 && 덮개들.every((덮개) => 덮개.글 === '품절' && 회색인가(덮개.색)), true);
  });
});
