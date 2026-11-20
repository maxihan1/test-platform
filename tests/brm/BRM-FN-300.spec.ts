import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 던전으로, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 보스방가기, 보스처치, 봇모두끄기, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-300',
  name: '보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다'],
  elements: ['quest:던전 보스 처치', 'zone:BossArena'],
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
  await test.step('일반 회원이 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 0);
    await verify('던전 화면이 열려 있다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 「/gm tp boss」와 「/gm killboss」를 보낸다', async () => {
    await 퀘스트처음으로(game);
    await 보스방가기(game);
    await 보스처치(game);
    await new 던전화면(game).결과화면으로넘어갈때까지(60_000);
    await 로비로(game, driver, 나);
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '던전 보스 처치');
    await 퀘스트.줄진행이될때까지(줄, '1/1');
    await verify('보스 임프가 죽으면 「던전 보스 처치」 진행이 「1/1」이 된다', await 퀘스트.줄진행(줄), '1/1');
  });
});
