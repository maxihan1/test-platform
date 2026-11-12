import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 일회용계정, 계정지우기, 일회용계정만들기 } from './helpers/account.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-064',
  name: '이메일 미확인 계정을 검색하면 그 행이 흐리게 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '케이스가 만든 이메일 미확인 계정이 있다'],
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

    await test.step('일회용 계정을 가입시키고 Owner 계정으로 로그인한다', async () => {
      계정 = await 일회용계정만들기(page);
      await 로그인하기(page, params.loginId, params.loginPassword);
    });

    await test.step('가입시킨 이메일 미확인 계정이 목록에 있는지 확인한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 목록.아이디로찾기(아이디);
      await verify('케이스가 만든 이메일 미확인 계정이 있다', await 목록.행(아이디).isVisible(), true, { blocker: true });
    });

    await test.step('「계정」 화면에서 이메일 미확인 계정을 검색한다', async () => {
      const 아이디 = 계정?.아이디 ?? '';
      await 목록.아이디로찾기(아이디);
      await verify('이메일 미확인 계정을 검색하면 그 행이 흐리게 보인다', await 목록.행흐림(아이디).isVisible(), true);
    });

  } finally {
    if (계정 !== undefined) await 계정지우기(page, 계정.아이디);
  }
});
