import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 승인대기계정만들기 } from './helpers/account.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 대기계정상세열기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-081',
  name: '승인 대기 계정 상세에서 「거부」를 확정하면 「성공적으로 <아이디>의 가입 신청서를 반려하였습니다」가 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 승인 대기 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 계정: 일회용계정 | undefined;

  try {

    await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      계정 = await 승인대기계정만들기(page);
    });

    await test.step('승인 대기 계정 상세를 열어 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 대기계정상세열기(page, 아이디);
      await verify('케이스가 만든 승인 대기 계정이 있다', await 상세.거부.isVisible(), true, { blocker: true });
    });

    await test.step('승인 대기 계정 상세에서 「거부」를 누르고 확인 창에서 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      const 창 = 확인창받기(page, '확인');
      await 상세.거부.click();
      await 창;
      const 떴다 = await 상세.알림.글(`성공적으로 ${아이디}의 가입 신청서를 반려하였습니다`).waitFor({ timeout: 10_000 }).then(() => true, () => false);
      await verify('승인 대기 계정 상세에서 「거부」를 확정하면 「성공적으로 <아이디>의 가입 신청서를 반려하였습니다」가 보인다', 떴다, true);
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
