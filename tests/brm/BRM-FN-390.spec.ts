import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비, 봇이받음 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-390',
  name: '길드장이 「추방」을 누르면 그 사람이 길드원 목록에서 빠지고 남은 봇에게 「qa_player2 님이 길드를 떠났습니다」 알림이 간다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 · 세 번째 플레이어 봇이 길드원이다'],
  elements: ['move:길드 길드원→없음'],
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
  await test.step('길드를 만든 일반 회원의 길드에 두 · 세 번째 플레이어 봇이 길드원으로 들어가고 일반 회원이 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이고 두 · 세 번째 플레이어 봇이 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa390', 들어옴: [봇, 봇3] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('두 번째 플레이어 봇 줄의 「추방」을 누른다', async () => {
    await 봇기록(admin, 봇3.아이디, true);
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 3명');
    const 줄 = await 길드.길드원줄번호(봇.아이디);
    await 길드.추방누르기(줄 ?? 1);
    const 빠짐 = await verify('추방한 사람이 길드원 목록에서 빠진다', await 길드.글줄사라질때까지(봇.아이디), true);
    const 알림 = await verify('남은 봇에게 「qa_player2 님이 길드를 떠났습니다」 알림이 간다', await 봇이받음(admin, 봇3.아이디, 'toast', `${봇.아이디} 님이 길드를 떠났습니다`), true);
    await verify('길드장이 「추방」을 누르면 그 사람이 길드원 목록에서 빠지고 남은 봇에게 「qa_player2 님이 길드를 떠났습니다」 알림이 간다', 빠짐 && 알림, true);
  });
});
