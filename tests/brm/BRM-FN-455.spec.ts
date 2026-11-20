import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 가방채우기, 사기, 장착하기, 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 퀘스트처음으로, GM상태 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-455',
  name: '「/gm quest reset」 뒤 체력 물약을 사고 「상점에서 물건 구매」 「보상 받기」를 누르면 현자의 목걸이를 끼고 퀘스트 보상을 받아도 경험치는 50 만 는다',
  platforms: ['android'],
  precondition: ['일반 회원이 현자의 목걸이를 끼고 로비에 있다'],
  elements: ['item:현자의 목걸이', 'quest:상점에서 물건 구매', 'flow:골드-상점 구매', 'flow:골드-일일 퀘스트'],
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원이 현자의 목걸이를 끼고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await 가방채우기(game, admin, 나, [{ 이름: '현자의 목걸이', 개수: 1 }]);
    await 장착하기(game, '현자의 목걸이');
    const 가방 = await 가방창.열기(game);
    await verify('장신구 칸에 「현자의 목걸이」가 있다', await 가방.칸내용('장신구'), '현자의 목걸이', { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 체력 물약을 사고 「상점에서 물건 구매」 「보상 받기」를 누른다', async () => {
    await 퀘스트처음으로(game);
    await 사기(game, '체력 물약');
    const 전 = Number((await GM상태(game))['경험치'] ?? '0');
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄 = await 퀘스트줄(퀘스트, '상점에서 물건 구매');
    await 퀘스트.줄진행이될때까지(줄, '1/1');
    await 퀘스트.보상받기(줄);
    await hud.알림뜸('보상 받음');
    const 후 = Number((await GM상태(game))['경험치'] ?? '0');
    const 스탯 = await verify('「/gm stat」 경험치가 50 늘었다', 후 - 전, 50);
    const 막대 = await verify('상단 바 경험치 글이 「50/」로 시작한다', (await hud.경험치()).startsWith('50/'), true);
    await verify('「/gm quest reset」 뒤 체력 물약을 사고 「상점에서 물건 구매」 「보상 받기」를 누르면 현자의 목걸이를 끼고 퀘스트 보상을 받아도 경험치는 50 만 는다', 스탯 && 막대, true);
  });
});
