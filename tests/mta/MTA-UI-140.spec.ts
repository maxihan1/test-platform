import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 뜰때까지, 보이나 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-140',
  name: '글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」와 설정에 따라 숫자가 보인다',
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
    await 뜰때까지(driver, 홈.답장들);
    const 답장 = await verify('글 카드 푸터에 「답장」이 보인다', await 보이나(driver, 홈.답장들), true);
    const 부스트 = await verify('글 카드 푸터에 「부스트」가 보인다', await 보이나(driver, 홈.부스트들), true);
    const 좋아요 = await verify('글 카드 푸터에 「좋아요」가 보인다', await 보이나(driver, 홈.좋아요들), true);
    const 공유 = await verify('글 카드 푸터에 「공유」가 보인다', await 보이나(driver, 홈.공유들), true);
    await verify('글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」와 설정에 따라 숫자가 보인다', 답장 && 부스트 && 좋아요 && 공유, true);
  }, { capture: true });
});
