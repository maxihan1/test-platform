import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-354',
  name: '「높은 가격순」을 고르면 상품이 가격이 높은 순으로 보인다',
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
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('쇼핑 목록 화면을 준비한다', async () => {
    await 목록.열기();
  });

  await test.step('쇼핑 목록 첫 화면이 떴는지 확인한다', async () => {
    await 목록.첫화면기다리기();
    await verify('쇼핑 목록 화면에 「쇼핑」 제목이 보인다', await 목록.제목.isVisible(), true, { blocker: true });
  });

  await test.step('쇼핑 목록 정렬에서 「높은 가격순」을 고른다', async () => {
    const 전 = await 목록.첫카드이름();
    await 목록.정렬.selectOption({ label: '높은 가격순' });
    await 목록.첫카드가바뀌기를기다리기(전);
    const 가격들 = await 목록.판매가들();
    await verify('「높은 가격순」을 고르면 상품이 가격이 높은 순으로 보인다', 가격들.length > 0 && 가격들.every((가격, 번) => 번 === 0 || (가격들[번 - 1] ?? 0) >= 가격), true);
  });
});
