import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 조치취하기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-112',
  name: 'qa_user2 에 「제한」으로 「조치 취하기」를 누르면 계정 상세 상태가 제한으로 바뀌고 처벌 카드가 하나 늘어난다',
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

    await test.step('qa_user2 의 조치 화면에서 「제한」을 고르고 「조치 취하기」를 누른다', async () => {
      const 처벌전 = await 상세.처벌수();
      await 조치취하기(page, 번호, 'silence');
      await 상세.열기(번호);
      const 상태 = await verify('계정 상세 상태가 제한으로 바뀐다', (await 상세.상태.innerText()).trim(), '제한됨');
      const 카드 = await verify('처벌 카드가 늘어난다', (await 상세.처벌수()) > 처벌전, true);
      await verify('qa_user2 에 「제한」으로 「조치 취하기」를 누르면 계정 상세 상태가 제한으로 바뀌고 처벌 카드가 하나 늘어난다', 상태 && 카드, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
