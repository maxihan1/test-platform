import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-235',
  name: '잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다',
  techniques: ['상태 전이'],
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

    await test.step('잠기지 않은 회원 줄을 찾는다', async () => {
      await 관리.열기();
      await 관리.회원관리탭.click();
      await 관리.정상회원줄.first().waitFor();
      await verify('잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다', await 관리.정상회원줄.getByRole('button', { name: '잠금 해제' }).count(), 0);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
