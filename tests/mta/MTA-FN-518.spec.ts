import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';
import { 알림글 } from './components/toast.component.js';

export const spec = defineCase({
  tcId: 'MTA-FN-518',
  name: '「미디어 캐시 지우기」를 누르면 토스트 「미디어 캐시 지워짐」이 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    토스트글: z.string().describe('캐시를 지운 뒤 토스트 글').default('미디어 캐시 지워짐'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 알림 = new 알림글(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「Mastodon에 대해」를 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「Mastodon에 대해」가 열린다', await 설정줄열기(driver, 'Mastodon에 대해'), true, { blocker: true });
  });
  await test.step('「미디어 캐시 지우기」를 누른다', async () => {
    await 설정.줄누르기('미디어 캐시 지우기');
    await verify('「미디어 캐시 지우기」를 누르면 토스트 「미디어 캐시 지워짐」이 보인다', await 알림.토스트(), expected.토스트글);
  });
});
