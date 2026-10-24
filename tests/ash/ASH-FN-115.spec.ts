import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새계정, 캐릭터더하기, 캐릭터읽기, type 계정 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-115',
  name: '새 캐릭터를 만들면 골드가 500 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 주인: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      주인 = await 새계정(admin, 'zqa115');
    });

    await test.step('로그인한 계정이 있는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: { authorization: `Bearer ${주인!.토큰}` } });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('새 캐릭터를 만든다', async () => {
      const 만든 = await 캐릭터더하기(admin, 주인!);
      const 읽음 = await 캐릭터읽기(admin, 만든);
      await verify('새 캐릭터를 만들면 골드가 500 이다', 읽음.gold, 500);
    });
  } finally {
    if (주인 !== undefined) await 계정지우기(admin, 주인);
  }
});
