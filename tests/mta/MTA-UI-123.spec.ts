import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-123',
  name: '홈의 부스트한 글 카드 위에 「님이 부스트했습니다」 줄이, 답장 글 카드 위에 「님에게 답장」 줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('홈에서 부스트한 글과 답장 글을 찾는다', async () => {
    const 부스트줄 = await verify('「님이 부스트했습니다」 줄이 보인다', await 뜰때까지(driver, 홈.굴려서글자포함('님이 부스트했습니다'), 30_000), true);
    const 답장줄 = await verify('「님에게 답장」 줄이 보인다', await 뜰때까지(driver, 홈.굴려서글자포함('님에게 답장'), 30_000), true);
    await verify('홈의 부스트한 글 카드 위에 「님이 부스트했습니다」 줄이, 답장 글 카드 위에 「님에게 답장」 줄이 보인다', 부스트줄 && 답장줄, true);
  });
});
