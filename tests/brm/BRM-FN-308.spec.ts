import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비준비, 태그뗀글 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기 } from './helpers/game-state.helper.js';
import { 채팅창 } from './pages/chat.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-308',
  name: '앞뒤 공백을 붙인 100자 글을 보내면 공백을 자른 100자가 그대로 채팅 줄에 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '두 번째 플레이어가 봇으로 접속해 있다'],
  techniques: ['경계값 분석'],
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
  await test.step('일반 회원으로 로비에 들어가고 두 번째 플레이어 봇을 켠다', async () => {
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
    await 봇켜기(admin, 두번째);
  });
  await test.step('두 번째 플레이어 봇이 「전체」로 앞뒤에 공백을 붙인 100자 글을 보낸다', async () => {
    const 글 = `qa308${'a'.repeat(95)}`;
    const 채팅 = await 채팅창.열기(game);
    await 채팅.탭누르기('전체');
    await 봇시키기(admin, 두번째.아이디, `say:  ${글}  `);
    await 채팅.글줄뜸('qa308', 20_000);
    const 보인글 = 태그뗀글(await 채팅.글있는줄원문('qa308'));
    await verify('앞뒤 공백을 붙인 100자 글을 보내면 공백을 자른 100자가 그대로 채팅 줄에 보인다', 보인글, `[전체] ${두번째.아이디}: ${글}`);
  });
});
