import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편글색, 우편숫자, 우편지급하고기다리기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 빨강인가 } from './helpers/screen-check.helper.js';
import { 색글떼기 } from './helpers/gm.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-244',
  name: '안 읽었거나 첨부가 남은 우편이 둘이면 메뉴 버튼이 「우편」 뒤에 빨간 숫자 「2」를 붙여 보인다',
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

  await test.step('[QA] 우편 둘을 지급하고 메뉴 우편 버튼을 읽는다', async () => {
    const hud = new 공통HUD(game);
    const 도착 = await 우편지급하고기다리기(admin, hud, 아이디, [{ 제목: '[QA] 첫째 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] }, { 제목: '[QA] 둘째 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] }], 2);
    await verify('우편 둘이 도착했다', 도착.도착, true, { blocker: true });
    const 글머리 = await verify('메뉴 버튼이 「우편」으로 시작한다', 색글떼기(await hud.메뉴글('우편')).startsWith('우편'), true);
    const 숫자 = await verify('메뉴 버튼 숫자가 「2」다', await 우편숫자(hud), 2);
    const 빨강 = await verify('메뉴 버튼 숫자가 빨간색이다', 빨강인가(await 우편글색(hud)), true);
    await verify('안 읽었거나 첨부가 남은 우편이 둘이면 메뉴 버튼이 「우편」 뒤에 빨간 숫자 「2」를 붙여 보인다', 글머리 && 숫자 && 빨강, true);
  });
});
