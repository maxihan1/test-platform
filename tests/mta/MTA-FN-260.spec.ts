import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 프로필열기 } from './helpers/nav.helper.js';
import { 프로필첫글열기 } from './helpers/compose-flow.helper.js';

import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 글상세화면 } from './pages/thread.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-260',
  name: '팔로워 공개 글에 답장하면 공개 범위 버튼이 「팔로워」로 시작한다',
  platforms: ['android'],
  precondition: ['두 번째 사용자로 로그인해 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: z.object({
    팔로워: z.string().describe('공개 범위 버튼이 시작하는 글').default('팔로워'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 글쓰기 = new 글쓰기화면(driver);
  const 글상세 = new 글상세화면(driver);

  await test.step('두 번째 사용자로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.secondId, params.secondPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('yuna_locked 의 팔로워 공개 글에 답장 글쓰기를 연다', async () => {
    await 프로필열기(driver, 'yuna_locked');
    await 프로필첫글열기(driver);
    await driver.$(글상세.답장).click();
    await verify('답장 글쓰기 본문 칸이 보인다', await 글쓰기.그려질때까지(), true, { blocker: true });
    await verify('팔로워 공개 글에 답장하면 공개 범위 버튼이 「팔로워」로 시작한다', (await 글쓰기.공개범위표시()).startsWith(expected.팔로워), true);
  });
});
