import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이초대하기, 소셜정리, 초대글기다리기 } from './helpers/social.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 봇켜기, 접속상태 } from './helpers/game-state.helper.js';
import { 초대창 } from './pages/invite.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-350',
  name: '새 파티 초대가 오면 앞의 초대가 사라져 먼저 온 초대를 수락할 수 없다',
  platforms: ['windows'],
  precondition: ['일반 회원이 두 번째 · 세 번째 플레이어 봇과 파티 없이 접속해 있다'],
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

  await test.step('두 번째 플레이어와 세 번째 플레이어가 차례로 파티 초대를 보내고 첫 초대를 수락하려 한다', async () => {
    await 봇이초대하기(admin, 'party', 둘아이디, 내아이디);
    const 초대 = await 초대창.뜰때까지(game);
    await verify('초대 창이 뜬다', 초대 !== null, true, { blocker: true });
    await 봇이초대하기(admin, 'party', 셋아이디, 내아이디);
    const 글 = 초대 === null ? null : await 초대글기다리기(초대, '님이 파티에 초대했습니다', 셋아이디);
    const 셋초대 = await verify('초대 창에 세 번째 플레이어 초대가 보인다', 글 !== null, true);
    const 앞초대없음 = await verify('초대 창 글에 먼저 온 두 번째 플레이어 이름이 없다', 글 !== null && !글.includes(둘아이디), true);
    await verify('새 파티 초대가 오면 앞의 초대가 사라져 먼저 온 초대를 수락할 수 없다', 셋초대 && 앞초대없음, true);
  });
});
