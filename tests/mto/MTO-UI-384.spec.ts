import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창받기 } from './helpers/dialog.helper.js';
import { 열초안에결말 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-384',
  name: '초대 화면에서 「전부 비활성화」를 누르면 확인 창이 뜬다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);

  await test.step('Owner 계정으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 초대.열기();
    await verify('Owner(qa_admin) 계정으로 로그인해 있다', await 초대.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「초대」 화면에서 「전부 비활성화」를 누르고 확인 창에서 취소한다', async () => {
    const 창 = 확인창받기(page, '취소');
    await 초대.전부비활성화.click();
    const 글 = await 열초안에결말(창);
    await verify('초대 화면에서 「전부 비활성화」를 누르면 확인 창이 뜬다', 글 !== '', true);
  });
});
