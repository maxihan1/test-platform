import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 색벗기기 } from './helpers/find.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 상점창 } from './pages/shop.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-125',
  name: '상단 바 골드가 「<수> G」 꼴로 보이고 상점 가격이 「80 G」 꼴로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:rusty_dagger'],
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

  await test.step('상단 바와 상점 창의 골드 표기를 확인한다', async () => {
    const 꼴 = /^\d[\d,]* G$/;
    const 상점 = await 상점창.열기(game);
    const 상단 = await verify('상단 바 골드가 「<수> G」 꼴이다', 꼴.test(색벗기기(await 상점.hud.골드글()).trim()), true);
    const 맞지않는가격 = (await 상점.가격들()).filter((글) => !꼴.test(글.trim()));
    const 가격 = await verify('상점 가격이 모두 「<수> G」 꼴이다', 맞지않는가격, []);
    await verify('상단 바 골드가 「<수> G」 꼴로 보이고 상점 가격이 「80 G」 꼴로 보인다', 상단 && 가격, true);
  });
});
