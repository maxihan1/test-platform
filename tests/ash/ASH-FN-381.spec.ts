import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 오류 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 리프레시 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-381',
  name: '한 번 쓴 리프레시 토큰을 다시 쓰면 401 「INVALID_REFRESH_TOKEN」이다',
  platforms: ['android'],
  precondition: ['로그인한 새 계정이 리프레시를 한 번 했다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 첫코드: number | undefined;
  let 쓴리프레시: string | undefined;
  let 계정: 계정 | undefined;
  try {
    await test.step('로그인한 새 계정이 리프레시를 한 번 하게 만든다', async () => {
      const 본인 = await 새계정(request, 'qafn381');
      계정 = 본인;
      쓴리프레시 = 본인.리프레시;
      첫코드 = (await 리프레시(request, 본인.리프레시)).status();
    });
    await test.step('새 계정이 리프레시를 한 번 했는지 확인한다', async () => {
      await verify('첫 리프레시가 200 으로 끝났다', 첫코드, 200, { blocker: true });
    });
    await test.step('이미 쓴 리프레시 토큰으로 다시 리프레시한다', async () => {
      const 응답 = await 리프레시(request, 쓴리프레시!);
      const 코드인가 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름인가 = await verify('오류 코드가 「INVALID_REFRESH_TOKEN」이다', (await 오류(응답)).code, 'INVALID_REFRESH_TOKEN');
      await verify('한 번 쓴 리프레시 토큰을 다시 쓰면 401 「INVALID_REFRESH_TOKEN」이다', 코드인가 && 이름인가, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
