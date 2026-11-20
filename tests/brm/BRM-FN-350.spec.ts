import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 접속중인가, 파티에초대해맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-350',
  name: '「qa_player2」를 파티에 초대하고 봇이 수락하면 처음 초대한 일반 회원이 파티장이다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
  elements: ['move:파티 없음→있음'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
  });
  await test.step('두 번째 플레이어 봇을 켜고 일반 회원으로 로비에 들어간다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
  });
  await test.step('「qa_player2」를 파티에 초대하고 봇이 수락한다', async () => {
    const 맺음 = await 파티에초대해맺기(game, admin, 나, 봇);
    const 창 = await 친구파티창.열기(game);
    const 장줄 = 맺음 ? await 창.글있는줄('★') : null;
    await verify('「qa_player2」를 파티에 초대하고 봇이 수락하면 처음 초대한 일반 회원이 파티장이다', 장줄?.startsWith(`★ ${나.아이디}`) ?? false, true);
  });
});
