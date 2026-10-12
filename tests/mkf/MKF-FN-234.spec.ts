import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import { 관리자인가, 잠긴임시회원 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-234',
  name: '「잠금 해제」를 누르면 그 회원 상태가 잠금에서 풀린다',
  precondition: ['관리자 계정으로 로그인해 있다'],
  held: '보류 — 관리자 계정 비밀번호가 테스트 계정 환경 변수에 없다',
  params: z.object({
    adminId: z.string().min(1).describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().min(1).describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 관리 = new 관리자화면(page);
  let 잠긴회원: Awaited<ReturnType<typeof 잠긴임시회원>> | undefined;

  try {
    await test.step('잠긴 회원을 하나 만든다', async () => {
      잠긴회원 = await 잠긴임시회원(request);
    });

    await test.step('관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      const 계정 = 관리자값(params);
      await API로그인(page.request, 계정.loginId, 계정.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
    });

    await test.step('잠긴 회원 줄이 있는지 확인한다', async () => {
      await 관리.열기();
      await 관리.회원관리탭.click();
      await 관리.아이디검색.fill(잠긴회원?.loginId ?? '');
      await 관리.잠긴회원줄.first().waitFor();
      await verify('잠긴 회원 줄에 「잠금 해제」가 보인다', await 관리.잠긴회원줄.getByRole('button', { name: '잠금 해제' }).isVisible(), true, { blocker: true });
    });

    await test.step('잠긴 회원 줄의 「잠금 해제」를 누른다', async () => {
      const 줄 = 관리.회원줄(잠긴회원?.loginId ?? '');
      await 줄.getByRole('button', { name: '잠금 해제' }).click();
      await 줄.getByRole('button', { name: '잠금 해제' }).waitFor({ state: 'detached' });
      await verify('「잠금 해제」를 누르면 그 회원 상태가 잠금에서 풀린다', (await 줄.innerText()).includes('잠김'), false);
    });
  } finally {
    await API로그아웃(page.request);
    if (잠긴회원 !== undefined) await 가입자정리하기(request, 잠긴회원);
  }
});
