import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-441',
  name: 'qa_user2 를 동결하면 상세 상태에 「동결됨」이 보이고 「동결 해제」 버튼이 보인다',
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
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', await 상세.동결.isVisible(), true, { blocker: true });
    });

    await test.step('qa_user2 에 「동결」 조치를 취한 뒤 상세를 연다', async () => {
      await 조치.열기(번호, 'disable');
      await 조치.조치하기('동결', false);
      await 상세.열기(번호);
      const 상태 = await verify('상세 상태에 「동결됨」이 보인다', (await 상세.상태.innerText()).trim(), '동결됨');
      const 해제 = await verify('「동결 해제」 버튼이 보인다', await 상세.동결해제.isVisible(), true);
      await verify('qa_user2 를 동결하면 상세 상태에 「동결됨」이 보이고 「동결 해제」 버튼이 보인다', 상태 && 해제, true);
    });
  } finally {
    await qa_user2되돌리기(page);
  }
});
