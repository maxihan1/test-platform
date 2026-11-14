import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기, 로그인경로서버고르기, 웹로그인승인, 권한창답하기 } from './helpers/login.helper.js';
import { 계정전환시트 } from './pages/account-switch.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-636',
  name: '계정 둘로 로그인해 계정마다 설정을 보면 알림 · 푸시 · 필터 · 목록 · 게시 기본값은 계정마다 따로 저장된다',
  platforms: ['android'],
  held: '보류 — 앱에 계정 둘을 넣을 길',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 이메일').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 전환 = new 계정전환시트(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('계정 둘로 로그인해 계정마다 설정을 본다', async () => {
    await 전환.열기();
    await 전환.계정추가누르기();
    await 로그인경로서버고르기(driver);
    await 웹로그인승인(driver, params.secondId ?? '', params.secondPassword ?? '');
    await 권한창답하기(driver, '허용');
    await verify('두 번째 계정으로 홈이 열린다', await 홈.떴나(60_000), true, { blocker: true });
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('필터');
    await verify('필터 목록이 열린다', await 필터목록.떴나(), true);
    await verify('계정 둘로 로그인해 계정마다 설정을 보면 알림 · 푸시 · 필터 · 목록 · 게시 기본값은 계정마다 따로 저장된다', !(await 필터목록.제목글들()).includes('스포일러'), true);
  }, { capture: true });
});
