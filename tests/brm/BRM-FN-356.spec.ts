import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창 } from './components/invite.component.js';
import { 로비와봇준비, 접속중인가, 초대안내가될때까지, 초대창하나뿐인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-356',
  name: '새 파티 초대가 오면 앞 초대 창이 사라지고 「qa_player3 님이 파티에 초대했습니다」 창 하나만 남는다',
  platforms: ['android'],
  precondition: ['두 · 세 번째 플레이어가 봇으로 접속해 있다'],
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
  await test.step('두 · 세 번째 플레이어 봇을 켜고 일반 회원으로 로비에 들어간다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇, 봇3]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇3.아이디), true, { blocker: true });
  });
  await test.step('두 봇이 차례로 일반 회원을 파티에 초대한다', async () => {
    const 초대 = new 초대창(game);
    await 봇시키기(admin, 봇.아이디, `party_invite:${나.아이디}`);
    await 초대.뜰때까지('파티 초대');
    await 봇시키기(admin, 봇3.아이디, `party_invite:${나.아이디}`);
    const 바뀜 = await 초대안내가될때까지(game, '파티 초대', `${봇3.아이디} 님이 파티에 초대했습니다`);
    const 안내 = await verify('「파티 초대」 창 안내 글이 「qa_player3 님이 파티에 초대했습니다」다', 바뀜 ? await 초대.안내('파티 초대') : null, `${봇3.아이디} 님이 파티에 초대했습니다`);
    const 하나 = await verify('「파티 초대」 창이 하나만 남는다', await 초대창하나뿐인가(game, '파티 초대'), true);
    await verify('새 파티 초대가 오면 앞 초대 창이 사라지고 「qa_player3 님이 파티에 초대했습니다」 창 하나만 남는다', 안내 && 하나, true);
  });
});
