import { defineCase, test, verify } from '@platform/kit';
import { 세션회원있는가 } from './helpers/account.helper.js';
import { 방해창막기 } from './helpers/browser.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'MKT-UI-258',
  name: 'FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 고객센터 = new 고객센터화면(page);

  await test.step('비회원 상태를 확인한다', async () => {
    await 방해창막기(page);
    await verify('세션에 회원이 없다', await 세션회원있는가(page.request), false, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 고객센터.열기();
    await verify(
      'FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다',
      { 탭: (await 고객센터.탭이름들()).join(', '), 질문목록: (await 고객센터.질문들.count()) > 0 },
      { 탭: '회원, 주문/결제, 배송, 반품/교환', 질문목록: true },
    );
  });
});
