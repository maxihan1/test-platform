import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 글카드 } from './pages/post-card.page.js';
import { 프로필화면 } from './pages/profile.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-159',
  name: '내 글을 인용한 남의 글 더보기에 「지호의 게시물에서 나의 게시물을 제거합니다」가 보인다',
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
  const 카드 = new 글카드(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('내 글을 인용한 jiho_cafe 글 더보기를 연다', async () => {
    await 프로필열기(driver, 'jiho_cafe');
    await verify('내 글을 인용한 jiho_cafe 글이 보인다', await 뜰때까지(driver, new 프로필화면(driver).굴려서글자포함('인용한 글을 다시 인용해 봤어요'), 20_000), true, { blocker: true });
    await verify('내 글을 인용한 남의 글 더보기에 「지호의 게시물에서 나의 게시물을 제거합니다」가 보인다', await 카드.더보기메뉴에서찾기('지호의 게시물에서 나의 게시물을 제거합니다'), true);
    await driver.back();
  });
});
