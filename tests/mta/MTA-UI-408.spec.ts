import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-408',
  name: '계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await 설정.계정줄누르기();
    await verify('계정 설정 화면이 열린다', await 계정설정.떴나(), true);
    const 제목들 = await 계정설정.제목글들();
    const 프라이버시 = await verify('「프라이버시와 노출 범위」가 보인다', 제목들.includes('프라이버시와 노출 범위'), true);
    const 필터 = await verify('「필터」가 보인다', 제목들.includes('필터'), true);
    const 알림 = await verify('「알림」이 보인다', 제목들.includes('알림'), true);
    const 게시 = await verify('「게시 기본값」이 보인다', 제목들.includes('게시 기본값'), true);
    const 서버줄 = await verify('「이 서버에 대해서」가 보인다', 제목들.includes('이 서버에 대해서'), true);
    const 전환 = await verify('「이 계정으로 전환」이 보인다', 제목들.includes('이 계정으로 전환'), true);
    const 삭제 = await verify('「계정 삭제」가 보인다', 제목들.includes('계정 삭제'), true);
    const 로그아웃 = await verify('「로그아웃」이 보인다', 제목들.includes('로그아웃'), true);
    await verify('계정 설정에 「프라이버시와 노출 범위」 · 「필터」 · 「알림」 · 「게시 기본값」 · 「이 서버에 대해서」 · 「이 계정으로 전환」 · 「계정 삭제」 · 「로그아웃」이 보인다', 프라이버시 && 필터 && 알림 && 게시 && 서버줄 && 전환 && 삭제 && 로그아웃, true);
  }, { capture: true });
});
