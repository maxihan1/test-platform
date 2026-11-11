import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기, 새창으로로그인 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-411',
  name: 'Moderator 가 역할 없는 qa_user2 에게 경고를 보내면 계정 상세로 돌아가고 처벌 카드가 늘어난다',
  precondition: ['Moderator(qa_mod) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
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
  const 조치 = new 조치화면(page);
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

    await test.step('Moderator 로 qa_user2 상세에서 「경고」를 눌러 「조치 취하기」를 누른다', async () => {
      const 처벌전 = await 상세.처벌수();
      await 상세.경고.click();
      await 조치.그려질때까지();
      await 조치.조치하기('경고 보내기', false);
      await 상세.카운터.waitFor();
      const 돌아감 = await verify('계정 상세로 돌아간다', (await 상세.제목.innerText()).trim(), 'qa_user2');
      const 늘어남 = await verify('처벌 카드가 늘어난다', (await 상세.처벌수()) > 처벌전, true);
      await verify('Moderator 가 역할 없는 qa_user2 에게 경고를 보내면 계정 상세로 돌아가고 처벌 카드가 늘어난다', 돌아감 && 늘어남, true);
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
