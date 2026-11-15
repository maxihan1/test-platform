import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 글읽기 } from './helpers/app.helper.js';
import { 설정열기, 설정줄열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-444',
  name: '「미디어 캐시 지우기」 부제에 캐시 크기가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    크기꼴: z.string().describe('캐시 크기 부제의 정규식 — 숫자가 든 글').default('\\d'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('설정 「Mastodon에 대해」를 연다', async () => {
    await verify('설정 화면이 열린다', await 설정열기(driver), true, { blocker: true });
    await verify('「Mastodon에 대해」가 열린다', await 설정줄열기(driver, 'Mastodon에 대해'), true, { blocker: true });
  });
  await test.step('「Mastodon에 대해」의 「미디어 캐시 지우기」 부제를 읽는다', async () => {
    await verify('미디어 캐시 지우기 부제가 보인다', await 뜰때까지(driver, 설정.부제, 10_000), true, { blocker: true });
    await verify('「미디어 캐시 지우기」 부제에 캐시 크기가 보인다', new RegExp(expected.크기꼴).test(await 글읽기(driver, 설정.부제)), true);
  });
});
