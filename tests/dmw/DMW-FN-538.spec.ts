import { defineCase, test, verify } from '@platform/kit';

import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 보낸요청끝날때까지 } from './helpers/common-tools.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-538',
  name: '문의 「등록」을 빠르게 두 번 누르면 문의가 하나만 생긴다',
  platforms: ['desktop', 'mobile'],
  techniques: ['오류 추정'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 문의화면(page);
  let 회원아이디 = '';

  await test.step('일회용 회원으로 로그인한다', async () => {
    await 안내창막기(page);
    회원아이디 = (await 일회용회원으로로그인(page)).loginId;
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('일회용 회원으로 로그인해 있다', await 로그인한아이디(page.request), 회원아이디, { blocker: true });
  });

  await test.step('1:1 문의 화면을 연다', async () => {
    await 화면.열기();
    await verify('1:1 문의 화면이 보인다', await 화면.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('문의 「등록」을 빠르게 두 번 누른다', async () => {
    const 제목 = '두 번 누르기 시험';
    await 화면.채우기({ 유형: '기타', 제목, 내용: '등록을 빠르게 두 번 누르는 문의 내용입니다' });
    await 보낸요청끝날때까지(page, async () => {
      await 화면.등록버튼.dblclick();
    });
    const 서버 = (await (await page.request.get('/api/inquiries')).json()) as { items: { title: string }[] };
    const 서버수 = await verify('서버에 같은 제목의 문의가 하나만 있다', 서버.items.filter((항목) => 항목.title === 제목).length, 1);
    const 화면수 = await verify('내 문의 내역에 같은 제목의 문의가 한 줄만 보인다', await 화면.내역제목들.filter({ hasText: 제목 }).count(), 1);
    await verify('문의 「등록」을 빠르게 두 번 누르면 문의가 하나만 생긴다', 서버수 && 화면수, true);
  });
});
