import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 서버오류화면 } from './pages/server-error.page.js';

export const spec = defineCase({
  tcId: 'MTW-FN-855',
  name: '서버 화면에서 없는 주소를 열면 「찾으려는 페이지가 존재하지 않습니다.」가 보인다',
  techniques: ['동등 분할'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);
  const 화면 = new 서버오류화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('없는 설정 주소를 연다', async () => {
    await 화면.없는설정열기();
    await verify('서버 화면에서 없는 주소를 열면 「찾으려는 페이지가 존재하지 않습니다.」가 보인다', await 화면.안내('찾으려는 페이지가 존재하지 않습니다.').isVisible(), true);
  });
});
