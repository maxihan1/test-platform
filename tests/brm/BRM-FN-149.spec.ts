import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 보상버튼이눌릴때까지, 사기, 파티맺기 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 골드맞추기, 봇모두끄기, 봇켜기, 퀘스트처음으로 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 퀘스트창 } from './pages/quest.page.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-149',
  name: '장비와 파티가 있어도 퀘스트 보상을 받으면 골드가 50 만 는다',
  platforms: ['android'],
  precondition: ['일반 회원이 행운의 반지와 현자의 목걸이 가운데 행운의 반지를 끼고 두 번째 플레이어 봇과 2명 파티다'],
  elements: ['item:행운의 반지', 'quest:상점에서 물건 구매', 'flow:골드-일일 퀘스트'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  let 봇 = '';
  await test.step('일반 회원이 행운의 반지를 끼고 두 번째 플레이어 봇과 2명 파티가 된다', async () => {
    await 로비로(game, driver, 나);
    await 골드맞추기(game, 1000);
    await 사기(game, '행운의 반지');
    await 가방에서끼기(game, '행운의 반지', '장신구');
    봇 = await 봇켜기(admin, 두번째);
    const 맺음 = await 파티맺기(game, admin, 나, 봇);
    await verify('두 번째 플레이어 봇과 파티가 맺어진다', 맺음, true, { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 체력 물약을 사고 「상점에서 물건 구매」 「보상 받기」를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 퀘스트처음으로(game);
    const 상점 = await 상점창.열기(game);
    const 물약줄 = await 상점.줄찾기('체력 물약');
    await verify('상점에 체력 물약 줄이 있다', 물약줄 !== null, true, { blocker: true });
    const 사기전 = await 로비.hud.골드값();
    await 상점.구매누르기(물약줄 ?? 0);
    await verify('골드가 30 줄어든다', await 로비.hud.골드가될때까지(String(사기전 - 30) + ' G'), true, { blocker: true });
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트.줄찾기('상점에서 물건 구매');
    await verify('퀘스트 창에 「상점에서 물건 구매」 줄이 있다', 줄 !== null, true, { blocker: true });
    await verify('「보상 받기」 버튼이 눌린다', await 보상버튼이눌릴때까지(퀘스트, 줄 ?? 0), true, { blocker: true });
    const 전 = await 로비.hud.골드값();
    await 퀘스트.보상받기(줄 ?? 0);
    await 로비.hud.골드가될때까지(String(전 + 50) + ' G', 8_000);
    const 후 = await 로비.hud.골드값();
    await verify('장비와 파티가 있어도 퀘스트 보상을 받으면 골드가 50 만 는다', 후 - 전, 50);
  });
});
