import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 로그인하기, 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 계정상태, 골드맞추기, 봇모두끄기, 제재걸기, 제재풀기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';
import { 안내창 } from './pages/popup.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-069',
  name: '골드를 바꾼 바로 뒤 정지로 내보내지면 정지를 풀고 다시 로그인했을 때 골드가 「300 G」로 남아 있다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어로 로비에 들어와 있다'],
  elements: ['state:장소=로비', 'state:제재=정지'],
  params: z.object({
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  let 제재번호: number | undefined;
  await test.cleanup('걸어 둔 정지 풀기 · 켜 둔 봇 끄기 · 두 번째 플레이어 기준 상태로 되돌리기', async () => {
    if (제재번호 !== undefined) await 제재풀기(admin, 제재번호);
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 두번째);
  });
  await test.step('두 번째 플레이어로 로비에 들어간다', async () => {
    await 로비로(game, driver, 두번째);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('「/gm gold 300」을 보낸 바로 뒤 운영툴로 정지한다', async () => {
    await 골드맞추기(game, 300);
    const 계정번호 = (await 계정상태(admin, 두번째.아이디)).id;
    제재번호 = await 제재걸기(admin, 계정번호, 'SUSPEND', '[QA] 자동 시험 정지');
    const 안내 = await 안내창.뜰때까지(game, 60_000);
    await verify('정지로 내보내져 안내 창이 보인다', 안내 !== null, true, { blocker: true });
  });
  await test.step('정지를 풀고 다시 로그인한다', async () => {
    await 제재풀기(admin, 제재번호 ?? 0);
    제재번호 = undefined;
    const 안내 = await 안내창.뜰때까지(game, 5_000);
    if (안내 !== null) await 안내.확인누르기();
    await 로그인화면.열기(game);
    await 로그인하기(game, driver, 두번째);
    const hud = new 공통HUD(game);
    await hud.골드가될때까지('300 G');
    await verify('골드를 바꾼 바로 뒤 정지로 내보내지면 정지를 풀고 다시 로그인했을 때 골드가 「300 G」로 남아 있다', await hud.골드글(), '300 G');
  });
});
