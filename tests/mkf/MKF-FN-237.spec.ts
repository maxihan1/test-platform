import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-237',
  name: '「노출」 스위치를 끄면 그 배너의 스위치가 꺼진다',
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

    await test.step('배너 관리에서 둘째 배너의 「노출」 스위치를 켠다', async () => {
      await 관리.열기();
      await 관리.배너관리탭.click();
      await 관리.배너줄들.first().waitFor();
      const 제목 = (await 관리.배너제목들())[1] ?? '';
      await 관리.배너노출스위치(관리.배너줄들.filter({ hasText: 제목 })).check();
    });

    await test.step('둘째 배너의 「노출」 스위치가 켜졌는지 확인한다', async () => {
      const 제목 = (await 관리.배너제목들())[1] ?? '';
      await verify('둘째 배너의 「노출」 스위치가 켜져 있다', await 관리.배너노출스위치(관리.배너줄들.filter({ hasText: 제목 })).isChecked(), true, { blocker: true });
    });

    await test.step('배너 관리에서 둘째 배너의 「노출」 스위치를 끈다', async () => {
      const 제목 = (await 관리.배너제목들())[1] ?? '';
      const 스위치 = 관리.배너노출스위치(관리.배너줄들.filter({ hasText: 제목 }));
      await 스위치.uncheck();
      await verify('「노출」 스위치를 끄면 그 배너의 스위치가 꺼진다', await 스위치.isChecked(), false);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
