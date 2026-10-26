import { defineCase, test, verify } from '@platform/kit';

import { 토스트 } from './components/toast.component.js';
import { 일회용회원으로로그인 } from './helpers/account.helper.js';
import { 로그인한아이디 } from './helpers/my-admin-tools.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 문의화면 } from './pages/support-inquiry.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-311',
  name: '문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['일회용 회원으로 로그인해 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ page }) => {
  const 화면 = new 문의화면(page);
  const 알림 = new 토스트(page);
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

  await test.step('유형 · 제목 · 내용을 채워 문의를 등록한다', async () => {
    const 제목 = '문의 등록 시험';
    await 화면.채우기({ 유형: '주문', 제목, 내용: '문의를 등록하면 답변 대기로 보이는지 보는 문의 내용입니다' });
    await 화면.등록누르고_응답기다리기();
    await 알림.글('문의가 등록되었습니다').first().waitFor();
    const 맨위제목 = await verify('내 문의 내역 맨 위에 방금 등록한 문의가 보인다', (await 화면.내역제목들.allInnerTexts())[0], 제목);
    const 상태 = await verify('그 문의의 상태는 「답변 대기」다', (await 화면.내역상태들.allInnerTexts())[0], '답변 대기');
    await verify('문의를 등록하면 「내 문의 내역」 맨 위에 「답변 대기」 상태로 보인다', 맨위제목 && 상태, true);
  });
});
