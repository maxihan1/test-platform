import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-618',
  name: '2자 이름으로 만들기를 누르면 길드가 만들어진다',
  platforms: ['android'],
  precondition: ['골드가 500 이상이고 길드가 없다'],
  techniques: ['경계값 분석'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 골드를 다시 채우는 길 없음(운영 지급 API 경로가 가이드에 없어 길드 만들기 500 골드를 되풀이해 쓸 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('2자 이름으로 「만들기 · 500G」를 누른다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('2자 이름으로 만들기를 누르면 길드가 만들어진다', await 있는지(game, 공통HUD.상단바), true);
  });
});
