import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 와이파이 } from './helpers/device.helper.js';
import { 로비까지 } from './helpers/login.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-670',
  name: '로비에서 와이파이를 끄면 다시 연결하는 중인 「연결 끊김」 창에는 「확인」 버튼이 보이지 않는다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 계정으로 로그인해 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    loginPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: z.object({
    연결중: z.string().describe('다시 연결하는 중 글').default('다시 연결하는 중'),
  }),
  held: '보류 — 연결을 갑자기 끊으면 서버가 그 계정 접속을 놓지 않아 뒤 케이스가 「같은 계정으로 이미 접속 중」으로 막힌다',
});

test(spec, async ({ game, driver, params, expected }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  try {
    await test.step('로비에서 와이파이를 끄고 다시 연결하는 창을 확인한다', async () => {
      await 와이파이(driver, false);
      const 화면 = 로그인화면.지금(game);
      const 연결중 = await 화면.글자가뜨는지(expected.연결중, 60_000);
      await verify('로비에서 와이파이를 끄면 다시 연결하는 중인 「연결 끊김」 창에는 「확인」 버튼이 보이지 않는다', 연결중 && !(await 화면.안내창.확인있는지()), true);
    });
  } finally {
    await 와이파이(driver, true);
  }
});
