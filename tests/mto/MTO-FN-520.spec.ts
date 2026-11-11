import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 조치취하기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 감사로그화면 } from './pages/action-logs.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-520',
  name: '커스텀 경고 문구 없이 경고하면 감사 로그 맨 위 줄이 그 경고가 아니다',
  precondition: ['Owner(qa_admin) 계정으로 로그인해 있다', '조치 대상 qa_user2 가 제재 없는 상태다'],
  params: z.object({
    loginId: z.string().describe('Owner 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('Owner 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({}),
});

test(spec, async ({ page, params }) => {
  const 상세 = new 계정상세화면(page);
  const 감사 = new 감사로그화면(page);
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

    await test.step('「커스텀 경고」를 비운 채 qa_user2 에 경고를 보내고 「감사 로그」를 연다', async () => {
      await 감사.열기();
      const 이전 = await 감사.맨위줄().innerHTML();
      await 조치취하기(page, 번호, 'none');
      await 감사.열기();
      await verify('커스텀 경고 문구 없이 경고하면 감사 로그 맨 위 줄이 그 경고가 아니다', (await 감사.맨위줄().innerHTML()) === 이전, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
