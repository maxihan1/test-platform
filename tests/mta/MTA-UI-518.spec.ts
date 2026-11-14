import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글자요소가보이나, 설정줄열기 } from './helpers/compose.helper.js';
import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-518',
  name: '앱 이름 「Mastodon」은 번역하지 않는다',
  platforms: ['android'],
  held: '보류 — 런처 앱 이름을 읽을 요소 주소',
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('앱 설정 「Mastodon에 대해」를 연다', async () => {
    await 설정줄열기(driver, ['Mastodon에 대해']);
    await verify('앱 이름 「Mastodon」은 번역하지 않는다', await 글자요소가보이나(driver, 'Mastodon'), true);
  }, { capture: true });
});
