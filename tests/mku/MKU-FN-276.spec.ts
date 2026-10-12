import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인, 회원가입, type 회원정보 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 가입자정리하기 } from './helpers/common-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-FN-276',
  name: '잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다',
  held: '보류 — 관리자 계정 비밀번호',
  precondition: ['관리자 계정으로 로그인해 있다'],
  techniques: ['상태 전이'],
  params: z.object({
    adminId: z.string().describe('관리자 아이디').optional().meta({ secret: true }),
    adminPassword: z.string().describe('관리자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, request, params }) => {
  const 관리자 = 관리자값(params);
  const 화면 = new 관리자화면(page);
  let 정상: 회원정보 | undefined;

  try {
    await test.step('잠기지 않은 임시 회원을 만들고 관리자 계정으로 로그인한다', async () => {
      await 방해막기(page);
      정상 = await 회원가입(request);
      await API로그인(page.request, 관리자.loginId, 관리자.password);
    });

    await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
      await verify('관리자 계정으로 로그인해 있다', await 관리자인가(page.request), true, { blocker: true });
    });

    await test.step('관리자 화면의 회원 관리에서 잠기지 않은 회원을 찾는다', async () => {
      await 화면.열기();
      await 화면.회원관리탭.click();
      await 화면.아이디검색.fill(정상?.loginId ?? '');
      await 화면.회원줄(정상?.loginId ?? '').waitFor();
      await verify('찾은 회원 줄이 잠기지 않았다', await 화면.회원줄(정상?.loginId ?? '').filter({ hasText: '잠김' }).count(), 0, { blocker: true });
    });

    await test.step('잠기지 않은 회원 줄을 본다', async () => {
      await verify('잠기지 않은 회원 줄에는 「잠금 해제」가 보이지 않는다', await 화면.회원줄(정상?.loginId ?? '').getByRole('button', { name: '잠금 해제' }).count(), 0);
    });
  } finally {
    if (정상 !== undefined) await 가입자정리하기(request, 정상);
  }
});
