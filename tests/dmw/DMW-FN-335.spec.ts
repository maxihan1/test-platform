import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 로그인한역할 } from './helpers/my-admin-tools.helper.js';
import { 공지팝업읽기, 공지팝업정하기 } from './helpers/my-admin-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-335',
  name: '「홈 공지 팝업」 스위치를 바꾸면 토스트 「저장되었습니다」가 보인다',
  platforms: ['desktop', 'mobile'],
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true, account: '관리자' }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true, account: '관리자' }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 관리자화면(page);
  const 알림 = new 토스트(page);
  let 원래값 = true;

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 안내창막기(page);
    await 계정으로로그인(page, params.adminId, params.adminPassword);
    원래값 = await 공지팝업읽기(page.request);
  });

  await test.step('로그인 상태를 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 로그인한역할(page.request), 'admin', { blocker: true });
  });

  try {
    await test.step('관리자 화면의 설정 · 내보내기 탭을 연다', async () => {
      await 화면.열기();
      await 화면.설정탭.click();
      await 화면.공지팝업스위치.waitFor();
      await verify('「홈 공지 팝업」 스위치가 보인다', await 화면.공지팝업스위치.isVisible(), true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 바꾼다', async () => {
      await 화면.공지팝업스위치.click();
      await 알림.글('저장되었습니다').first().waitFor();
      await verify('「홈 공지 팝업」 스위치를 바꾸면 토스트 「저장되었습니다」가 보인다', await 알림.글('저장되었습니다').first().isVisible(), true);
    });

    await test.step('스위치를 바꾼 뒤 공지 팝업 설정을 확인한다', async () => {
      await verify('「홈 공지 팝업」 스위치를 바꾸면 공지 팝업 설정이 바로 그 값으로 바뀐다', await 공지팝업읽기(page.request), !원래값);
    });
  } finally {
    await 공지팝업정하기(page.request, 원래값);
  }
});
