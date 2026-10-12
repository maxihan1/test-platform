import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-UI-346',
  name: '회원 관리 표는 높이 600px 영역 안에서 스크롤된다',
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

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
    });

    await test.step('관리자 회원 관리를 연다', async () => {
      await 관리.열기();
      await 관리.회원관리탭.click();
      await 관리.회원열머리들.first().waitFor();
      const 크기 = await 관리.스크롤영역크기();
      await verify('회원 관리 표는 높이 600px 영역 안에서 스크롤된다', [크기.높이, 크기.전체 > 크기.높이], [600, true]);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
