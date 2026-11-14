import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 문구찾기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-123',
  name: '부스트한 글 카드 위에 「<이름> 님이 부스트했습니다」, 답장 글 카드 위에 「<이름> 님에게 답장」 줄이 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 로그인해 홈을 연다', async () => {
    const 부스트줄 = await verify('부스트한 글 카드 위에 「<이름> 님이 부스트했습니다」 줄이 보인다', await 문구찾기(driver, '<이름> 님이 부스트했습니다'), true);
    const 답장줄 = await verify('답장 글 카드 위에 「<이름> 님에게 답장」 줄이 보인다', await 문구찾기(driver, '<이름> 님에게 답장'), true);
    await verify('부스트한 글 카드 위에 「<이름> 님이 부스트했습니다」, 답장 글 카드 위에 「<이름> 님에게 답장」 줄이 보인다', 부스트줄 && 답장줄, true);
  }, { capture: true });
});
