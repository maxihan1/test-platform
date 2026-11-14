import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 유저화면 } from './pages/users.page.js';

export const spec = defineCase({
  tcId: 'ARO-UI-023',
  name: '「유저 · 제재」에서 머리줄 로고 「Boss Room」을 누르면 대시보드로 간다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 유저 = new 유저화면(page);
  const 대시보드 = new 대시보드화면(page);

  await test.step('운영자 계정으로 로그인하고 「유저 · 제재」 화면을 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 유저.열기();
    await 유저.틀.그려질때까지();
    await verify('「유저 · 제재」 화면 제목이 보인다', await 유저.제목.isVisible(), true, { blocker: true });
  });

  await test.step('「유저 · 제재」에서 머리줄 로고 「Boss Room」을 누른다', async () => {
    await 유저.틀.로고.click();
    const 도착 = await 대시보드.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    await verify('「유저 · 제재」에서 머리줄 로고 「Boss Room」을 누르면 대시보드로 간다', 도착 && new URL(page.url()).pathname === 대시보드화면.주소, true);
  });
});
