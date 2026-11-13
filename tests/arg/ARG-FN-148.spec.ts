import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 물약되돌리기 } from './helpers/lobby-place.helper.js';
import { 뜨는지 } from './helpers/find.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 던전 } from './pages/dungeon.page.js';
import { 로비 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-148',
  name: '던전에서 「물약」을 누르면 「체력 물약 사용」 알림이 뜬다',
  platforms: ['android'],
  precondition: ['가방에 「체력 물약」이 있고 탱커로 던전에 들어가 있다'],
  elements: ['item:health_potion', 'class:tank', 'zone:Dungeon'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    물약개수: z.number().int().min(1).describe('던전에 들어가기 전 맞출 체력 물약 개수 — 1개 이상').default(2),
  }),
  expected: z.object({
    알림글: z.string().describe('물약 사용 알림 문구').default('체력 물약 사용'),
    줄어드는개수: z.number().describe('물약 한 번 누를 때 줄어드는 개수').default(1),
  }),
  smoke: true,
});

test(spec, async ({ game, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면 제목이 보인다', await 뜨는지(game, 로비.제목), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '체력 물약');
  try {
    await test.step('가방에 「체력 물약」을 두고 탱커로 던전에 들어간다', async () => {
      await 개수맞추기(game, '체력 물약', params.물약개수);
      const 대기실 = await 로비.열기(game);
      await 대기실.직업고르기('탱커');
      await 대기실.준비누르기();
      const 화면 = await 던전.열기(game);
      await 화면.안내창닫기();
      await verify('던전 「물약」 버튼에 가방에 둔 개수가 보인다', await 화면.물약개수가될때까지(params.물약개수), true, { blocker: true });
    });

    await test.step('던전에서 「물약」 버튼을 누른다', async () => {
      const 화면 = await 던전.열기(game);
      await 화면.물약누르기();
      await verify('던전에서 「물약」을 누르면 「체력 물약 사용」 알림이 뜬다', await 화면.hud.알림.뜨는지(expected.알림글), true);
      await 화면.물약개수가될때까지(params.물약개수 - expected.줄어드는개수);
      await verify('「물약」 버튼의 개수가 1 줄어든다', params.물약개수 - (await 화면.물약개수()), expected.줄어드는개수);
    });
  } finally {
    await 물약되돌리기(game, params.loginId ?? '', params.loginPassword ?? '', 앞개수);
  }
});
