import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창 } from './components/invite.component.js';
import { 로비준비, 봇길드만들기, 봇들켜기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-384',
  name: '길드 초대를 받으면 「길드 초대」 창에 「qa_player2 님이 길드 「qa301」에 초대했습니다」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드 「qa301」의 길드장이다'],
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
  await test.step('두 번째 플레이어 봇이 길드 「qa301」을 만들고 일반 회원이 로비에 들어간다', async () => {
    await 봇들켜기(admin, [봇]);
    await verify('두 번째 플레이어 봇이 길드 「qa301」의 길드장이다', await 봇길드만들기(admin, 봇, 'qa301'), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('봇에게 일반 회원 길드 초대를 시킨다', async () => {
    await 봇시키기(admin, 봇.아이디, `guild_invite:${나.아이디}`);
    const 초대 = new 초대창(game);
    const 떴다 = await 초대.뜰때까지('길드 초대');
    await verify('길드 초대를 받으면 「길드 초대」 창에 「qa_player2 님이 길드 「qa301」에 초대했습니다」가 보인다', 떴다 ? await 초대.안내('길드 초대') : null, `${봇.아이디} 님이 길드 「qa301」에 초대했습니다`);
  });
});
