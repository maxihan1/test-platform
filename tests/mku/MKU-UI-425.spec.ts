import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { API로그인 } from './helpers/account.helper.js';
import { 관리자값 } from './helpers/board-tools.helper.js';
import { 관리자인가 } from './helpers/member-order.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKU-UI-425',
  name: '회원 1,000명 넘는 표가 높이 600px 영역 안에서 스크롤된다',
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

  await test.step('관리자 화면의 회원 관리를 연다', async () => {
    await 화면.열기();
    await 화면.회원관리탭.click();
    await 화면.회원표.waitFor();
    const 크기 = await 화면.스크롤영역크기();
    await verify('회원 1,000명 넘는 표가 높이 600px 영역 안에서 스크롤된다', { 높이: 크기.높이, 스크롤됨: 크기.전체 > 크기.높이 }, { 높이: 600, 스크롤됨: true });
  });
});
