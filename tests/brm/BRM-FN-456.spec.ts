import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 퀘스트줄 } from './helpers/items-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-456',
  name: '일일 퀘스트 창의 세 줄 목표와 보상을 읽으면 일일 퀘스트 창의 세 줄 목표 · 보상이 퀘스트 표와 같다',
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
  await test.step('일일 퀘스트 창의 세 줄 목표와 보상을 읽는다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 읽기 = async (이름: string): Promise<string> => {
      const 줄 = await 퀘스트줄(퀘스트, 이름);
      const 보상 = /보상 (\d+) 골드 · (\d+) 경험치/.exec((await 퀘스트.줄보상(줄)) ?? '');
      const 목표 = /\/(\d+)$/.exec((await 퀘스트.줄진행(줄)) ?? '');
      return '목표 ' + (목표?.[1] ?? '?') + ' · 보상 ' + (보상?.[1] ?? '?') + ' 골드 · ' + (보상?.[2] ?? '?') + ' 경험치';
    };
    const a = await verify.element('「임프 30마리 처치」 줄 목표 · 보상이 퀘스트 표와 같다', 'quest:임프 30마리 처치', await 읽기('임프 30마리 처치'), '목표 30 · 보상 150 골드 · 200 경험치');
    const b = await verify.element('「던전 보스 처치」 줄 목표 · 보상이 퀘스트 표와 같다', 'quest:던전 보스 처치', await 읽기('던전 보스 처치'), '목표 1 · 보상 300 골드 · 400 경험치');
    const c = await verify.element('「상점에서 물건 구매」 줄 목표 · 보상이 퀘스트 표와 같다', 'quest:상점에서 물건 구매', await 읽기('상점에서 물건 구매'), '목표 1 · 보상 50 골드 · 50 경험치');
    await verify('일일 퀘스트 창의 세 줄 목표와 보상을 읽으면 일일 퀘스트 창의 세 줄 목표 · 보상이 퀘스트 표와 같다', a && b && c, true);
  });
});
