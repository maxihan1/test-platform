import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 상단바글칸수 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-003',
  name: '로비에 들어오면 상단 바의 재화 표시는 「 G」 골드 하나뿐이다',
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 보임 = await hud.그려질때까지().then(
      () => true,
      () => false,
    );
    await verify('상단 바가 보인다', 보임, true, { blocker: true });
  });
  await test.step('공통 HUD 의 재화 표시를 확인한다', async () => {
    const 골드 = await verify('재화 표시가 「 G」로 끝난다', (await hud.골드글()).endsWith(' G'), true);
    const 하나 = await verify('재화 칸이 하나뿐이다', (await 상단바글칸수(game)) - 1, 1);
    await verify('로비에 들어오면 상단 바의 재화 표시는 「 G」 골드 하나뿐이다', 골드 && 하나, true);
  });
});
