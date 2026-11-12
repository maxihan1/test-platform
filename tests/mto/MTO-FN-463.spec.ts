import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 계정번호, 고유이름 } from './helpers/api.helper.js';
import { 참고사항지우기 } from './helpers/account-data.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-463',
  name: 'Moderator 가 Owner 의 참고사항을 보면 그 글에 「삭제」가 보이지 않는다',
  precondition: ['Owner 가 qa_user2 에 남긴 참고사항이 있다', 'Moderator(qa_mod) 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    modId: z.string().describe('Moderator 아이디').optional().meta({ secret: true, account: '중재자' }),
    modPassword: z.string().describe('Moderator 비밀번호').optional().meta({ secret: true, account: '중재자' }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  let 소유창: Awaited<ReturnType<typeof 새창으로로그인>> | undefined;
  let 번호 = '';
  let 글 = '';

  try {
    await test.step('Owner 창으로 qa_user2 에 참고사항을 남긴다', async () => {
      소유창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
      번호 = await 계정번호(page, 'qa_user2');
      글 = `MTO 시험 참고사항 ${고유이름('n')}`;
      const 소유상세 = new 계정상세화면(소유창);
      await 소유상세.열기(번호);
      await 소유상세.참고사항적기(글);
    });

    await test.step('Moderator 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.modId, params.modPassword);
      await verify('Moderator(qa_mod) 계정으로 로그인해 있다', new 로그인화면(page).로그인화면인가(), false, { blocker: true });
    });

    await test.step('Moderator 로 qa_user2 계정 상세를 연다', async () => {
      await 상세.열기(번호);
      await verify('Owner 가 qa_user2 에 남긴 참고사항이 있다', await 상세.참고사항(글).isVisible(), true, { blocker: true });
      await verify('Moderator 가 Owner 의 참고사항을 보면 그 글에 「삭제」가 보이지 않는다', await 상세.참고사항삭제(글).isVisible(), false);
    });
  } finally {
    if (소유창 !== undefined) {
      try {
        if (번호 && 글) await 참고사항지우기(소유창, 번호, 글);
      } finally {
        await 소유창.context().close();
      }
    }
  }
});
