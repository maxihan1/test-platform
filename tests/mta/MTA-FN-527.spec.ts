import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 알림글 } from './components/toast.component.js';
import { 앱링크열기 } from './helpers/signup-flow.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-527',
  name: '그 밖의 공유 주소로 들어오면 토스트 「Unexpected intent URI」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    주소: z.string().describe('여는 주소 — 앱이 모르는 mastodon:// 주소').default('mastodon://foo'),
  }),
  expected: z.object({
    토스트글: z.string().describe('토스트 글').default('Unexpected intent URI'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 알림 = new 알림글(driver);

  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });

  await test.step('알 수 없는 「mastodon://foo」 주소를 연다', async () => {
    await 앱링크열기(driver, params.주소);
    await verify('그 밖의 공유 주소로 들어오면 토스트 「Unexpected intent URI」가 보인다', await 알림.토스트(10_000), expected.토스트글);
  });
});
