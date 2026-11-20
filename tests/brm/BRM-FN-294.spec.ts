import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 사기, 알림글읽기 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 퀘스트처음으로 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-294',
  name: '「/gm quest reset」 뒤 체력 물약을 사면 목표를 채우는 순간 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['quest:상점에서 물건 구매', 'flow:골드-상점 구매', 'item:체력 물약', 'shop:체력 물약', 'flow:골드-상점 구매'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('상단 바에 「Lv.1」이 보인다', (await hud.레벨글()).startsWith('Lv.1 '), true, { blocker: true });
  });
  await test.step('「/gm quest reset」 뒤 체력 물약을 산다', async () => {
    await 퀘스트처음으로(game);
    await 사기(game, '체력 물약');
    await verify('「/gm quest reset」 뒤 체력 물약을 사면 목표를 채우는 순간 「퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요」 알림이 뜬다', await 알림글읽기(game, '퀘스트 완료'), '퀘스트 완료: 상점에서 물건 구매 — 퀘스트 창에서 보상을 받으세요');
  });
});
