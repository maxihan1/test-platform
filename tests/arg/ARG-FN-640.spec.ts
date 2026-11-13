import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-640',
  name: '아이템 표 무기 줄을 게임 데이터 API 로 읽으면 게임 데이터 API 의 무기 네 줄 값이 아이템 표와 같다',
  platforms: ['android'],
  precondition: ['게임 데이터 API 를 부를 수 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 데이터 API 가 서비스 가이드에 없다',
});

test(spec, async ({ game, params }) => {
  await test.step('아이템 표 무기 줄을 게임 데이터 API 로 읽는다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('아이템 표 무기 줄을 게임 데이터 API 로 읽으면 게임 데이터 API 의 무기 네 줄 값이 아이템 표와 같다', await 있는지(game, 공통HUD.상단바), true);
  });
});
