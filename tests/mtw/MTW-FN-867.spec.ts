import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 웹앱없는경로화면 } from './pages/web-404.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-867',
  name: '웹 앱에서 없는 경로를 열면 「404」가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 화면 = new 웹앱없는경로화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('웹 앱에서 없는 경로를 연다', async () => {
    await 화면.열기();
    await verify('웹 앱에서 없는 경로를 열면 「404」가 보인다', await 화면.코드.isVisible(), true);
    await verify('「요청하신 페이지를 찾을 수 없습니다. 주소창에 적힌 URL이 확실히 맞나요?」가 보인다', await 화면.안내.isVisible(), true);
  });
});
