import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비, 봇이받음 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇기록, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-306',
  name: '「길드」로 보내면 접속 중인 같은 길드원 봇이 그 채팅을 받는다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 플레이어 봇이 한 길드다'],
  elements: ['state:길드=길드장'],
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
  await test.step('일반 회원이 만든 길드에 두 번째 플레이어 봇을 들이고 로비에 들어간다', async () => {
    await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa306채팅', 들어옴: [봇] });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    const 길드 = await 길드창.열기(game);
    await verify('일반 회원과 두 번째 플레이어 봇이 한 길드다', await 길드.머리가될때까지('길드원 2명'), true, { blocker: true });
  });
  await test.step('「길드」 탭에서 「qa 길드 235」를 보낸다', async () => {
    await 봇기록(admin, 봇.아이디, true);
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('길드');
    await 채팅.보내기('qa 길드 235');
    await verify('「길드」로 보내면 접속 중인 같은 길드원 봇이 그 채팅을 받는다', await 봇이받음(admin, 봇.아이디, 'chat', 'qa 길드 235'), true);
  });
});
