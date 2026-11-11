import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { qa_user2되돌리기 } from './helpers/account.helper.js';
import { 계정번호 } from './helpers/api.helper.js';
import { 시험도메인, 이메일도메인차단만들기 } from './helpers/report-data.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 조치화면 } from './pages/account-action.page.js';
import { 계정상세화면 } from './pages/account-detail.page.js';
import { 감사로그화면 } from './pages/action-logs.page.js';
import { 이메일도메인차단목록화면 } from './pages/email-domain-blocks.page.js';
import { 로그인화면 } from './pages/sign-in.page.js';

export const spec = defineCase({
  tcId: 'MTO-FN-442',
  name: 'qa_user2 를 정지하고 「감사 로그」를 열면 「님이 qa_user2의 계정을 정지시켰습니다」 줄이 보인다',
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
  const 로그 = new 감사로그화면(page);
  const 목록 = new 이메일도메인차단목록화면(page);
  const 도메인 = 시험도메인();
  let 번호 = '';

  try {
    await test.step('Owner 계정으로 로그인하고 qa_user2 제재를 푼다', async () => {
      await 로그인하기(page, params.loginId, params.loginPassword);
      await qa_user2되돌리기(page);
    });

    await test.step('qa_user2 가 제재 없는 상태인지 확인한다', async () => {
      번호 = await 계정번호(page, 'qa_user2');
      await 상세.열기(번호);
      await verify('Owner(qa_admin) 계정으로 로그인해 있다', !new 로그인화면(page).로그인화면인가(), true, { blocker: true });
      await verify('조치 대상 qa_user2 가 제재 없는 상태다', await 상세.정지.isVisible(), true, { blocker: true });
    });

    await test.step('qa_user2 를 정지했다 정지 해제한 뒤 「감사 로그」를 연다', async () => {
      await 조치.열기(번호, 'suspend');
      await 조치.조치하기('정지', false);
      await qa_user2되돌리기(page);
      await 로그.열기();
      await verify('qa_user2 를 정지하고 「감사 로그」를 열면 「님이 qa_user2의 계정을 정지시켰습니다」 줄이 보인다', (await 로그.로그줄.filter({ hasText: '님이 qa_user2의 계정을 정지시켰습니다' }).count()) > 0, true);
    });

    await test.step('이메일 도메인 차단을 하나 만들고 「감사 로그」를 연다', async () => {
      await 이메일도메인차단만들기(page, 도메인);
      await 로그.열기();
      await verify('이메일 도메인 차단을 만든 뒤 감사 로그 맨 위 줄에 그 도메인 차단 기록이 보인다', (await 로그.맨위줄().innerText()).includes(도메인), true);
    });
  } finally {
    await qa_user2되돌리기(page);
    await 목록.지우기(도메인);
  }
});
