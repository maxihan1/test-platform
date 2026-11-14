import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 앱정보화면 } from './pages/set-about.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-444',
  name: '「미디어 캐시 지우기」 부제는 캐시 크기이고 0이면 비활성이다',
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
  await test.step('홈에서 설정을 연다', async () => {
    await verify('설정 화면에 「계정 추가...」 줄이 보인다', await 설정.열기(), true, { blocker: true });
  });
  await test.step('설정에서 「Mastodon에 대해」를 연다', async () => {
    await 설정.줄누르기('Mastodon에 대해');
    await verify('「Mastodon에 대해」 화면이 열린다', await 정보.떴나(), true);
    const 부제 = (await 정보.부제글('미디어 캐시 지우기')).trim();
    const 크기 = await verify('「미디어 캐시 지우기」 부제가 캐시 크기 꼴이다', /^[\d.,]+\s?[^\d\s]*$/.test(부제), true);
    const 영 = /^0([.,]0+)?\s?[^\d.,]*$/.test(부제);
    const 활성 = await verify('캐시 크기가 0이면 비활성, 0이 아니면 활성이다', await 정보.활성('미디어 캐시 지우기'), 영 ? 'false' : 'true');
    await verify('「미디어 캐시 지우기」 부제는 캐시 크기이고 0이면 비활성이다', 크기 && 활성, true);
  }, { capture: true });
});
