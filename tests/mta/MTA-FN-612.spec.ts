import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-612',
  name: '필터에 걸리는 답글이 달린 글 상세를 열면 글 상세의 답글은 필터 「스레드 & 답글」 범위를 따라 걸러진다',
  platforms: ['android'],
  held: '보류 — 필터에 걸리는 답글이 달린 글',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    원글본문: z.string().describe('필터에 걸리는 답글이 달린 글의 본문 일부'),
    답글본문: z.string().describe('필터에 걸리는 답글의 본문 일부'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 상세 = new 글상세화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('필터에 걸리는 답글이 달린 글 상세를 연다', async () => {
    await 상세.본문눌러열기(params.원글본문);
    await verify('글 상세 확장 푸터가 보인다', await 상세.떴나(), true);
    await verify('필터에 걸리는 답글이 달린 글 상세를 열면 글 상세의 답글은 필터 「스레드 & 답글」 범위를 따라 걸러진다', await 상세.글안보이나(params.답글본문), true);
  }, { capture: true });
});
