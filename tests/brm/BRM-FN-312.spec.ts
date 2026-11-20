import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비와봇준비, 접속중인가 } from './helpers/social-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-312',
  name: '「전체」로 보내면 채팅 줄이 「[전체] qa_player1: qa 모양 240」 꼴이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '두 번째 플레이어가 봇으로 로비에 접속해 있다'],
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
  await test.step('「전체」 탭에서 「qa 모양 240」을 보낸다', async () => {
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 채팅.보내기('qa 모양 240');
    await 채팅.글줄뜸('qa 모양 240');
    await verify('「전체」로 보내면 채팅 줄이 「[전체] qa_player1: qa 모양 240」 꼴이다', await 채팅.글있는줄('qa 모양 240'), `[전체] ${나.아이디}: qa 모양 240`);
  });
  await test.step('일반 회원이 로그인해 채팅 창을 연다', async () => {
    await 로비로(game, driver, 나);
    const 채팅 = await 채팅창.열기(game);
    const 뜸 = await 채팅.글줄뜸('님이 접속했습니다');
    const 줄 = 뜸 ? await 채팅.글있는줄('님이 접속했습니다') : null;
    await verify('시스템 줄은 「[알림] 」으로 시작한다', 줄?.startsWith('[알림] ') ?? false, true);
  });
});
