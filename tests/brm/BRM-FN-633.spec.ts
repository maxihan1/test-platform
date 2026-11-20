import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비, 봇길드만들기, 봇들켜기 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-633',
  name: '이미 다른 길드에 있는 사람을 초대하면 「qa_player2 님은 이미 길드에 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 번째 플레이어 봇은 다른 길드에 있다'],
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
  await test.step('일반 회원과 두 번째 플레이어 봇이 각자 길드를 만들고 일반 회원이 로비에 들어간다', async () => {
    const 내길드 = await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa633나', 들어옴: [] });
    await 봇들켜기(admin, [봇]);
    const 봇길드 = await 봇길드만들기(admin, 봇, 'qa633봇');
    await verify('일반 회원이 길드장이고 두 번째 플레이어 봇은 다른 길드에 있다', 내길드 && 봇길드, true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「qa_player2」를 길드에 초대한다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.초대하기(봇.아이디);
    await verify('이미 다른 길드에 있는 사람을 초대하면 「qa_player2 님은 이미 길드에 있습니다」가 뜬다', await 길드.hud.알림뜸(`${봇.아이디} 님은 이미 길드에 있습니다`), true);
  });
});
