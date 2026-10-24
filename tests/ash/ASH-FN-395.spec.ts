import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정, 오류 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 무작위글, 이름으로캐릭터만들기 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-395',
  name: '1자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  techniques: ['경계값 분석'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn395');
    });
    await test.step('새 계정이 있는지 확인한다', async () => {
      await verify('새 계정의 액세스 토큰을 받았다', typeof 계정?.토큰, 'string', { blocker: true });
    });
    await test.step('1자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 계정!, 무작위글(1));
      const 코드인가 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름인가 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('1자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드인가 && 이름인가, true);
    });
    await test.step('2자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 계정!, 무작위글(2));
      await verify('2자 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });
    await test.step('12자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 계정!, 무작위글(12));
      await verify('12자 이름으로 캐릭터를 만들면 201 이다', 응답.status(), 201);
    });
    await test.step('13자 이름으로 캐릭터를 만든다', async () => {
      const 응답 = await 이름으로캐릭터만들기(request, 계정!, 무작위글(13));
      const 코드인가 = await verify('응답 코드가 400 이다', 응답.status(), 400);
      const 이름인가 = await verify('오류 코드가 「VALIDATION_FAILED」다', (await 오류(응답)).code, 'VALIDATION_FAILED');
      await verify('13자 이름으로 캐릭터를 만들면 400 「VALIDATION_FAILED」다', 코드인가 && 이름인가, true);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
