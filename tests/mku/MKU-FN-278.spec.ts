import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-278',
  name: '배너를 끌어 다른 자리에 놓으면 배너 관리 순서가 바뀐다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 관리자 = 관리자값(params);
  const 화면 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자.loginId, 관리자.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
  });

  await test.step('배너 관리 화면을 준비한다', async () => {
    await 화면.열기();
    await 화면.배너관리탭.click();
    await 화면.배너줄들.first().waitFor();
  });

  await test.step('배너 관리 목록이 열렸는지 확인한다', async () => {
    await verify('배너 관리에 배너가 둘 이상 있다', (await 화면.배너줄들.count()) >= 2, true, { blocker: true });
  });

  await test.step('배너 관리에서 첫 배너를 끌어 세 번째 자리에 놓는다', async () => {
    const 전 = await 화면.배너제목들();
    await 화면.배너줄들.first().dragTo(화면.배너줄들.nth(2));
    await 화면.배너줄들.first().filter({ hasText: 전[0] ?? '' }).waitFor({ state: 'detached' });
    const 후 = await 화면.배너제목들();
    await verify('배너를 끌어 다른 자리에 놓으면 배너 관리 순서가 바뀐다', 후.length === 전.length && 후.join('|') !== 전.join('|'), true);
  });
});
