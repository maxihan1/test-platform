import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 상단바레벨 } from './helpers/shop-state.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-321',
  name: '가방 창 능력 줄에 상단 바와 같은 레벨과 골드가 「Lv.<레벨> · 골드 <골드>」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  await test.step('가방 창 능력 줄을 확인한다', async () => {
    const 가방 = await 가방창.열기(game);
    const 능력 = await 가방.능력줄읽기();
    const 꼴 = await verify('가방 창 능력 줄이 「Lv.<레벨> · 골드 <골드>」 꼴이다', 능력.꼴맞음, true);
    const 레벨 = await verify('가방 창 능력 줄의 레벨이 상단 바 레벨과 같다', 능력.레벨, await 상단바레벨(가방.hud));
    const 골드 = await verify('가방 창 능력 줄의 골드가 상단 바 골드와 같다', 능력.골드, await 가방.hud.골드());
    await verify('가방 창 능력 줄에 상단 바와 같은 레벨과 골드가 「Lv.<레벨> · 골드 <골드>」로 보인다', 꼴 && 레벨 && 골드, true);
  });
});
