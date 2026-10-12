import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 홈열고장바구니기다리기 } from './helpers/common-tools.helper.js';
import { 공지팝업켜졌나, 공지팝업정하기 } from './helpers/my-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-240',
  name: '「홈 공지 팝업」을 끄면 홈에 공지 팝업이 보이지 않는다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호가 테스트 계정 환경 변수에 없다',
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리 = new 관리자화면(page);
  const 홈 = new 홈화면(page);
  const 알림 = new 토스트(page);
  let 원래켜짐: boolean | undefined;

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page, { 공지팝업: false });
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
      원래켜짐 = await 공지팝업켜졌나(page.request);
      await 공지팝업정하기(page.request, true);
    });

    await test.step('홈 공지 팝업이 켜져 있는지 확인한다', async () => {
      await 관리.열기();
      await verify('「홈 공지 팝업」 스위치가 켜져 있다', await 관리.공지팝업스위치.isChecked(), true, { blocker: true });
    });

    await test.step('「홈 공지 팝업」 스위치를 끈 뒤 홈을 연다', async () => {
      await 관리.공지팝업스위치.uncheck();
      await 알림.글('저장되었습니다').first().waitFor();
      await 홈열고장바구니기다리기(page);
      await 홈.배너.waitFor();
      await verify('「홈 공지 팝업」을 끄면 홈에 공지 팝업이 보이지 않는다', await 홈.공지창.isVisible(), false);
    });
  } finally {
    if (원래켜짐 !== undefined) await 공지팝업정하기(page.request, 원래켜짐);
    await API로그아웃(page.request);
  }
});
