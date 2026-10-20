import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';
import { 운영툴화면 } from './pages/ops.page.js';
import { 로그인화면 } from './pages/login.page.js';
import { 로그인한아이디 } from './helpers/member.helper.js';

export const spec = defineCase({
  tcId: 'MKO-FN-009',
  name: '로그인하지 않고 /ops 를 열면 로그인 화면으로 간다',
  precondition: ['비회원이다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: z.object({
    loginPath: z.string().describe('로그인 화면 주소').default('/login'),
    loginTitle: z.string().describe('로그인 화면 제목').default('로그인'),
  }),
});

test(spec, async ({ page, expected }) => {
  const 운영툴 = new 운영툴화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('로그인하지 않았는지 확인한다', async () => {
    await verify('로그인한 회원이 없다', await 로그인한아이디(page), null, { blocker: true });
  });

  await test.step('/ops 주소를 연다', async () => {
    await 운영툴.열기();
    const 주소 = await verify('주소가 로그인 화면 주소다', new URL(page.url()).pathname, expected.loginPath);
    const 제목 = await verify('화면 제목이 로그인 화면 제목이다', await 로그인.제목글자(), expected.loginTitle);
    await verify('로그인하지 않고 /ops 를 열면 로그인 화면으로 간다', 주소 && 제목, true);
  });
});
