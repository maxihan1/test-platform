import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 토스트 } from './components/toast.component.js';
import { 공유동작보내기, 공유주소보내기, 공유창이닫혔나, 토스트가사라질때까지 } from './helpers/onboarding.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-FN-635',
  name: '앱에 지원하지 않는 공유 주소를 보내면 그 밖의 공유 주소나 동작은 영어 토스트 「Unexpected intent URI」 · 「Unexpected intent action」 뒤 닫힌다',
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
  const 알림창 = new 토스트(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱에 지원하지 않는 공유 주소를 보낸다', async () => {
    await 공유주소보내기(driver, 'mastodon://unsupported');
    const 주소알림 = await verify('「Unexpected intent URI」 토스트가 보인다', (await 알림창.글(15_000)).includes('Unexpected intent URI'), true);
    await 토스트가사라질때까지(driver);
    await 공유동작보내기(driver, 'android.intent.action.EDIT');
    const 동작알림 = await verify('「Unexpected intent action」 토스트가 보인다', (await 알림창.글(15_000)).includes('Unexpected intent action'), true);
    const 닫힘 = await verify('공유 창이 닫힌다', await 공유창이닫혔나(driver), true);
    await verify('앱에 지원하지 않는 공유 주소를 보내면 그 밖의 공유 주소나 동작은 영어 토스트 「Unexpected intent URI」 · 「Unexpected intent action」 뒤 닫힌다', 주소알림 && 동작알림 && 닫힘, true);
  }, { capture: true });
});
