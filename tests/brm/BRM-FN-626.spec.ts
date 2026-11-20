import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 초대창 } from './components/invite.component.js';
import { 로비와봇준비, 접속이사라질때까지, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 접속끊기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-626',
  name: '초대한 사람이 나간 뒤 수락하면 「초대한 사람이 나갔습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 일반 회원을 파티에 초대했다'],
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
  await test.step('두 번째 플레이어 봇을 켜고 일반 회원을 파티에 초대하게 한다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await 봇시키기(admin, 봇.아이디, `party_invite:${나.아이디}`);
    await verify('두 번째 플레이어 봇이 일반 회원을 파티에 초대했다', await new 초대창(game).뜰때까지('파티 초대'), true, { blocker: true });
  });
  await test.step('봇이 접속을 끊은 뒤 「파티 초대」 창의 「수락」을 누른다', async () => {
    await 접속끊기(admin, 봇.아이디);
    await 접속이사라질때까지(admin, 봇.아이디);
    await new 초대창(game).수락('파티 초대');
    await verify('초대한 사람이 나간 뒤 수락하면 「초대한 사람이 나갔습니다」가 뜬다', await new 공통HUD(game).알림뜸('초대한 사람이 나갔습니다'), true);
  });
});
