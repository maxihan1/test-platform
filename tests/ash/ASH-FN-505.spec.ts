import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, type 계정 } from './helpers/game-state.helper.js';
import { 계정찾기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-505',
  name: '아이디 앞머리로 계정을 찾으면 그 계정이 나온다',
  platforms: ['android'],
  precondition: ['새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('새 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa505');
    });

    await test.step('새 계정으로 로그인한 토큰이 있는지 확인한다', async () => {
      await verify('새 계정의 로그인 토큰이 있다', 나!.토큰 !== '', true, { blocker: true });
    });

    await test.step('그 아이디 앞머리로 계정을 찾는다', async () => {
      const 목록 = await 계정찾기(admin, 나!.아이디.slice(0, 10));
      await verify('아이디 앞머리로 계정을 찾으면 그 계정이 나온다', 목록.some((x) => x.username === 나!.아이디), true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
