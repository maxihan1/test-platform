import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-426',
  name: 'Moderator 가 qa_user2 상세를 열면 「이메일 바꾸기」 · 「암호 초기화」 · 「역할 변경」 · 「고인의 계정으로 전환」 · 「이메일 도메인 차단」이 보이지 않는다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  techniques: ['동등 분할'],
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

  try {

    await test.step('Owner 창으로 로그인하고 qa_user2 제재를 푼다', async () => {
      소유창 = await 새창으로로그인(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(소유창);
    });

    await test.step('Moderator 계정으로 로그인한다', async () => {
      await 로그인하기(page, params.modId, params.modPassword);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', (await 상세.상태.innerText()).trim(), '제한 없음', { blocker: true });
    });

    await test.step('Moderator 로 qa_user2 계정 상세를 연다', async () => {
      await 상세.열기(번호);
      const 이메일 = await verify('「이메일 바꾸기」가 보이지 않는다', await 상세.이메일바꾸기.isVisible(), false);
      const 암호 = await verify('「암호 초기화」가 보이지 않는다', await 상세.암호초기화.isVisible(), false);
      const 역할 = await verify('「역할 변경」이 보이지 않는다', await 상세.역할변경.isVisible(), false);
      const 고인 = await verify('「고인의 계정으로 전환」이 보이지 않는다', await 상세.고인전환.isVisible(), false);
      const 차단 = await verify('「이메일 도메인 차단」이 보이지 않는다', await 상세.이메일도메인차단.isVisible(), false);
      await verify('Moderator 가 qa_user2 상세를 열면 「이메일 바꾸기」 · 「암호 초기화」 · 「역할 변경」 · 「고인의 계정으로 전환」 · 「이메일 도메인 차단」이 보이지 않는다', 이메일 && 암호 && 역할 && 고인 && 차단, true);
    });

  } finally {
    if (소유창 !== undefined) {
      try {
        await qa_user2되돌리기(소유창);
      } finally {
        await 소유창.context().close();
      }
    }
  }
});
