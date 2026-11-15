import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 승인누르고이메일확인화면으로 } from './helpers/signup-flow.helper.js';
import { 시작화면열기 } from './helpers/login.helper.js';
import { 이메일확인화면 } from './pages/email-confirm.page.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-613',
  name: '이메일 확인 대기 계정으로 로그인하면 이메일 확인 화면에 이메일 글이 보인다',
  platforms: ['android'],
  held: '보류 — 확인 대기 계정은 웹에서 승인 화면 대신 확인 대기 화면에 머물고 폰 크롬에 그 세션이 남는다',
  precondition: ['이메일 확인 대기 계정이 있다'],
  params: z.object({
    loginId: z.string().describe('일회용 · 이메일 확인 대기 아이디').optional().meta({ secret: true, account: '일회용 · 이메일 확인 대기' }),
    loginPassword: z.string().describe('일회용 · 이메일 확인 대기 비밀번호').optional().meta({ secret: true, account: '일회용 · 이메일 확인 대기' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 확인 = new 이메일확인화면(driver);

  await test.step('앱을 켜서 시작 화면을 연다', async () => {
    await 시작화면열기(driver);
    await verify('시작 화면 「로그인」 버튼이 보인다', await 시작.그려질때까지(), true, { blocker: true });
  });

  await test.step('이메일 확인 대기 계정으로 로그인해 이메일 칸을 읽는다', async () => {
    await 승인누르고이메일확인화면으로(driver, params.loginId, params.loginPassword);
    await verify('「수신함 확인하기」 화면이 보인다', await 확인.그려질때까지(), true, { blocker: true });
    await verify('이메일 확인 대기 계정으로 로그인하면 이메일 확인 화면에 이메일 글이 보인다', await 확인.글보이나(params.loginId ?? ''), true);
  });
});
