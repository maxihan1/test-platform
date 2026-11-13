import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 점검화면 } from './pages/maintenance.page.js';
import { 로그인상태인가 } from './helpers/maintenance-dash.helper.js';

export const spec = defineCase({
  tcId: 'ARO-UI-192',
  name: '「점검」 화면에 현재 상태 줄 · 「점검 켜기」 · 「게임에 보일 안내 (켤 때 1~300자)」 · 「시작 (비우면 바로)」 · 「끝 (비우면 끌 때까지)」 · 「점검 중에도 들어올 게임 계정 번호 (쉼표로)」 · 「저장」이 보인다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 점검 = new 점검화면(page);

  await test.step('운영자 계정으로 로그인한다', async () => {
    await 운영자쿠키받기(page, params.loginId, params.loginPassword);
    await verify('운영자 세션이 열려 있다', await 로그인상태인가(page), true, { blocker: true });
  });

  await test.step('「점검」 화면을 연다', async () => {
    await 점검.열기();
    await 점검.틀.그려질때까지();
    const 상태 = await verify('「점검」 화면에 현재 상태 줄이 보인다', await 점검.상태줄.isVisible(), true);
    const 켜기 = await verify('「점검」 화면에 「점검 켜기」가 보인다', await 점검.켜기.isVisible(), true);
    const 안내 = await verify('「점검」 화면에 「게임에 보일 안내 (켤 때 1~300자)」가 보인다', await 점검.안내칸.isVisible(), true);
    const 시작 = await verify('「점검」 화면에 「시작 (비우면 바로)」가 보인다', await 점검.시작칸.isVisible(), true);
    const 끝 = await verify('「점검」 화면에 「끝 (비우면 끌 때까지)」가 보인다', await 점검.끝칸.isVisible(), true);
    const 허용 = await verify('「점검」 화면에 「점검 중에도 들어올 게임 계정 번호 (쉼표로)」가 보인다', await 점검.허용칸.isVisible(), true);
    const 저장 = await verify('「점검」 화면에 「저장」이 보인다', await 점검.저장버튼.isVisible(), true);
    await verify('「점검」 화면에 현재 상태 줄 · 「점검 켜기」 · 「게임에 보일 안내 (켤 때 1~300자)」 · 「시작 (비우면 바로)」 · 「끝 (비우면 끌 때까지)」 · 「점검 중에도 들어올 게임 계정 번호 (쉼표로)」 · 「저장」이 보인다', 상태 && 켜기 && 안내 && 시작 && 끝 && 허용 && 저장, true);
  });

  await test.step('폼 아래 안내를 본다', async () => {
    await verify('폼에 안내 「점검 중에는 비밀번호가 맞아도 로그인 응답이 503(MAINTENANCE)입니다. 이미 접속한 유저는 게임 서버가 처리합니다.」가 보인다', await 점검.폼안내.isVisible(), true);
  });
});
