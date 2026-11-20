import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기, 적모두처치, 체력맞추기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-131',
  name: '체력이 1,150 인 탱커가 체력 물약을 쓰면 체력이 기본 체력 위로 가지 않아 「/gm stat」 체력이 「1200/1200」이다',
  platforms: ['android'],
  precondition: ['일반 회원이 혼자 던전에 들어와 있다', '일반 회원이 두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  elements: ['class:탱커', 'item:체력 물약', 'move:생존 살아 있음→쓰러짐'],
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
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await 적모두처치(game);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm hp 1150」 뒤 「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 체력맞추기(game, 1150);
    await 던전.hud.물약누르기();
    await verify('체력 물약 사용 알림이 뜬다', await 던전.hud.알림뜸('체력 물약 사용'), true, { blocker: true });
    const 상태 = await GM상태(game);
    await verify('체력이 1,150 인 탱커가 체력 물약을 쓰면 체력이 기본 체력 위로 가지 않아 「/gm stat」 체력이 「1200/1200」이다', 상태['체력'], '1200/1200');
  });
  await test.step('「/gm faint」 뒤 「/gm stat」 셋째 줄의 체력을 읽는다', async () => {
    await 쓰러뜨리기(game);
    const 상태 = await GM상태(game);
    await verify('「/gm stat」 체력이 0 아래로 가지 않아 「0/1200」이다', 상태['체력'], '0/1200');
  });
});
