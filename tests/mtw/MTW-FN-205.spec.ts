import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 새창열기 } from './helpers/page-setup.helper.js';
import { 가입화면 } from './pages/sign-up.page.js';
import { 초대화면 } from './pages/invites.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-205',
  name: '일반 회원이 만든 초대 링크를 비회원이 열면 가입 화면이 열린다',
  precondition: ['일반 회원이 만든 초대 링크가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 초대 = new 초대화면(page);
  let 초대주소: string | undefined;

  await test.step('일반 회원으로 로그인해 초대 링크를 만든다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 초대.열기();
    await verify('초대 화면에 「초대 링크 생성하기」 버튼이 보인다', await 초대.만들기.isVisible(), true, { blocker: true });
    초대주소 = await 초대.만들고새주소();
  });

  try {
    await test.step('비회원 창에서 초대 링크를 연다', async () => {
      const 비회원창 = await 새창열기(page);
      try {
        const 가입 = new 가입화면(비회원창.page);
        await 가입.초대링크로열기(new URL(초대주소 ?? '').pathname);
        await verify('일반 회원이 만든 초대 링크를 비회원이 열면 가입 화면이 열린다', await 가입.제목.isVisible(), true);
      } finally {
        await 비회원창.창묶음.close();
      }
    });
  } finally {
    if (초대주소 !== undefined) {
      await 초대.열기();
      await 초대.비활성화(초대주소);
    }
  }
});
