import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-190',
  name: '15초 안에 「{N}명이 보고 있어요」의 N 이 3~30 사이 다른 값으로 바뀐다',
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

  await test.step('상품 상세에서 「{N}명이 보고 있어요」를 보고 15초를 기다린다', async () => {
    const 처음 = await 상세.보고있는수();
    await 상세.보고있어요.filter({ hasNotText: new RegExp(`^${String(처음)}명이`) }).waitFor({ timeout: 20000 });
    const 나중 = await 상세.보고있는수();
    await verify('15초 안에 「{N}명이 보고 있어요」의 N 이 3~30 사이 다른 값으로 바뀐다', 나중 !== 처음 && 나중 >= 3 && 나중 <= 30, true);
  });
});
