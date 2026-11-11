import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-332',
  name: 'Owner 가 본 qa_user2 상세에 「이메일 바꾸기」 · 「암호 초기화」 · 「역할 변경」 · 「고인의 계정으로 전환」 · 「이메일 도메인 차단」이 보인다',
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
      const 이메일 = await verify('「이메일 바꾸기」가 보인다', await 상세.이메일바꾸기.isVisible(), true);
      const 암호 = await verify('「암호 초기화」가 보인다', await 상세.암호초기화.isVisible(), true);
      const 역할 = await verify('「역할 변경」이 보인다', await 상세.역할변경.isVisible(), true);
      const 고인 = await verify('「고인의 계정으로 전환」이 보인다', await 상세.고인전환.isVisible(), true);
      const 차단 = await verify('「이메일 도메인 차단」이 보인다', await 상세.이메일도메인차단.isVisible(), true);
      await verify('Owner 가 본 qa_user2 상세에 「이메일 바꾸기」 · 「암호 초기화」 · 「역할 변경」 · 「고인의 계정으로 전환」 · 「이메일 도메인 차단」이 보인다', 이메일 && 암호 && 역할 && 고인 && 차단, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
