import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 계정처벌화면 } from './pages/account-strike.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-109',
  name: '경고 틀과 커스텀 경고를 함께 보내면 qa_user2 의 처벌 카드에 프리셋 본문과 커스텀 글이 함께 보인다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
    커스텀경고글: z.string().min(1).describe('커스텀 경고에 적을 글').default('MTO 시험 커스텀 경고'),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 조치 = new 조치화면(page);
  const 처벌 = new 계정처벌화면(page);
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

    await test.step('경고 틀을 고르고 「커스텀 경고」에 글을 적어 「경고 보내기」로 「조치 취하기」를 누른다', async () => {
      await 조치.열기(번호);
      const 본문 = await 조치.경고틀본문앞부분();
      await 조치.경고틀로경고하기(1, params.커스텀경고글);
      await 상세.카운터.waitFor();
      await 상세.처벌카드들.first().click();
      await 처벌.그려질때까지();
      const 프리셋 = await verify('처벌 카드에 프리셋 본문이 보인다', await 처벌.문단(본문).first().isVisible(), true);
      const 커스텀 = await verify('처벌 카드에 커스텀 글이 보인다', await 처벌.문단(params.커스텀경고글).first().isVisible(), true);
      await verify('경고 틀과 커스텀 경고를 함께 보내면 qa_user2 의 처벌 카드에 프리셋 본문과 커스텀 글이 함께 보인다', 프리셋 && 커스텀, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
