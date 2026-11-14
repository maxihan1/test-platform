import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-104',
  name: '홈에 관리자 공지 배너가 보인다',
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 암호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 홈 = new 홈화면(page);

  await test.step('일반 회원으로 로그인한다', async () => {
    await 로그인하기(page, params.loginId, params.loginPassword);
    await verify('로그인 후 오른쪽 메뉴에 「홈」이 보인다', await 홈.메뉴.링크(/^홈/).waitFor({ timeout: 10_000 }).then(() => true, () => false), true, { blocker: true });
  });

  await test.step('홈을 연다', async () => {
    await 홈.열기();
    const 보인다 = await 홈.공지배너.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('홈에 관리자 공지 배너가 보인다', 보인다, true);
  });

  await test.step('공지 배너의 「공지사항 보기/숨기기」를 누른다', async () => {
    await 홈.공지토글.click();
    const 접혔다 = await 홈.공지내용.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「공지사항 보기/숨기기」로 공지가 접힌다', 접혔다, true);
  });
});
