import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-517',
  name: '미디어 캐시 크기가 0이면 「미디어 캐시 지우기」가 비활성이다',
  platforms: ['android'],
  techniques: ['결정 테이블'],
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
  await test.step('「미디어 캐시 지우기」를 누른 뒤 다시 본다', async () => {
    await 정보.줄누르기('미디어 캐시 지우기');
    await verify('미디어 캐시 크기가 0이 된다', await 정보.캐시가영이될때까지(), true);
    await verify('미디어 캐시 크기가 0이면 「미디어 캐시 지우기」가 비활성이다', await 정보.활성('미디어 캐시 지우기'), 'false');
  }, { capture: true });
});
