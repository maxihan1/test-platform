import { defineCase, test, verify } from '@platform/kit';

import { type 계정, 새계정 } from './helpers/api.helper.js';
import { 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 리프레시 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-675',
  name: '리프레시 토큰은 14일이 지나면 쓸 수 없다',
  platforms: ['android'],
  precondition: ['로그인한 새 계정이 있다'],
  held: '보류 — 서버 시계를 14일 넘길 길이 없음',
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 계정: 계정 | undefined;
  try {
    await test.step('로그인한 새 계정을 만든다', async () => {
      계정 = await 새계정(request, 'qafn675');
    });
    await test.step('새 계정이 로그인해 있는지 확인한다', async () => {
      await verify('새 계정의 리프레시 토큰을 받았다', typeof 계정?.리프레시, 'string', { blocker: true });
    });
    await test.step('14일 뒤 리프레시 토큰으로 리프레시한다', async () => {
      const 응답 = await 리프레시(request, 계정!.리프레시);
      await verify('리프레시 토큰은 14일이 지나면 쓸 수 없다', 응답.ok(), false);
    });
  } finally {
    if (계정 !== undefined) await 캐릭터지우기(admin, 계정);
  }
});
