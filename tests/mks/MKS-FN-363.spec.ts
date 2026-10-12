import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 상품상세화면 } from './pages/shop-detail.page.js';

export const spec = defineCase({
  tcId: 'MKS-FN-363',
  name: '상품 문의 질문을 누르면 「결제 후 2~3일 안에 받으실 수 있습니다.」가 보인다',
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

  await test.step('「상품 문의」 탭을 연다', async () => {
    await 상세.문의탭.click();
  });

  await test.step('「상품 문의」 탭이 열렸는지 확인한다', async () => {
    await verify('「상품 문의」 탭 아래 내용이 보인다', await 상세.문의패널.isVisible(), true, { blocker: true });
  });

  await test.step('상품 상세 「상품 문의」 탭에서 「배송은 얼마나 걸리나요?」를 누른다', async () => {
    await 상세.질문('배송은 얼마나 걸리나요?').click();
    await verify('상품 문의 질문을 누르면 「결제 후 2~3일 안에 받으실 수 있습니다.」가 보인다', await 상세.답변('결제 후 2~3일 안에 받으실 수 있습니다.').isVisible(), true);
  });
});
