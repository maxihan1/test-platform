import { defineCase, test, verify } from '@platform/kit';

import { 세션사용자 } from './helpers/shop-tools.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-169',
  name: '두 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다',
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

  await test.step('두 번째 썸네일에 마우스를 올린다', async () => {
    await 상세.썸네일(2).hover();
    await verify('두 번째 썸네일에 마우스를 올리면 큰 이미지가 그 이미지로 바뀐다', (await 상세.큰이미지주소()) === (await 상세.썸네일이미지주소(2)), true);
  });

  await test.step('세 번째 썸네일을 누른다', async () => {
    await 상세.썸네일(3).click();
    await verify('세 번째 썸네일을 누르면 큰 이미지가 그 이미지로 바뀐다', (await 상세.큰이미지주소()) === (await 상세.썸네일이미지주소(3)), true);
  });
});
