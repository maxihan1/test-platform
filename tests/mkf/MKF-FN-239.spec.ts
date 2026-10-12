import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 노출배너제목들, 배너되돌리기, 배너상태들 } from './helpers/my-tools.helper.js';
import type { 배너상태 } from './helpers/my-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-239',
  name: '모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보인다',
  techniques: ['결정 테이블'],
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
  let 원본: 배너상태[] | undefined;
  let 처음홈배너: string[] = [];

  try {
    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
      원본 = await 배너상태들(page.request);
      처음홈배너 = await 노출배너제목들(page.request);
    });

    await test.step('배너 관리에서 배너가 셋 노출 중인지 확인한다', async () => {
      await 관리.열기();
      await 관리.배너관리탭.click();
      await 관리.배너줄들.first().waitFor();
      await verify('배너 셋이 노출 중이다', [await 관리.배너줄들.count(), await 관리.켜진노출스위치들.count()], [3, 3], { blocker: true });
    });

    await test.step('배너 셋의 「노출」을 모두 끄고 「저장」을 누른다', async () => {
      for (const 줄 of await 관리.배너줄들.all()) await 관리.배너노출스위치(줄).uncheck();
      await 관리.배너저장.click();
      await 관리.노출오류.first().waitFor();
      await verify('모든 배너를 끄고 저장하면 「배너를 하나 이상 노출해야 합니다」가 보인다', await 관리.노출오류.first().isVisible(), true);
    });

    await test.step('배너 셋을 모두 끄고 저장한 뒤 홈을 연다', async () => {
      await 홈.열기();
      await 홈.슬라이드.first().waitFor();
      await verify('모든 배너를 끈 저장은 반영되지 않아 홈 배너가 그대로 보인다', await 홈.슬라이드제목들(), 처음홈배너);
    });
  } finally {
    if (원본 !== undefined) await 배너되돌리기(page.request, 원본);
    await API로그아웃(page.request);
  }
});
