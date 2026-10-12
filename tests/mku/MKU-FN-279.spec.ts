import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-279',
  name: '배너의 「노출」 스위치를 끄면 꺼져 보인다',
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

  await test.step('첫 배너의 「노출」 스위치가 켜져 있는지 확인한다', async () => {
    await verify('첫 배너의 「노출」 스위치가 켜져 있다', await 화면.배너노출스위치(화면.배너줄들.first()).isChecked(), true, { blocker: true });
  });

  await test.step('배너 관리에서 첫 배너의 「노출」 스위치를 끈다', async () => {
    const 스위치 = 화면.배너노출스위치(화면.배너줄들.first());
    await 스위치.click();
    await verify('배너의 「노출」 스위치를 끄면 꺼져 보인다', await 스위치.isChecked(), false);
  });
});
