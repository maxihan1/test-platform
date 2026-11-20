import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-536',
  name: '일일 퀘스트 창의 줄을 읽으면 일일 퀘스트 창에 퀘스트 3줄이 있고 줄마다 이름과 「보상 골드 · 경험치」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['quest:임프 30마리 처치', 'quest:던전 보스 처치', 'quest:상점에서 물건 구매'],
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
  await test.step('일일 퀘스트 창의 줄을 읽는다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 줄수 = await verify('퀘스트 줄이 3줄이다', await 퀘스트.줄수(), 3);
    const 이름 = await verify('줄마다 이름이 보인다', (await 퀘스트.줄이름들()).every((글) => 글 !== ''), true);
    const 보상 = await verify('줄마다 「보상 골드 · 경험치」 꼴 글이 보인다', (await 퀘스트.줄보상들()).every((글) => /^보상 \d+ 골드 · \d+ 경험치$/.test(글)), true);
    await verify('일일 퀘스트 창의 줄을 읽으면 일일 퀘스트 창에 퀘스트 3줄이 있고 줄마다 이름과 「보상 골드 · 경험치」가 보인다', 줄수 && 이름 && 보상, true);
  });
});
