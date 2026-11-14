import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-393',
  name: '설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다',
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

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('홈 설정 아이콘을 누른다', async () => {
    await verify('설정 화면이 열린다', await 설정.열기(), true);
    const 제목들 = await 설정.제목글들();
    const 앱설정 = await verify('「앱 설정」이 보인다', 제목들.includes('앱 설정'), true);
    const 동작 = await verify('「동작」이 보인다', 제목들.includes('동작'), true);
    const 디스플레이 = await verify('「디스플레이」가 보인다', 제목들.includes('디스플레이'), true);
    const 정보 = await verify('「Mastodon에 대해」가 보인다', 제목들.includes('Mastodon에 대해'), true);
    await verify('설정 「앱 설정」에 「동작」 · 「디스플레이」 · 「Mastodon에 대해」가 보인다', 앱설정 && 동작 && 디스플레이 && 정보, true);
  }, { capture: true });
});
