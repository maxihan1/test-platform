import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그아웃, API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 아이디순서 } from './helpers/my-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKF-FN-233',
  name: '「아이디」 칸 제목을 누르면 아이디 오름차순으로 바뀌고 제목 옆에 ▲가 보인다',
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

    await test.step('회원 관리 「아이디」 칸 제목을 누른다', async () => {
      await 관리.열기();
      await 관리.회원관리탭.click();
      await 관리.열머리('아이디').click();
      await 관리.열머리('아이디').getByText('▲').waitFor();
      await verify('「아이디」 칸 제목을 누르면 아이디 오름차순으로 바뀌고 제목 옆에 ▲가 보인다', [await 관리.열머리('아이디').getByText('▲').isVisible(), 아이디순서(await 관리.회원아이디들(), 1)], [true, true]);
    });

    await test.step('회원 관리 「아이디」 칸 제목을 한 번 더 누른다', async () => {
      await 관리.열머리('아이디').click();
      await 관리.열머리('아이디').getByText('▼').waitFor();
      await verify('「아이디」 칸 제목을 다시 누르면 내림차순으로 바뀌고 제목 옆에 ▼가 보인다', [await 관리.열머리('아이디').getByText('▼').isVisible(), 아이디순서(await 관리.회원아이디들(), -1)], [true, true]);
    });
  } finally {
    await API로그아웃(page.request);
  }
});
