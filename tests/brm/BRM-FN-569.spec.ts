import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전으로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 보스방가기, 보스처치, 봇모두끄기, 쓰러뜨리기 } from './helpers/game-state.helper.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-569',
  name: '승리 결과와 패배 결과의 「Directional Light」 색을 읽으면 결과 화면 조명 색은 승리와 패배에서 서로 다르다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['move:장소 던전→결과', 'zone:PostGame', 'zone:BossArena'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  let 패배색 = '';
  await test.step('일반 회원이 패배 결과 화면까지 간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await 쓰러뜨리기(game);
    const 결과 = await 결과화면.열기(game, 60_000);
    await verify('패배 결과 화면에 「다시 도전」이 보인다', await 결과.패배글이될때까지(), true, { blocker: true });
    패배색 = await 결과.조명색();
  });
  await test.step('승리 결과와 패배 결과의 「Directional Light」 색을 읽는다', async () => {
    const 패배결과 = await 결과화면.열기(game, 30_000);
    await 패배결과.로비로돌아갈때까지(40_000);
    await 던전으로(game, driver, 나, 0);
    await 보스방가기(game);
    await 보스처치(game);
    const 결과 = await 결과화면.열기(game, 60_000);
    await verify('승리 결과 화면에 「승리!」가 보인다', await 결과.승리글이될때까지(), true, { blocker: true });
    const 승리색 = await 결과.조명색();
    await verify('승리 결과와 패배 결과의 「Directional Light」 색을 읽으면 결과 화면 조명 색은 승리와 패배에서 서로 다르다', 승리색 !== 패배색, true);
  });
});
