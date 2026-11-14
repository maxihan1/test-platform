import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 문구가보이나 } from './helpers/app.helper.js';
import { 웹거부누르기, 웹승인화면까지 } from './helpers/onboarding.helper.js';
import { 로그인경로서버고르기 } from './helpers/login.helper.js';
import { 시작화면 } from './pages/start.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-097',
  name: '로그인 승인을 거부해 주소에 error가 붙어 돌아오면 오류 설명(없으면 오류 코드)을 토스트로 보이고 메인 화면으로 간다',
  platforms: ['android'],
  techniques: ['동등 분할'],
  precondition: ['앱에 로그인한 계정이 없다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 시작 = new 시작화면(driver);
  const 알림창 = new 토스트(driver);

  await test.step('앱 시작 화면을 확인한다', async () => {
    await verify('시작 화면에 「로그인」 버튼이 보인다', await 시작.떴나(), true, { blocker: true });
  });
  await test.step('로그인 경로로 우리 서버 웹 승인 화면까지 간다', async () => {
    await 로그인경로서버고르기(driver);
    await 웹승인화면까지(driver, params.loginId ?? '', params.loginPassword ?? '');
    await verify('웹 승인 화면에 앱 이름이 보인다', await 문구가보이나(driver, 'Mastodon for Android'), true, { blocker: true });
  });
  await test.step('로그인 승인 화면에서 「거부」를 누른다', async () => {
    await 웹거부누르기(driver);
    const 오류알림 = await verify('오류 설명이 토스트로 보인다', (await 알림창.글(30_000)) !== '', true);
    const 첫화면 = await verify('시작 화면으로 돌아온다', await 시작.떴나(), true);
    await verify('로그인 승인을 거부해 주소에 error가 붙어 돌아오면 오류 설명(없으면 오류 코드)을 토스트로 보이고 메인 화면으로 간다', 오류알림 && 첫화면, true);
  }, { capture: true });
});
