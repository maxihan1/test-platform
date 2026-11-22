import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기, 봇기록기다리기, 봇켜기, 접속상태, 줄글 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-064',
  name: '로그인하면 먼저 접속해 있던 사람의 채팅에 「님이 접속했습니다」 알림 줄이 일반 회원 이름과 함께 온다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 봇이 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  const 둘째아이디 = params.p2Id ?? '';
  const 둘째비밀번호 = params.p2Password ?? '';
  await test.cleanup('봇을 끄고 방을 로비로 돌리기', () => 로비로되돌리기(admin));

  let 봇 = '';
  await test.step('두 번째 플레이어 봇을 로비에 접속시킨다', async () => {
    봇 = await 봇켜기(admin, 둘째아이디, 둘째비밀번호);
    await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속상태(admin)).players.some((p) => p.user === 둘째아이디), true, { blocker: true });
  });

  await test.step('일반 회원으로 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 접속 !== null, true, { blocker: true });
    const 줄 = await 봇기록기다리기(admin, 봇, (한줄) => 한줄.type === 'chat' && 줄글(한줄).includes(아이디), 20_000);
    const 도착 = await verify('봇 채팅 기록에 일반 회원 이름이 든 알림 줄이 온다', 줄 !== null, true);
    const 문구 = await verify('그 알림 줄에 「님이 접속했습니다」가 들어 있다', 줄 !== null && 줄글(줄).includes('님이 접속했습니다'), true);
    await verify('로그인하면 먼저 접속해 있던 사람의 채팅에 「님이 접속했습니다」 알림 줄이 일반 회원 이름과 함께 온다', 도착 && 문구, true);
  });
});
