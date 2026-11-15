import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-140',
  name: '글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」가 보인다',
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

  await test.step('홈 첫 글 카드 푸터를 확인한다', async () => {
    await 뜰때까지(driver, 홈.첫답장, 15_000);
    const 답장 = await verify('「답장」이 보인다', await driver.$(홈.첫답장).getText(), '답장');
    const 부스트 = await verify('「부스트」가 보인다', await driver.$(홈.첫부스트).getText(), '부스트');
    const 좋아요 = await verify('「좋아요」가 보인다', await driver.$(홈.첫좋아요).getText(), '좋아요');
    const 공유 = await verify('「공유」가 보인다', await driver.$(홈.첫공유).getText(), '공유');
    await verify('글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」가 보인다', 답장 && 부스트 && 좋아요 && 공유, true);
  });
});
