import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 경과초 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-509',
  name: '접속한 모두가 확정하면 3초 뒤 던전 화면이 보인다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 준비를 마쳤다'],
  elements: ['move:장소 로비→던전'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    오차초: z.number().min(0).describe('걸린 시간의 허용 오차(초) — 3초와의 차이, 장면 불러오는 시간 포함, 0 이상').default(4),
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
  await test.step('두 번째 플레이어 봇이 준비를 마친다', async () => {
    await 로비로(game, driver, 나);
    봇 = await 봇켜기(admin, 두번째);
    await 봇시키기(admin, 봇, 'seat:2');
    await 봇시키기(admin, 봇, 'ready');
    const 접속 = await 접속자(admin);
    await verify('두 번째 플레이어 봇이 로비에 접속해 있다', 접속.players.some((x) => x.user === 봇), true, { blocker: true });
  });
  await test.step('일반 회원이 첫 자리를 고르고 「준비!」를 누른다', async () => {
    const 로비 = await 로비화면.열기(game);
    await 로비.자리누르기(0);
    await 로비.준비누르기();
    const 시작 = Date.now();
    const 던전 = await verify('던전 화면이 보인다', await 로비.던전으로넘어갈때까지(60_000), true);
    const 걸림 = 경과초(시작);
    const 시간 = await verify('던전 화면이 3초 뒤 보인다', Math.abs(걸림 - 3) <= params.오차초, true);
    await verify('접속한 모두가 확정하면 3초 뒤 던전 화면이 보인다', 던전 && 시간, true);
  });
});
