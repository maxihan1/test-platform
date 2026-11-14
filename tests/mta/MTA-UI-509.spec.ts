import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구가보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-509',
  name: '우리 서버는 새 서버라 유행 글 · 해시태그가 비어 있을 가능성이 크고 앱의 빈 화면 문구는 확인 필요다',
  platforms: ['android'],
  held: '보류 — 유행 글이 없는 서버',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 탐색 = new 둘러보기화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });

  await test.step('유행 글이 없는 서버에서 둘러보기를 연다', async () => {
    await 탐색.열기();
    await verify('우리 서버는 새 서버라 유행 글 · 해시태그가 비어 있을 가능성이 크고 앱의 빈 화면 문구는 확인 필요다', await 문구가보이나(driver, '리스트에 아무 것도 없습니다'), true);
  }, { capture: true });
});
