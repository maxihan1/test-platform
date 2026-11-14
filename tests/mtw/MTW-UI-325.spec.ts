import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

export const spec = defineCase({
  tcId: 'MTW-UI-325',
  name: '좁은 화면 홈 하단에 「홈」 · 「알림」 · 「검색」 · 「새 게시물」 · 「메뉴」 탭이 보인다',
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

  await test.step('화면 폭을 좁혀 홈을 연다', async () => {
    await 홈.좁은화면열기();
    const 탭홈 = await verify('하단에 「홈」 탭이 보인다', await 홈.하단탭항목('홈').isVisible(), true);
    const 탭알림 = await verify('하단에 「알림」 탭이 보인다', await 홈.하단탭항목('알림').isVisible(), true);
    const 탭검색 = await verify('하단에 「검색」 탭이 보인다', await 홈.하단탭항목('검색').isVisible(), true);
    const 탭새글 = await verify('하단에 「새 게시물」 탭이 보인다', await 홈.하단탭항목('새 게시물').isVisible(), true);
    const 탭메뉴 = await verify('하단에 「메뉴」 탭이 보인다', await 홈.하단탭항목('메뉴').isVisible(), true);
    await verify('좁은 화면 홈 하단에 「홈」 · 「알림」 · 「검색」 · 「새 게시물」 · 「메뉴」 탭이 보인다', 탭홈 && 탭알림 && 탭검색 && 탭새글 && 탭메뉴, true);
  });
});
