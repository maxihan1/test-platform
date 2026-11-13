import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 물약되돌리기 } from './helpers/lobby-place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-155',
  name: '물약이 없을 때 「물약」을 누르면 「체력 물약이 없습니다」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」이 없고 탱커로 던전에 들어가 있다'],
  techniques: ['동등 분할'],
  elements: ['item:health_potion', 'class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    알림글: z.string().describe('물약이 없을 때 알림 문구').default('체력 물약이 없습니다'),
  }),
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('가방의 「체력 물약」을 비우고 탱커로 던전에 들어간다', async () => {
      await 개수맞추기(game, '체력 물약', 0);
      const 대기실 = await 로비.열기(game);
      await 대기실.직업고르기('탱커');
      await 대기실.준비누르기();
      const 화면 = await 던전.열기(game);
      await 화면.안내창닫기();
      await verify('던전 「물약」 버튼에 물약이 없다고 보인다', await 화면.물약개수가될때까지(0), true, { blocker: true });
    });

    await test.step('던전에서 물약이 0 개인 「물약」 버튼을 누른다', async () => {
      const 화면 = await 던전.열기(game);
      await 화면.물약누르기();
      await verify('물약이 없을 때 「물약」을 누르면 「체력 물약이 없습니다」 알림이 뜬다', await 화면.hud.알림.뜨는지(expected.알림글), true);
    });
  } finally {
    await 물약되돌리기(game, params.loginId ?? '', params.loginPassword ?? '', 앞개수);
  }
});
