import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편숫자사라질때까지, 우편지급하고창열기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편함창 } from './pages/mailbox.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-539',
  name: '「받기」가 끝나면 메뉴 우편 버튼의 숫자가 사라져 「우편」으로 다시 그려진다',
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

  const 제목 = '[QA] 지우고 다시 그릴 우편';
  await test.step('첨부 있는 우편 하나를 지급하고 「받기」를 누른다', async () => {
    const hud = new 공통HUD(game);
    const { 창 } = await 우편지급하고창열기(game, admin, 아이디, [{ 제목, 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 1);
    const 번호 = await 창.줄찾기(제목);
    await verify('우편함 창에 지급한 우편 줄이 보인다', 번호 >= 0, true, { blocker: true });
    await 창.받기누르기(번호);
    const 사라짐 = await verify('메뉴 우편 버튼의 숫자가 사라진다', await 우편숫자사라질때까지(hud), true);
    const 글 = await verify('메뉴 우편 버튼이 「우편」으로 다시 그려진다', 색글떼기(await hud.메뉴글('우편')), '우편');
    await verify('「받기」가 끝나면 메뉴 우편 버튼의 숫자가 사라져 「우편」으로 다시 그려진다', 사라짐 && 글, true);
  });

  await test.step('첨부 없는 우편 줄의 「삭제」를 누른다', async () => {
    const 창 = await 우편함창.열기(game);
    await 창.삭제누르기(await 창.줄찾기(제목));
    await verify('「삭제」가 끝난 뒤 우편 목록이 그 우편 없이 다시 그려진다', await 창.제목사라질때까지(제목, 10_000), true);
  });
});
