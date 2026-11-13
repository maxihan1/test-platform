import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 있는지 } from './helpers/find.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-471',
  name: '저장에 실패하면 다음 10초 주기에 다시 저장한다',
  platforms: ['android'],
  precondition: ['게임 API 저장이 한 번 실패한다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
  held: '보류 — 게임 API 실패를 만드는 길 없음(게임 서버 응답은 모킹할 수 없다)',
});

test(spec, async ({ game, params }) => {
  await test.step('골드를 바꾸고 다음 저장 주기를 기다린다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('저장에 실패하면 다음 10초 주기에 다시 저장한다', await 있는지(game, 공통HUD.상단바), true);
  });
});
