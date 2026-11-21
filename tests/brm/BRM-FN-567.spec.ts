import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-567',
  name: '함께 던전에 들어온 동료 「qa_player2」는 파티 초상화에 직업 방패 · 이름 · 체력 막대로 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
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
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
  });
  let 봇 = '';
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    봇 = await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('파티 초상화를 본다', async () => {
    const 던전 = await 던전화면.열기(game);
    const 방패 = await verify('「qa_player2」의 직업 방패가 보인다', await 던전.보임(던전화면.동료직업방패), true);
    const 이름 = await verify('파티 초상화에 「qa_player2」가 보인다', await 던전.동료이름(), 봇);
    const 체력 = await verify('「qa_player2」의 체력 막대가 보인다', await 던전.보임(던전화면.동료체력막대), true);
    await verify('함께 던전에 들어온 동료 「qa_player2」는 파티 초상화에 직업 방패 · 이름 · 체력 막대로 보인다', 방패 && 이름 && 체력, true);
  });
});
