import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 우편글색, 우편숫자, 우편숫자기다리기, 캐릭터번호 } from './helpers/mail-notice.helper.js';
import { 빨강인가 } from './helpers/screen-check.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 우편지급 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-063',
  name: '안 읽은 우편이 한 통 있는 계정으로 로그인하면 메뉴 우편 버튼에 빨간 숫자 「1」이 붙는다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어 우편함에 안 읽은 우편이 한 통 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 둘째아이디 = params.p2Id ?? '';
  const 둘째비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base'));

  await test.step('두 번째 플레이어 우편함에 우편 한 통을 지급한다', async () => {
    const 번호 = await 우편지급(admin, await 캐릭터번호(admin, 둘째아이디), { 제목: '[QA] 안 읽은 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] });
    await verify('우편이 지급됐다', 번호 > 0, true, { blocker: true });
  });

  await test.step('두 번째 플레이어로 로그인한다', async () => {
    const 접속 = await 로그인하기(game, 둘째아이디, 둘째비밀번호);
    await verify('로비 화면이 열린다', 접속 !== null, true, { blocker: true });
    const 로비 = await 로비화면.열림(game);
    await 로비.hud.그려질때까지();
    await 우편숫자기다리기(로비.hud, 1, 20_000);
    const 숫자 = await verify('메뉴 우편 버튼에 숫자 「1」이 붙는다', await 우편숫자(로비.hud), 1);
    const 빨강 = await verify('메뉴 우편 버튼 숫자가 빨간색이다', 빨강인가(await 우편글색(로비.hud)), true);
    await verify('안 읽은 우편이 한 통 있는 계정으로 로그인하면 메뉴 우편 버튼에 빨간 숫자 「1」이 붙는다', 숫자 && 빨강, true);
  });
});
