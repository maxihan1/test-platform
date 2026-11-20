import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로, 지금화면 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-439',
  name: '창의 「닫기」를 누르면 창이 닫힌다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['state:장소=로비'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    await verify('로비 화면이 보인다', await 지금화면(game), '로비', { blocker: true });
  });
  await test.step('가방 창을 열고 오른쪽 아래 「닫기」를 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('「닫기」를 누르기 전에 가방 창이 열려 있다', await 가방.제목(), '가방', { blocker: true });
    await 가방.닫기();
    await verify('창의 「닫기」를 누르면 창이 닫힌다', await 가방.닫힐때까지(), true);
  });
  await test.step('가방 창을 열고 바깥 어두운 곳을 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('바깥을 누르기 전에 가방 창이 열려 있다', await 가방.제목(), '가방', { blocker: true });
    await 가방.가림막누르기();
    await verify('바깥 어두운 곳으로도 창이 닫힌다', await 가방.닫힐때까지(), true);
  });
  await test.step('가방 창을 열고 메뉴 「가방」을 다시 누른다', async () => {
    const 가방 = await 가방창.열기(game);
    await verify('메뉴를 다시 누르기 전에 가방 창이 열려 있다', await 가방.제목(), '가방', { blocker: true });
    await 가방.hud.메뉴누르기('가방');
    await verify('같은 메뉴 버튼으로도 창이 닫힌다', await 가방.닫힐때까지(), true);
  });
});
