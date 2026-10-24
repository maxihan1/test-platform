import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 오류 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 상한까지캐릭터만들기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-408',
  name: '캐릭터를 계속 만들면 상한에서 409 「CHARACTER_LIMIT」이다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn408');
    });
    await test.step('새 계정이 있는지 확인한다', async () => {
      await verify('새 계정의 액세스 토큰을 받았다', typeof 계정?.토큰, 'string', { blocker: true });
    });
    await test.step('409 가 날 때까지 캐릭터를 만든다', async () => {
      const 응답 = await 상한까지캐릭터만들기(request, 계정!);
      const 코드인가 = await verify('응답 코드가 409 다', 응답.status(), 409);
      const 이름인가 = await verify('오류 코드가 「CHARACTER_LIMIT」이다', (await 오류(응답)).code, 'CHARACTER_LIMIT');
      await verify('캐릭터를 계속 만들면 상한에서 409 「CHARACTER_LIMIT」이다', 코드인가 && 이름인가, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
