import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비까지 } from './helpers/login.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-172',
  name: '목표를 못 채운 「임프 30마리 처치」의 「보상 받기」는 누를 수 없다',
  platforms: ['android'],
  precondition: ['오늘 처치한 임프가 30마리 미만이다'],
  elements: ['quest:kill_imps'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    목표: z.number().describe('임프 처치 목표 수').default(30),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('일일 퀘스트 창을 연다', async () => {
    const 퀘스트 = await 퀘스트창.열기(game);
    const 진행 = Number((await 퀘스트.진행('임프 30마리 처치')).split('/')[0]);
    await verify('「임프 30마리 처치」 진행이 목표보다 적다', 진행 < expected.목표, true, { blocker: true });
    await verify('목표를 못 채운 「임프 30마리 처치」의 「보상 받기」는 누를 수 없다', (await 퀘스트.보상받기버튼('임프 30마리 처치')).누름, false);
  });
});
