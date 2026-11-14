import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아래로당기기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-589',
  name: '당겨서 불러온 새 글이 20건이면 중간이 빈 것으로 보고 「위에서 놓친 게시물 불러오기」 / 「아래에서 놓친 게시물 불러오기」 빈틈 줄을 만들고, 줄을 누르면 그 구간을 불러온다',
  platforms: ['android'],
  held: '보류 — 다른 계정으로 글 20건을 올릴 길',
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
  await test.step('새 글이 20건 쌓인 뒤 홈을 당겨서 새로고침한다', async () => {
    await 아래로당기기(driver);
    const 위줄 = await verify('「위에서 놓친 게시물 불러오기」 줄이 보인다', await 홈.빈틈줄이보이나('위'), true);
    const 아래줄 = await verify('「아래에서 놓친 게시물 불러오기」 줄이 보인다', await 홈.빈틈줄이보이나('아래'), true);
    await 홈.빈틈줄누르기('위');
    const 불러옴 = await verify('줄을 눌러 그 구간을 불러온다', await 홈.빈틈줄이사라질때까지('위'), true);
    await verify('당겨서 불러온 새 글이 20건이면 중간이 빈 것으로 보고 「위에서 놓친 게시물 불러오기」 / 「아래에서 놓친 게시물 불러오기」 빈틈 줄을 만들고, 줄을 누르면 그 구간을 불러온다', 위줄 && 아래줄 && 불러옴, true);
  }, { capture: true });
});
