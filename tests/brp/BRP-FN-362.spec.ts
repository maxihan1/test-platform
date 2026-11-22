import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇파티맺기, 소셜정리, 알림글 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 친구파티창 } from './pages/friends.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-362',
  name: '상대가 이미 다른 파티에 있으면 「님은 이미 파티에 있습니다」가 상대 이름과 함께 뜬다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어가 세 번째 플레이어와 파티이고 일반 회원은 파티가 없다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 내아이디 = params.userId ?? '';
  const 내비밀번호 = params.userPassword ?? '';
  const 둘아이디 = params.p2Id ?? '';
  const 둘비밀번호 = params.p2Password ?? '';
  const 셋아이디 = params.p3Id ?? '';
  const 셋비밀번호 = params.p3Password ?? '';
  await test.cleanup('봇을 끄고 계정을 기준 상태로 되돌리기', () => 소셜정리(admin, [{ 아이디: 내아이디, 비밀번호: 내비밀번호 }, { 아이디: 둘아이디, 비밀번호: 둘비밀번호 }, { 아이디: 셋아이디, 비밀번호: 셋비밀번호 }]));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 내아이디, 내비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('두 번째 플레이어 · 세 번째 플레이어 봇이 접속한 것을 확인한다', async () => {
    await 봇켜기(admin, 둘아이디, 둘비밀번호);
    await 봇켜기(admin, 셋아이디, 셋비밀번호);
    const 접속봇 = (await 접속상태(admin)).bots;
    await verify('두 번째 플레이어 봇이 접속해 있다', 접속봇.includes(둘아이디), true, { blocker: true });
    await verify('세 번째 플레이어 봇이 접속해 있다', 접속봇.includes(셋아이디), true, { blocker: true });
  });

  await test.step('두 번째 플레이어가 세 번째 플레이어와 파티인 것을 확인한다', async () => {
    await verify('두 번째 · 세 번째 플레이어가 파티다', await 봇파티맺기(admin, 둘아이디, 셋아이디), true, { blocker: true });
  });

  await test.step('두 번째 플레이어 이름을 넣고 「파티 초대」를 누른다', async () => {
    const 창 = await 친구파티창.열기(game);
    await 창.파티초대(둘아이디);
    const 알림 = await 알림글(game, '님은 이미 파티에 있습니다');
    const 조각보임 = await verify('「님은 이미 파티에 있습니다」 알림이 보인다', 알림 !== null, true);
    const 이름보임 = await verify('알림에 상대 이름이 있다', 알림 !== null && 알림.includes(둘아이디), true);
    await verify('상대가 이미 다른 파티에 있으면 「님은 이미 파티에 있습니다」가 상대 이름과 함께 뜬다', 조각보임 && 이름보임, true);
  });
});
