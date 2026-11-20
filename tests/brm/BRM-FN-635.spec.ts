import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창 } from './components/invite.component.js';
import { 공통HUD } from './components/hud.component.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-635',
  name: '그사이 다른 길드에 들어간 뒤 수락하면 「이미 길드에 들어가 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 일반 회원을 길드에 초대했다'],
  held: '보류 — 초대 창이 떠 있는 동안 다른 길드에 들어갈 길을 모름',
  elements: ['state:길드=길드원'],
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
  await test.step('일반 회원으로 로비에 들어가 길드 초대 창을 기다린다', async () => {
    await 로비로(game, driver, 나);
    await verify('길드 초대 창이 뜬다', await new 초대창(game).뜰때까지('길드 초대'), true, { blocker: true });
  });
  await test.step('그사이 일반 회원이 세 번째 플레이어 봇 길드에 들어간 뒤 앞 초대를 수락한다', async () => {
    await new 초대창(game).수락('길드 초대');
    await verify('그사이 다른 길드에 들어간 뒤 수락하면 「이미 길드에 들어가 있습니다」가 뜬다', await new 공통HUD(game).알림뜸('이미 길드에 들어가 있습니다'), true);
  });
});
