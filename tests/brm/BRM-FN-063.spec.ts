import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 메뉴글이될때까지 } from './helpers/login-tools.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 우편보내기, 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-063',
  name: '안 읽은 우편이 한 통인 계정으로 로그인하면 메뉴에 「우편 1」이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어에게 안 읽은 우편이 한 통 있다'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 둘째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 둘째);
  });
  await test.step('두 번째 플레이어에게 안 읽은 우편 한 통을 보낸다', async () => {
    await 계정되돌리기(admin, 둘째);
    const 대상 = await 캐릭터(admin, 둘째.아이디);
    const 지급번호 = await 우편보내기(admin, 대상.id, { 제목: '[QA] 안 읽은 우편', 골드: 10 });
    await verify('두 번째 플레이어에게 안 읽은 우편이 한 통 있다', 지급번호 > 0, true, { blocker: true });
  });
  await test.step('두 번째 플레이어 계정으로 로그인한다', async () => {
    await 로그인하기(game, driver, 둘째);
    await 메뉴글이될때까지(game, '우편', '우편 1');
    await verify('안 읽은 우편이 한 통인 계정으로 로그인하면 메뉴에 「우편 1」이 보인다', await new 공통HUD(game).메뉴글('우편'), '우편 1');
  });
});
