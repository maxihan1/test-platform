import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 봇장파티만들기, 접속중인가 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-352',
  name: '파티장이 나가면 다음으로 들어온 qa_player1 이 파티장이 되어 이름 앞에 「★」가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 파티장이고 일반 회원 · 세 번째 플레이어 봇이 차례로 들어왔다'],
  elements: ['move:파티 있음→없음'],
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
  await test.step('두 · 세 번째 플레이어 봇을 켜고 두 번째 플레이어 봇의 파티에 일반 회원과 세 번째 플레이어 봇이 차례로 들어온다', async () => {
    await 로비와봇준비(game, driver, admin, 나, [봇, 봇3]);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await verify('두 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇.아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', await 접속중인가(admin, 봇3.아이디), true, { blocker: true });
    await verify('두 번째 플레이어 봇이 파티장이고 일반 회원 · 세 번째 플레이어 봇이 차례로 들어왔다', await 봇장파티만들기(game, admin, 나, 봇, [봇3]), true, { blocker: true });
  });
  await test.step('두 번째 플레이어 봇이 파티를 나간다', async () => {
    await 봇시키기(admin, 봇.아이디, 'party_leave');
    const 창 = await 친구파티창.열기(game);
    await 창.파티머리가될때까지('파티 2/4');
    const 장줄 = await 창.글있는줄('★');
    await verify('파티장이 나가면 다음으로 들어온 qa_player1 이 파티장이 되어 이름 앞에 「★」가 보인다', 장줄?.startsWith(`★ ${나.아이디}`) ?? false, true);
  });
});
