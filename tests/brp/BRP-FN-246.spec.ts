import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 우편지급하고기다리기, 우편함로그인 } from './helpers/mail-notice.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-246',
  name: '접속 중에 우편을 지급하면 40초 안에 메뉴 우편 버튼에 숫자가 붙는다',
  platforms: ['windows'],
  precondition: ['두 번째 플레이어로 로그인해 로비에 있고 우편함을 기준 상태로 비워 두었다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    한도초: z.number().describe('메뉴 숫자가 붙는 한도(초)').default(40),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.p2Id ?? '';
  const 비밀번호 = params.p2Password ?? '';
  await test.cleanup('두 번째 플레이어를 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('두 번째 플레이어로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 상태 = await 우편함로그인(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 상태.접속, true, { blocker: true });
    await verify('메뉴 우편 버튼에 숫자가 없다', 상태.비었음, true, { blocker: true });
  });

  await test.step('접속한 채 운영 API 로 우편을 지급하고 메뉴 숫자를 기다린다', async () => {
    const 시작 = Date.now();
    const 결과 = await 우편지급하고기다리기(admin, new 공통HUD(game), 아이디, { 제목: '[QA] 접속 중 지급 우편', 아이템: [{ itemName: '체력 물약', quantity: 1 }] }, 1, 60_000);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 붙음 = await verify('메뉴 우편 버튼에 숫자가 붙는다', 결과.도착, true);
    const 시간 = await verify('한도 안에 숫자가 붙는다', 걸린초 <= expected.한도초, true);
    await verify('접속 중에 우편을 지급하면 40초 안에 메뉴 우편 버튼에 숫자가 붙는다', 붙음 && 시간, true);
  });
});
