import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정목록화면 } from './pages/account-list.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-018',
  name: '계정 목록에서 qa_user2 를 골라 「정지」를 누르면 확인 창에 「확실합니까?」가 뜨고 취소하면 qa_user2 가 정지되지 않는다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 목록 = new 계정목록화면(page);
  const 상세 = new 계정상세화면(page);
  let 번호 = '';

  try {

    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('계정 목록에서 qa_user2 를 골라 「정지」를 누르고 확인 창에서 취소한다', async () => {
      await 목록.아이디로찾기('qa_user2');
      await 목록.행선택칸('qa_user2').check();
      const 창 = 확인창받기(page, '취소');
      await 목록.정지.click();
      const 글 = await 창;
      const 확인창 = await verify('확인 창에 「확실합니까?」가 뜬다', 글, '확실합니까?');
      await 상세.열기(번호);
      const 그대로 = await verify('qa_user2 가 정지되지 않는다', (await 상세.상태.innerText()).trim(), '제한 없음');
      await verify('계정 목록에서 qa_user2 를 골라 「정지」를 누르면 확인 창에 「확실합니까?」가 뜨고 취소하면 qa_user2 가 정지되지 않는다', 확인창 && 그대로, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
