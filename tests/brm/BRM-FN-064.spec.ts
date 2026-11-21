import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색뗀글 } from './components/hud.component.js';
import { 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 로그인하기, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇기록기다리기, 봇모두끄기, 봇줄글, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-064',
  name: '일반 회원이 접속하면 두 번째 플레이어의 채팅에 「[알림] qa_player1 님이 접속했습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어가 봇으로 로비에 접속해 있다'],
  elements: ['state:장소=로비'],
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
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 계정 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  await test.step('두 번째 플레이어 봇을 켜고 로그인 화면을 연다', async () => {
    await 봇켜기(admin, 두번째);
    await 봇기록(admin, 두번째.아이디, true);
    await 로그인화면준비(game, driver);
    const 접속 = await 접속자(admin);
    await verify('두 번째 플레이어가 로비에 접속해 있다', 접속.players.some((x) => x.user === 두번째.아이디), true, { blocker: true });
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('일반 회원 계정으로 로그인한다', async () => {
    await 로그인하기(game, driver, 나);
    const 줄 = await 봇기록기다리기(admin, 두번째.아이디, (x) => 색뗀글(봇줄글(x)).includes(`${나.아이디} 님이 접속했습니다`), 20_000);
    const 알림 = await verify('두 번째 플레이어의 채팅에 알림이 뜬다', 줄 !== null, true);
    const 채팅 = await verify('알림이 채팅 줄로 온다', 줄?.type, 'chat');
    await verify('일반 회원이 접속하면 두 번째 플레이어의 채팅에 「[알림] qa_player1 님이 접속했습니다」가 뜬다', 알림 && 채팅, true);
  });
});
