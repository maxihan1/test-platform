import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 왼쪽아래인가 } from './helpers/screen-check.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-538',
  name: '우편함 창을 열면 우편함 창 왼쪽 아래에 「모두 받기」 버튼이 보인다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  await test.step('우편함 창을 연다', async () => {
    await 우편함창.열기(game);
    const 보임 = await verify('「모두 받기」 버튼이 보인다', (await game.find(우편함창.모두받기버튼)) !== null, true);
    const 왼쪽아래 = await verify('「모두 받기」 버튼이 우편함 창 왼쪽 아래에 있다', await 왼쪽아래인가(game, 우편함창.모두받기버튼, 우편함창.패널), true);
    await verify('우편함 창을 열면 우편함 창 왼쪽 아래에 「모두 받기」 버튼이 보인다', 보임 && 왼쪽아래, true);
  });
});
