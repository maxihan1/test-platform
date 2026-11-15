import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 설정열기, 설정줄열기, 클립보드글 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-519',
  name: '「안드로이드용 마스토돈 v2.13.5 (194)」 줄을 누르면 클립보드에 「2.13.5」가 든 글이 복사된다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    버전줄: z.string().describe('맨 아래 버전 줄').default('안드로이드용 마스토돈 v2.13.5 (194)'),
    버전글: z.string().describe('클립보드에 든 글에 들어가는 버전').default('2.13.5'),
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
  await test.step('맨 아래 버전 줄을 누른다', async () => {
    await 설정.줄누르기(expected.버전줄);
    await verify('「안드로이드용 마스토돈 v2.13.5 (194)」 줄을 누르면 클립보드에 「2.13.5」가 든 글이 복사된다', (await 클립보드글(driver)).includes(expected.버전글), true);
  });
});
