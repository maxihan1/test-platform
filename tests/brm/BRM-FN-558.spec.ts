import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-558',
  name: '길드원 줄마다 「추방」을 보면 길드장 화면에서 「추방」은 길드장이 아닌 봇 줄에만 있다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드장이고 두 번째 플레이어 봇이 길드원이다'],
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
  await test.step('길드를 만든 일반 회원의 길드에 두 번째 플레이어 봇이 길드원으로 들어간 뒤 로비에 들어간다', async () => {
    await verify('일반 회원이 길드장이고 두 번째 플레이어 봇이 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa558', 들어옴: [봇] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('길드원 줄마다 「추방」을 본다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 2명');
    const 내줄 = (await 길드.길드원줄번호(나.아이디)) ?? 0;
    const 봇줄 = (await 길드.길드원줄번호(봇.아이디)) ?? 1;
    const 내쪽 = await verify('길드장 줄에는 「추방」이 없다', await 길드.추방버튼있나(내줄), false);
    const 봇쪽 = await verify('길드장이 아닌 봇 줄에는 「추방」이 있다', await 길드.추방버튼있나(봇줄), true);
    await verify('길드원 줄마다 「추방」을 보면 길드장 화면에서 「추방」은 길드장이 아닌 봇 줄에만 있다', 내쪽 && 봇쪽, true);
  });
});
