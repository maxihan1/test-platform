import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 길드미리만들기, 로비준비 } from './helpers/social-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 길드창 } from './pages/guild.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-395',
  name: '길드 창을 열면 길드 창 위쪽에 「「qa310」 · 길드원 2명」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원이 길드 「qa310」의 길드장이고 두 번째 플레이어 봇이 길드원이다'],
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
    await verify('일반 회원이 길드 「qa310」의 길드장이고 두 번째 플레이어 봇이 길드원이다', await 길드미리만들기(admin, 나, { 장: 나, 이름: 'qa310', 들어옴: [봇] }), true, { blocker: true });
    await 로비준비(game, driver, 나);
    await verify('일반 회원이 로비에 있다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('길드 창을 연다', async () => {
    const 길드 = await 길드창.열기(game);
    await 길드.머리가될때까지('길드원 2명');
    await verify('길드 창을 열면 길드 창 위쪽에 「「qa310」 · 길드원 2명」이 보인다', await 길드.머리줄(), '「qa310」 · 길드원 2명');
  });
});
