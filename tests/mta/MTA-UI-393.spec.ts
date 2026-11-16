import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-393',
  name: '설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다',
  platforms: ['android'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    동작줄: z.string().describe('앱 설정 줄 이름').default('동작'),
    디스플레이줄: z.string().describe('앱 설정 줄 이름').default('디스플레이'),
    대해줄: z.string().describe('앱 설정 줄 이름').default('Mastodon에 대해'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 화면을 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    const 동작 = await verify('설정 「앱 설정」에 「동작」이 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.동작줄), 10_000), true);
    const 디스플레이 = await verify('설정 「앱 설정」에 「디스플레이」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.디스플레이줄), 10_000), true);
    const 대해 = await verify('설정 「앱 설정」에 「Mastodon에 대해」가 보인다', await 뜰때까지(driver, 설정.굴려서줄(expected.대해줄), 10_000), true);
    await verify('설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다', 동작 && 디스플레이 && 대해, true);
  });
});
