import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 봇간초대, 봇이받음, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-625',
  name: '다른 파티에 있는 사람을 초대하면 「qa_player2 님은 이미 파티에 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 · 세 번째 플레이어 봇이 2명 파티다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 봇 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 봇3 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 쓴 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 봇);
    await 계정되돌리기(admin, 봇3);
  });
  await test.step('두 · 세 번째 플레이어 봇을 켜고 둘이 2명 파티를 만든 뒤 일반 회원으로 로비에 들어간다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇, 봇3]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇3.아이디), true, { blocker: true });
    await 봇간초대(admin, 봇3, 봇, '파티');
    await verify('두 · 세 번째 플레이어 봇이 2명 파티다', await 봇이받음(admin, 봇3.아이디, 'toast', '들어왔습니다', 3_000), true, { blocker: true });
  });
  await test.step('「qa_player2」에게 「파티 초대」를 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.이름넣기(봇.아이디);
    await 창.파티초대누르기();
    await verify('다른 파티에 있는 사람을 초대하면 「qa_player2 님은 이미 파티에 있습니다」가 뜬다', await 창.hud.알림뜸(`${봇.아이디} 님은 이미 파티에 있습니다`), true);
  });
});
