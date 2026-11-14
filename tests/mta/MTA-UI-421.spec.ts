import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-421',
  name: '필터 범위는 「홈 & 리스트」 · 「알림」 · 「공개 타임라인」 · 「스레드 & 답글」 · 「프로필」이고 여러 개면 「A과 B」 · 「A, B, 및 C」 · 「A, B 및 n개 더보기」로 줄인다',
  platforms: ['android'],
  held: '보류 — 필터 범위 화면의 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('필터 목록을 연다', async () => {
    await verify('필터 범위는 「홈 & 리스트」 · 「알림」 · 「공개 타임라인」 · 「스레드 & 답글」 · 「프로필」이고 여러 개면 「A과 B」 · 「A, B, 및 C」 · 「A, B 및 n개 더보기」로 줄인다', await 문구가보이나(driver, '홈 & 리스트'), true);
  });
});
