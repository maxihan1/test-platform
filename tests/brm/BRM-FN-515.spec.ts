import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-515',
  name: '채팅이 없으면 채팅 띠에 「눌러서 채팅하기」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  held: '보류 — 채팅 없는 상태를 못 만듦(로그인하자마자 접속 알림 줄이 채팅에 들어오고 비우는 길이 없다)',
  elements: ['state:채팅=없음'],
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
  await test.step('채팅 없이 채팅 띠를 읽는다', async () => {
    await 로비로(game, driver, 나);
    const 로비 = await 로비화면.열기(game);
    await verify('채팅이 없으면 채팅 띠에 「눌러서 채팅하기」가 보인다', await 로비.hud.채팅띠읽기(), '눌러서 채팅하기');
  });
});
