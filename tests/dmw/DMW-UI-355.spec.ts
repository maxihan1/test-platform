import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';
import { 고객센터화면 } from './pages/support.page.js';

export const spec = defineCase({
  tcId: 'DMW-UI-355',
  name: '고객센터 버튼 반응',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다', '비회원이다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 고객센터화면(page);
  const 문의 = new 문의화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('고객센터 화면을 연다', async () => {
    await 화면.열기();
    await verify('고객센터 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('고객센터의 「1:1 문의」를 누른다', async () => {
    await 화면.문의링크.click();
    await 문의.그려질때까지();
    await verify('고객센터에서 「1:1 문의」를 누르면 1:1 문의 화면이 보인다', await 문의.큰제목.isVisible(), true);
  });

  await test.step('로그아웃해 비회원이 된 뒤 고객센터 화면을 연다', async () => {
    await page.request.post('/api/auth/logout');
    await 화면.열기();
    await verify('비회원이다', await 로그인한아이디(page.request), null, { blocker: true });
  });

  await test.step('FAQ 분류 탭 「배송」을 누른다', async () => {
    const 응답 = await page.request.get('/api/faq');
    const 배송질문 = ((await 응답.json()) as { items: { category: string; question: string }[] }).items.filter((항목) => 항목.category === '배송').map((항목) => 항목.question);
    await 화면.분류누르기('배송');
    await verify('고객센터에서 분류 탭 「배송」을 누르면 배송 질문 목록이 보인다', (await 화면.질문글들()).join(', '), 배송질문.join(', '));
  });
});
