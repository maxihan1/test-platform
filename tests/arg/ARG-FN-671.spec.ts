import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에채우기, 무기되돌리기, 처음무기읽기 } from './helpers/shop-state.helper.js';
import { 게임강제다시켜기 } from './helpers/device.helper.js';
import { 가진개수, 개수맞추기 } from './helpers/items.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 가방창 } from './pages/bag.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-671',
  name: '장착한 뒤 게임을 다시 켜면 무기 칸에 「녹슨 단검」이 있다',
  platforms: ['android'],
  precondition: ['가방에 「녹슨 단검」이 있고 로비에 있다'],
  techniques: ['오류 추정'],
  elements: ['item:rusty_dagger'],
  params: z.object({
    loginId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    loginPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    무기칸: z.string().describe('다시 켠 뒤 무기 칸 이름').default('녹슨 단검'),
  }),
  held: '보류 — 연결을 갑자기 끊으면 서버가 그 계정 접속을 놓지 않아 뒤 케이스가 「같은 계정으로 이미 접속 중」으로 막힌다',
});

test(spec, async ({ game, driver, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 앞개수 = await 가진개수(game, '녹슨 단검');
  const 처음무기 = await 처음무기읽기(game);
  try {
    await test.step('가방에 「녹슨 단검」이 있게 채운다', async () => {
      await 가방에채우기(game, '녹슨 단검', 1);
      const 가방 = await 가방창.열기(game);
      await verify('가방 목록에 「녹슨 단검」 줄이 보인다', (await 가방.줄개수('녹슨 단검')) >= 1, true, { blocker: true });
    });

    await test.step('「녹슨 단검」을 장착한 뒤 게임을 끄고 다시 켜 로그인한다', async () => {
      const 가방 = await 가방창.열기(game);
      await 가방.장착하기('녹슨 단검');
      await verify('무기 칸에 「녹슨 단검」이 보인다', await 가방.칸이될때까지('무기', expected.무기칸), true, { blocker: true });
      await 게임강제다시켜기(driver, game);
      await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    });

    await test.step('가방 창의 무기 칸을 확인한다', async () => {
      const 가방 = await 가방창.열기(game);
      await verify('장착한 뒤 게임을 다시 켜면 무기 칸에 「녹슨 단검」이 있다', await 가방.칸이름('무기'), expected.무기칸);
    });
  } finally {
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await 무기되돌리기(game, 처음무기);
    await 개수맞추기(game, '녹슨 단검', 앞개수);
  }
});
