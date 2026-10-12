import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-236',
  name: '배너를 끌어다 놓으면 배너 관리 순서가 바뀐다',
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

    await test.step('배너 관리를 열어 배너가 셋 이상인지 확인한다', async () => {
      await 관리.열기();
      await 관리.배너관리탭.click();
      await 관리.배너줄들.first().waitFor();
      await verify('배너가 셋 이상 있다', (await 관리.배너줄들.count()) >= 3, true, { blocker: true });
    });

    await test.step('배너 관리에서 첫 배너를 셋째 자리로 끌어다 놓는다', async () => {
      const 전 = await 관리.배너제목들();
      await 관리.배너줄들.filter({ hasText: 전[0] ?? '' }).dragTo(관리.배너줄들.filter({ hasText: 전[2] ?? '' }));
      await verify('배너를 끌어다 놓으면 배너 관리 순서가 바뀐다', await 관리.배너제목들(), [전[1], 전[2], 전[0], ...전.slice(3)]);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
