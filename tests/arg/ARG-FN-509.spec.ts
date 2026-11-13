import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-509',
  name: '퀘스트 보상을 받으면 일일 퀘스트 보상 경험치에는 보정이 없다',
  platforms: ['android'],
  precondition: ['「현자의 목걸이」를 장착하고 퀘스트 목표를 채웠다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 하루 첫 진행 상태를 만드는 길 없음(날짜가 지나야 진행이 0 으로 돌아간다)',
});

test(spec, async ({ game, params }) => {
  await test.step('퀘스트 보상을 받는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('퀘스트 보상을 받으면 일일 퀘스트 보상 경험치에는 보정이 없다', await 있는지(game, 공통HUD.상단바), true);
  });
});
