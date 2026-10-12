import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-361',
  name: '「다음 이미지」를 누르면 위치 표시의 앞 숫자가 하나 늘어난다',
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
    await verify('로그인한 회원이 없다', (await 로그인한아이디(page.request)) === null, true, { blocker: true });
  });

  await test.step('상품 상세 화면을 준비한다', async () => {
    await 상세.열기(1);
  });

  await test.step('상품 상세 화면이 떴는지 확인한다', async () => {
    await 상세.화면기다리기();
    await verify('상품 상세 화면에 상품 이름 제목이 보인다', await 상세.제목.isVisible(), true, { blocker: true });
  });

  await test.step('이미지 확대 보기를 연다', async () => {
    await 상세.큰이미지버튼.click();
  });

  await test.step('이미지 확대 보기가 열렸는지 확인한다', async () => {
    await 상세.확대위치.waitFor();
    await verify('이미지 확대 보기 팝업이 보인다', await 상세.확대창.isVisible(), true, { blocker: true });
  });

  await test.step('「이미지 확대 보기」 팝업에서 「다음 이미지」를 누른다', async () => {
    const 전 = await 상세.확대위치번호();
    await 상세.확대다음.click();
    await verify('「다음 이미지」를 누르면 위치 표시의 앞 숫자가 하나 늘어난다', (await 상세.확대위치번호()) - 전, 1);
  });
});
