import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-639',
  name: '채팅 입력 칸에서 엔터를 치면 「보내기」와 같이 채팅 줄이 보인다',
  platforms: ['android'],
  held: '보류 — 엔터 키를 보낼 길 없음',
  precondition: ['일반 회원으로 로비에 들어와 있다'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('채팅 입력 칸에서 엔터를 친다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.글넣기('qa 엔터 452');
    await game.key('Return');
    await verify('채팅 입력 칸에서 엔터를 치면 「보내기」와 같이 채팅 줄이 보인다', await 채팅.글줄뜸('qa 엔터 452'), true);
  });
});
