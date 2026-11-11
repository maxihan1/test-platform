import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-UI-087',
  name: '로컬 계정 조치 화면에 「이메일로 사용자에게 알리기」가 켜진 채 보인다',
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

    await test.step('qa_user2 의 조치 취하기 화면을 연다', async () => {
      await 조치.열기(번호);
      const 보임 = await verify('「이메일로 사용자에게 알리기」가 보인다', await 조치.이메일알림.isVisible(), true);
      const 켜짐 = await verify('「이메일로 사용자에게 알리기」가 켜져 있다', await 조치.이메일알림.isChecked(), true);
      await verify('로컬 계정 조치 화면에 「이메일로 사용자에게 알리기」가 켜진 채 보인다', 보임 && 켜짐, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
