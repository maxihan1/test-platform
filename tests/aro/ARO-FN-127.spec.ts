import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 대시보드화면 } from './pages/dashboard.page.js';
import { 쿠키읽기 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-FN-127',
  name: '로그아웃 확인 창에서 「확인」을 누르면 로그인 화면으로 가고 anyrpg_ops 쿠키가 지워진다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 대시보드 = new 대시보드화면(page);
  const 로그인 = new 로그인화면(page);

  await test.step('운영자 계정으로 로그인하고 대시보드를 연다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await 대시보드.열기();
    await 대시보드.틀.그려질때까지();
    await verify('머리줄에 운영자 이름이 보인다', await 대시보드.틀.운영자.isVisible(), true, { blocker: true });
  });

  await test.step('머리줄 「로그아웃」을 누르고 확인 창에서 「확인」을 누른다', async () => {
    await 대시보드.틀.로그아웃누르기();
    await 대시보드.창.열릴때까지();
    await 대시보드.창.누르기('확인');
    const 도착 = await 로그인.제목.waitFor({ timeout: 10_000 }).then(() => true, () => false);
    const 화면 = await verify('로그인 화면으로 간다', 도착 && new URL(page.url()).pathname === 로그인화면.주소, true);
    const 쿠키 = await verify('anyrpg_ops 쿠키가 지워진다', await 쿠키읽기(page, 'anyrpg_ops'), undefined);
    await verify('로그아웃 확인 창에서 「확인」을 누르면 로그인 화면으로 가고 anyrpg_ops 쿠키가 지워진다', 화면 && 쿠키, true);
  });
});
