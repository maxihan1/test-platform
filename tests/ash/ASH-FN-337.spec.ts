import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 플레이어머리, type 캐릭터 } from './helpers/game-state.helper.js';
import { 내캐릭터읽기 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-337',
  name: '내 캐릭터 번호로 상점 목록을 부르면 200 이다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 계정과 캐릭터 하나를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa337');
    });

    await test.step('로그인한 계정의 캐릭터가 있는지 확인한다', async () => {
      await verify('로그인한 계정이 있다', (await 내캐릭터읽기(admin, 나!)).status(), 200, { blocker: true });
    });

    await test.step('내 캐릭터 번호를 X-Character-Id 로 주고 상점 목록을 부른다', async () => {
      const 응답 = await admin.get('/shop/items', { headers: 플레이어머리(나!) });
      await verify('내 캐릭터 번호로 상점 목록을 부르면 200 이다', 응답.status(), 200);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
