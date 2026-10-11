import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정값, API로그인, 내정보 } from './helpers/account.helper.js';
import { 방해막기 } from './helpers/quiet.helper.js';
import { 관리자화면 } from './pages/admin.page.js';

export const spec = defineCase({
  tcId: 'MKT-FN-269',
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
  const 관리자계정 = 계정값({ loginId: params.adminId, password: params.adminPassword });
  const 관리자 = new 관리자화면(page);

  await test.step('관리자 계정으로 로그인한다', async () => {
    await 방해막기(page);
    await API로그인(page.request, 관리자계정.loginId, 관리자계정.password);
  });

  await test.step('관리자 계정으로 로그인했는지 확인한다', async () => {
    await verify('관리자 계정 세션이 있다', (await 내정보(page.request)).loginId === 관리자계정.loginId, true, { blocker: true });
  });

  await test.step('배너 관리에서 첫 배너를 끌어 세 번째 자리에 놓는다', async () => {
    await 관리자.열기();
    await 관리자.배너관리탭.click();
    await 관리자.배너줄들.first().waitFor();
    const 전 = await 관리자.배너제목들();
    await 관리자.배너줄들.first().dragTo(관리자.배너줄들.nth(2));
    const 후 = await 관리자.배너제목들();
    await verify('배너를 끌어 다른 자리에 놓으면 배너 관리 순서가 바뀐다', 후.join('|') === [전[1], 전[2], 전[0]].join('|'), true);
  });
});
