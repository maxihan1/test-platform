import { defineCase, test, verify } from '@platform/kit';
import { 될때까지, 보이나 } from '@platform/kit/parts';
import { z } from 'zod';

import { 계정줄 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-544',
  name: '글 본문의 멘션을 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  held: '보류 — 앱 화면에서 글 본문 안 「@qa_user1」 링크 주소를 못 읽었다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    멘션주소: z.string().describe('글 본문 안 「@qa_user1」 링크 요소 주소'),
    글일부: z.string().min(1).describe('minjun_dev 의 멘션 글을 찾는 낱말').default('@qa_user1'),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 프로필 = new 프로필화면(driver);

  await test.step('일반 회원으로 로그인해 minjun_dev 프로필을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
    await 프로필열기(driver, 'minjun_dev');
    await verify('멘션 글이 보인다', await 카드.글자가보일때까지(params.글일부), true, { blocker: true });
  });

  await test.step('minjun_dev 의 qa_user1 멘션 글에서 「@qa_user1」을 누른다', async () => {
    await driver.$(params.멘션주소).click();
    await verify(
      '글 본문의 멘션을 누르면 그 사람 프로필이 열린다',
      await 될때까지(driver, async () => (await 보이나(driver, 프로필.계정)) && (await driver.$(프로필.계정).getText()) === 계정줄('qa_user1'), 15_000),
      true,
    );
  });
});
