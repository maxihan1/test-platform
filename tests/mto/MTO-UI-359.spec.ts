import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 확인창받기 } from './helpers/dialog.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-359',
  name: '계정 상세에서 「경고」를 누르면 조치 화면이 열리고 「경고 보내기」가 선택돼 있다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);
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

    await test.step('qa_user2 계정 상세에서 「경고」를 누른다', async () => {
      await 상세.경고.click();
      await 조치.그려질때까지();
      await verify('계정 상세에서 「경고」를 누르면 조치 화면이 열리고 「경고 보내기」가 선택돼 있다', await 조치.경고보내기.isChecked(), true);
      await 상세.열기(번호);
    });

    await test.step('qa_user2 계정 상세에서 「동결」을 누른다', async () => {
      await 상세.동결.click();
      await 조치.그려질때까지();
      await verify('계정 상세에서 「동결」을 누르면 조치 화면이 열리고 「동결」이 선택돼 있다', await 조치.동결.isChecked(), true);
      await 상세.열기(번호);
    });

    await test.step('qa_user2 계정 상세에서 「암호 초기화」를 누르고 확인 창에서 취소한다', async () => {
      const 창 = 확인창받기(page, '취소');
      await 상세.암호초기화.click();
      await verify('계정 상세에서 「암호 초기화」를 누르면 확인 창이 뜬다', await 창, '확실합니까?');
    });

    await test.step('qa_user2 계정 상세에서 「고인의 계정으로 전환」을 누르고 확인 창에서 취소한다', async () => {
      const 창 = 확인창받기(page, '취소');
      await 상세.고인전환.click();
      await verify('계정 상세에서 「고인의 계정으로 전환」을 누르면 확인 창이 뜬다', await 창, '확실합니까?');
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
