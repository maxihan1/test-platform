import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 조치취하기 } from './helpers/account-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 감사로그화면 } from './pages/action-logs.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-443',
  name: '커스텀 경고 문구를 넣어 경고하면 감사 로그 맨 위에 qa_user2 경고 줄이 보인다',
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

    await test.step('「커스텀 경고」에 글을 적어 qa_user2 에 경고를 보내고 「감사 로그」를 연다', async () => {
      await 조치취하기(page, 번호, 'none', params.커스텀경고글);
      await 감사.열기();
      const 대상 = await verify('감사 로그 맨 위 줄이 qa_user2 에 관한 줄이다', await 감사.맨위줄().filter({ hasText: 'qa_user2' }).isVisible(), true);
      const 경고 = await verify('감사 로그 맨 위 줄이 경고 줄이다', await 감사.맨위줄().filter({ hasText: '경고를 보냈습니다' }).isVisible(), true);
      await verify('커스텀 경고 문구를 넣어 경고하면 감사 로그 맨 위에 qa_user2 경고 줄이 보인다', 대상 && 경고, true);
    });

  } finally {
    await qa_user2되돌리기(page);
  }
});
