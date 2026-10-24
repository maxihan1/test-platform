import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 오류코드, 임의글자, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-333',
  name: '토큰 없이 내 캐릭터 목록을 부르면 401 「UNAUTHORIZED」다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  techniques: ['동등 분할'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 나: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      나 = await 새계정(admin, 'zqa333');
    });

    await test.step('로그인한 계정의 토큰이 있는지 확인한다', async () => {
      await verify('로그인한 계정이 있다', 나!.토큰 !== '', true, { blocker: true });
    });

    await test.step('토큰 없이 내 캐릭터 목록을 부른다', async () => {
      const 응답 = await request.get('/characters');
      const 코드 = await verify('응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
      await verify('토큰 없이 내 캐릭터 목록을 부르면 401 「UNAUTHORIZED」다', 코드 && 이름, true);
    });

    await test.step('틀린 토큰으로 내 캐릭터 목록을 부른다', async () => {
      const 응답 = await request.get('/characters', { headers: { authorization: `Bearer ${임의글자(40)}` } });
      const 코드 = await verify('틀린 토큰의 응답 코드가 401 이다', 응답.status(), 401);
      const 이름 = await verify('틀린 토큰의 오류 코드가 「UNAUTHORIZED」다', await 오류코드(응답), 'UNAUTHORIZED');
      await verify('틀린 토큰으로 내 캐릭터 목록을 부르면 401 「UNAUTHORIZED」다', 코드 && 이름, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
