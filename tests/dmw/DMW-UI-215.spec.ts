import { defineCase, test, verify } from '@platform/kit';

import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-215',
  name: 'FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);

  await test.step('비회원으로 고객센터 화면을 연다', async () => {
    await 안내창막기(page);
    await 화면.열기();
    await verify('고객센터 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('고객센터 FAQ 를 연다', async () => {
    const 탭들 = await verify('분류 탭은 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」이다', (await 화면.분류탭들.allInnerTexts()).join(', '), '회원, 주문/결제, 배송, 반품/교환');
    const 질문 = await verify('질문 목록이 보인다', (await 화면.질문글들()).length > 0, true);
    await verify('FAQ 에 분류 탭 「회원」 · 「주문/결제」 · 「배송」 · 「반품/교환」과 질문 목록이 보인다', 탭들 && 질문, true);
  });
});
