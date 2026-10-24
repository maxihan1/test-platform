import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, type 토큰 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 리프레시 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-376',
  name: '리프레시하면 200 과 앞과 다른 refreshToken 이 든 TokenResponse 가 온다',
  platforms: ['android'],
  precondition: ['로그인한 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('로그인한 새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn376');
    });
    await test.step('새 계정이 로그인해 있는지 확인한다', async () => {
      await verify('새 계정의 리프레시 토큰을 받았다', typeof 계정?.리프레시, 'string', { blocker: true });
    });
    await test.step('리프레시 토큰으로 새 토큰을 받는다', async () => {
      const 응답 = await 리프레시(request, 계정!.리프레시);
      const 몸 = (await 응답.json()) as 토큰;
      const 코드인가 = await verify('응답 코드가 200 이다', 응답.status(), 200);
      const 액세스있음 = await verify('accessToken 이 온다', typeof 몸.accessToken, 'string');
      const 만료있음 = await verify('expiresInSeconds 가 온다', typeof 몸.expiresInSeconds, 'number');
      const 리프레시다름 = await verify('refreshToken 이 앞과 다르다', 몸.refreshToken !== 계정!.리프레시, true);
      await verify('리프레시하면 200 과 앞과 다른 refreshToken 이 든 TokenResponse 가 온다', 코드인가 && 액세스있음 && 만료있음 && 리프레시다름, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
