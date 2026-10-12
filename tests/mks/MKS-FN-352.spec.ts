import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품목록화면 } from './pages/shop-list.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-352',
  name: '「최대 가격」을 100,000원으로 옮기면 100,000원보다 비싼 상품이 보이지 않는다',
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

  await test.step('쇼핑 목록에서 「최대 가격」 막대를 100,000원으로 옮긴다', async () => {
    const 전 = await 목록.총개수글();
    await 목록.슬라이더맞추기(100000);
    await 목록.총개수.filter({ hasText: 전 }).waitFor({ state: 'detached' });
    await 목록.빈카드들.first().waitFor({ state: 'detached' });
    await 목록.카드들.first().waitFor();
    const 비싼것들 = (await 목록.판매가들()).filter((가격) => 가격 > 100000);
    await verify('「최대 가격」을 100,000원으로 옮기면 100,000원보다 비싼 상품이 보이지 않는다', 비싼것들.length, 0);
  });
});
