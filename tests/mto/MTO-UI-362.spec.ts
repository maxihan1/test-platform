import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-362',
  name: '계정 상세에 「경고」 · 「동결」 · 「민감함 강제」 · 「제한」 · 「정지」 · 「고인의 계정으로 전환」 버튼이 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
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

    await test.step('qa_user2 계정 상세를 연다', async () => {
      await 상세.열기(번호);
      const 경고 = await verify('「경고」 버튼이 보인다', await 상세.경고.isVisible(), true);
      const 동결 = await verify('「동결」 버튼이 보인다', await 상세.동결.isVisible(), true);
      const 민감함 = await verify('「민감함 강제」 버튼이 보인다', await 상세.민감함강제.isVisible(), true);
      const 제한 = await verify('「제한」 버튼이 보인다', await 상세.제한.isVisible(), true);
      const 정지 = await verify('「정지」 버튼이 보인다', await 상세.정지.isVisible(), true);
      const 고인 = await verify('「고인의 계정으로 전환」 버튼이 보인다', await 상세.고인전환.isVisible(), true);
      await verify('계정 상세에 「경고」 · 「동결」 · 「민감함 강제」 · 「제한」 · 「정지」 · 「고인의 계정으로 전환」 버튼이 보인다', 경고 && 동결 && 민감함 && 제한 && 정지 && 고인, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
