import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇과함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 쓰러뜨리기, 적모두처치 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-194',
  name: '로비에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다', '일반 회원이 두 번째 플레이어 봇과 함께 던전에 들어와 있다'],
  techniques: ['동등 분할'],
  elements: ['item:체력 물약'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('가방 창에서 체력 물약 줄의 「사용」을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    const 줄 = await 가방.줄찾기('체력 물약');
    await verify('가방에 체력 물약 줄이 있다', 줄 !== null, true, { blocker: true });
    await 가방.줄버튼누르기(줄 ?? 0, '사용');
    await verify('로비에서 체력 물약을 쓰면 「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다', await 가방.hud.알림뜸('던전에서 살아 있을 때만 쓸 수 있습니다'), true);
    await 가방.닫기();
    await 가방.닫힐때까지();
  });
  await test.step('두 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    await 봇과함께던전으로(game, driver, admin, 나, 두번째);
    await 적모두처치(game);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm faint」 뒤 「물약」 버튼을 누른다', async () => {
    const 던전 = await 던전화면.열기(game);
    await 쓰러뜨리기(game);
    await 던전.hud.물약누르기();
    await verify('「던전에서 살아 있을 때만 쓸 수 있습니다」 오류 알림이 뜬다', await 던전.hud.알림뜸('던전에서 살아 있을 때만 쓸 수 있습니다'), true);
  });
});
