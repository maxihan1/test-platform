import { defineCase, test, verify } from '@platform/kit';

import { 방해막기 } from './helpers/quiet.helper.js';
import { 세션사용자, 재고많은상품 } from './helpers/shop-tools.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-147',
  name: '큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다',
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

  const 많은 = await 재고많은상품(page.request);

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(많은.id);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세에서 큰 이미지를 누른다', async () => {
    await 상세.큰이미지버튼.click();
    await 상세.확대위치.waitFor();
    await verify('큰 이미지를 누르면 화면 전체를 덮는 확대 보기 모달이 뜬다', (await 상세.확대창.isVisible()) && (await 상세.확대가화면전체인가()), true);
  });
});
