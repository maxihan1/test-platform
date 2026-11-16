import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-170',
  name: '글쓰기에 아바타 · 표시 이름 · 「@qa_user1@mastodon.maxihan.com」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    계정: z.string().describe('글쓰기에 보이는 계정 글자').default('@qa_user1@mastodon.maxihan.com'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('글쓰기 화면을 연다', async () => {
    await verify('글쓰기 화면 본문 칸이 보인다', await 글쓰기.열기(), true, { blocker: true });
    const 아바타 = await verify('아바타가 보인다', await 뜰때까지(driver, 글쓰기.아바타, 10_000), true);
    const 이름 = await verify('표시 이름이 보인다', await 뜰때까지(driver, 글쓰기.표시이름, 10_000), true);
    const 계정 = await verify('계정 글자가 기대값과 같다', await driver.$(글쓰기.사용자명).getText(), expected.계정);
    await verify('글쓰기에 아바타 · 표시 이름 · 「@qa_user1@mastodon.maxihan.com」이 보인다', 아바타 && 이름 && 계정, true);
  });
});
