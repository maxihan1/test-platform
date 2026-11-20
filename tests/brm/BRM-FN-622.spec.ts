import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 친구미리맺기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friend.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-622',
  name: '이미 친구이면서 접속 중이 아닌 캐릭터에게 신청하면 앞 확인인 「이미 친구입니다」 하나만 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 친구이고 봇이 접속을 끊었다'],
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
  await test.step('두 번째 플레이어 봇과 친구를 맺은 뒤 접속을 끊고 일반 회원으로 로비에 들어간다', async () => {
    await verify('일반 회원과 두 번째 플레이어 봇이 친구이고 봇이 접속을 끊었다', await 친구미리맺기(admin, 나, [{ 계정: 봇, 오프라인: true }]), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「qa_player2」에게 「친구 신청」을 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.이름넣기(봇.아이디);
    await 창.친구신청누르기();
    const 이미 = await verify('「이미 친구입니다」가 뜬다', await 창.hud.알림뜸('이미 친구입니다'), true);
    const 접속아님 = await verify('「접속 중인 캐릭터에게만 신청할 수 있습니다」는 뜨지 않는다', await 창.hud.알림뜸('접속 중인 캐릭터에게만 신청할 수 있습니다', 2_000), false);
    await verify('이미 친구이면서 접속 중이 아닌 캐릭터에게 신청하면 앞 확인인 「이미 친구입니다」 하나만 뜬다', 이미 && 접속아님, true);
  });
});
