import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글지우기API } from './helpers/api.helper.js';
import { 내글개수API } from './helpers/status-api.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표식 } from './helpers/page-setup.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 작성화면 } from './pages/publish.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-963',
  name: '작성 상자에서 「게시」를 빠르게 두 번 누르면 글이 하나만 생긴다',
  techniques: ['오류 추정'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 글쓰기 = new 작성화면(page);
  const 글표식 = 표식('twice');
  let 글번호들: string[] = [];

  await test.step('일반 회원으로 로그인하고 홈을 연다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await 홈.열기();
    await verify('홈에 작성 상자가 보인다', await 홈.작성.본문.isVisible(), true, { blocker: true });
  });

  try {
    await test.step('작성 상자에 글을 넣고 「게시」를 빠르게 두 번 누른다', async () => {
      await 홈.작성.쓰기(`두 번 누르기 확인 ${글표식}`);
      글번호들 = await 글쓰기.두번눌러게시하기();
      await verify('작성 상자에서 「게시」를 빠르게 두 번 누르면 글이 하나만 생긴다', await 내글개수API(page, 글표식), 1);
    });
  } finally {
    for (const 번호 of 글번호들) await 글지우기API(page, 번호);
  }
});
