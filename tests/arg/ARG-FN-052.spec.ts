import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가진개수, 개수맞추기, 사기 } from './helpers/items.helper.js';
import { 로비까지, 메인메뉴로 } from './helpers/login.helper.js';
import { 공통HUD } from './components/hud.component.js';

export const spec = defineCase({
  tcId: 'ARG-FN-052',
  name: '물약을 산 뒤 다시 접속하면 상단 바 골드가 산 뒤 골드와 같다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  let 산뒤골드 = 0;
  try {
    await test.step('「체력 물약」을 하나 산 뒤 메인 메뉴로 나갔다가 다시 로그인한다', async () => {
      await 사기(game, '체력 물약', 1);
      산뒤골드 = await new 공통HUD(game).골드();
      await 메인메뉴로(game);
      await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('상단 바 골드를 확인한다', async () => {
      const hud = new 공통HUD(game);
      const 나타났다 = await hud.골드가될때까지(산뒤골드, 15_000).then(
        () => true,
        () => false,
      );
      await verify('물약을 산 뒤 다시 접속하면 상단 바 골드가 산 뒤 골드와 같다', 나타났다 && (await hud.골드()) === 산뒤골드, true);
    });
  } finally {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 개수맞추기(game, '체력 물약', 앞개수);
  }
});
