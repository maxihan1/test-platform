import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-165',
  name: '일일 퀘스트 창에 「임프 30마리 처치」 · 「던전 보스 처치」 · 「상점에서 물건 구매」 3줄이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['quest:kill_imps', 'quest:kill_boss', 'quest:shop_buy'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    퀘스트들: z.string().describe('퀘스트 줄 이름 차례').default('임프 30마리 처치 · 던전 보스 처치 · 상점에서 물건 구매'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('일일 퀘스트 창에 「임프 30마리 처치」 · 「던전 보스 처치」 · 「상점에서 물건 구매」 3줄이 보인다', (await 퀘스트.이름들()).join(' · '), expected.퀘스트들);
  });
});
