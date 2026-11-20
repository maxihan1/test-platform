import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 초대창 } from './components/invite.component.js';
import { 로비와봇준비, 접속중인가, 초대버튼글 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-326',
  name: '친구 신청을 받으면 「친구 신청」 창에 「qa_player2 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
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
  await test.step('봇에게 일반 회원 친구 신청을 시킨다', async () => {
    await 봇시키기(admin, 봇.아이디, `friend_add:${나.아이디}`);
    const 초대 = new 초대창(game);
    const 떴다 = await 초대.뜰때까지('친구 신청');
    const 안내 = await verify('「친구 신청」 창 안내 글이 「qa_player2 님이 친구 신청을 했습니다」다', 떴다 ? await 초대.안내('친구 신청') : null, `${봇.아이디} 님이 친구 신청을 했습니다`);
    const 수락 = await verify('「수락」 버튼이 보인다', 떴다 ? await 초대버튼글(game, '친구 신청', '수락') : null, '수락');
    const 거절 = await verify('「거절」 버튼이 보인다', 떴다 ? await 초대버튼글(game, '친구 신청', '거절') : null, '거절');
    await verify('친구 신청을 받으면 「친구 신청」 창에 「qa_player2 님이 친구 신청을 했습니다」와 「수락」 · 「거절」이 보인다', 안내 && 수락 && 거절, true);
  });
});
