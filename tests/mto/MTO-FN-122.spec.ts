import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 승인대기계정만들기 } from './helpers/account.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기, 새창 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';
import { 가입화면 } from './pages/sign-up.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-122',
  name: '거부한 계정의 아이디와 이메일로 다시 가입하면 가입이 받아들여진다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 승인 대기 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);
  let 계정: 일회용계정 | undefined;

  try {

    await test.step('Owner 계정으로 로그인하고 승인 대기 계정을 만든다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      계정 = await 승인대기계정만들기(page);
    });

    await test.step('승인 대기 계정이 「대기 중」 목록에 있는지 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 목록.대기목록열기();
      await verify('케이스가 만든 승인 대기 계정이 있다', await 목록.행(아이디).isVisible(), true, { blocker: true });
    });

    await test.step('그 계정을 거부한 뒤 같은 아이디와 이메일로 다시 가입한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      const 이메일 = 계정?.이메일 ?? '';
      const 암호 = 계정?.암호 ?? '';
      await 목록.행선택칸(아이디).check();
      const 창 = 확인창받기(page, '확인');
      await 목록.일괄처리하기(목록.거부);
      await 창;
      const 가입창 = await 새창(page);
      try {
        const 가입 = new 가입화면(가입창);
        await 가입.열기();
        const 연시각 = Date.now();
        await 가입.가입정보적기(아이디, 이메일, 암호, '다시 가입하는 이유');
        await 가입.등록하기누르기(연시각);
        await verify('거부한 계정의 아이디와 이메일로 다시 가입하면 가입이 받아들여진다', 가입.가입됐는가(), true);
      } finally {
        await 가입창.context().close();
      }
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
