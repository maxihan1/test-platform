import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 클립보드, 클립보드에넣기 } from './helpers/app.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-519',
  name: '맨 아래 버전 줄을 누르면 버전 정보가 클립보드에 복사된다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 정보 = new 앱정보화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 「Mastodon에 대해」를 연다', async () => {
    await 설정.열기();
    await 설정.줄누르기('Mastodon에 대해');
    await verify('「Mastodon에 대해」 화면에 「추가 설정」 줄이 보인다', await 정보.떴나(), true, { blocker: true });
  });
  await test.step('「Mastodon에 대해」 맨 아래 버전 줄을 누른다', async () => {
    await 클립보드에넣기(driver, '비움');
    await 정보.버전줄누르기();
    await verify('맨 아래 버전 줄을 누르면 버전 정보가 클립보드에 복사된다', (await 클립보드(driver)).includes('2.13.5'), true);
  }, { capture: true });
});
