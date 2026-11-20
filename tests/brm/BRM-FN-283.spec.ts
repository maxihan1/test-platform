import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-283',
  name: '일일 퀘스트 창을 열면 일일 퀘스트 창에는 「임프 30마리 처치」 · 「던전 보스 처치」 · 「상점에서 물건 구매」 3종이 늘 같은 차례로 보인다',
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
  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 처음 = await verify('일일 퀘스트 창에 임프 30마리 처치 · 던전 보스 처치 · 상점에서 물건 구매 순서로 보인다', (await 퀘스트.줄이름들()).join(' · '), '임프 30마리 처치 · 던전 보스 처치 · 상점에서 물건 구매');
    await 퀘스트.닫기();
    await 퀘스트.닫힐때까지();
    const 다시 = await 퀘스트창.열기(game);
    const 같은차례 = await verify('다시 열어도 같은 차례로 보인다', (await 다시.줄이름들()).join(' · '), '임프 30마리 처치 · 던전 보스 처치 · 상점에서 물건 구매');
    await verify('일일 퀘스트 창을 열면 일일 퀘스트 창에는 「임프 30마리 처치」 · 「던전 보스 처치」 · 「상점에서 물건 구매」 3종이 늘 같은 차례로 보인다', 처음 && 같은차례, true);
  });
});
