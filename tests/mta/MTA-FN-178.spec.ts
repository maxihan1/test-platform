import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 수가될때까지 } from './helpers/timeline.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 표시글, 내글쓰기, 내프로필에서글열기, 내글지우기 } from './helpers/post.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-178',
  name: '내 글 상세에서 「좋아요」를 누르면 좋아요가 켜지고 다시 누르면 꺼진다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 글상세 = new 글상세화면(driver);
  const 본문 = 표시글('좋아요 확인');

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  try {
    await test.step('내가 쓴 새 글 상세에서 「좋아요」를 두 번 누른다', async () => {
      await 내글쓰기(driver, 본문);
      await 내프로필에서글열기(driver, 본문);
      await verify('글 상세가 열린다', await 글상세.그려질때까지(), true, { blocker: true });
      const 처음 = await 글상세.좋아요개수();
      await driver.$(글상세.좋아요).click();
      const 켜짐 = await verify('좋아요 수가 1 늘어난다', await 수가될때까지(driver, () => 글상세.좋아요개수(), 처음 + 1), true);
      await driver.$(글상세.좋아요).click();
      const 꺼짐 = await verify('좋아요 수가 처음으로 돌아온다', await 수가될때까지(driver, () => 글상세.좋아요개수(), 처음), true);
      await verify('내 글 상세에서 「좋아요」를 누르면 좋아요가 켜지고 다시 누르면 꺼진다', 켜짐 && 꺼짐, true);
    });
  } finally {
    await 내글지우기(driver, 본문);
  }
});
