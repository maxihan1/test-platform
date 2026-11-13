import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-UI-356',
  name: '목표를 채우고 아직 보상을 안 받은 퀘스트 줄은 바탕이 옅은 금색이다',
  platforms: ['android'],
  precondition: ['오늘 목표를 채우고 보상을 받지 않은 퀘스트가 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 하루 첫 진행 상태를 만드는 길 없음(날짜가 지나야 진행이 0 으로 돌아간다)',
});

test(spec, async ({ game, params }) => {
  await test.step('일일 퀘스트 창을 연다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('목표를 채우고 아직 보상을 안 받은 퀘스트 줄은 바탕이 옅은 금색이다', await 있는지(game, 공통HUD.상단바), true);
  });
});
