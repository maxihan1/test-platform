import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 응답몸, 플레이어머리, type 캐릭터 } from './helpers/game-state.helper.js';
import { 캐릭터수 } from './helpers/bot-auth.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-391',
  name: '내 캐릭터 목록을 부르면 내 캐릭터 이름이 있다',
  platforms: ['android'],
  precondition: ['캐릭터 하나를 가진 새 계정이 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('캐릭터 하나를 가진 새 계정을 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa391');
    });

    await test.step('계정에 캐릭터가 하나 있는지 확인한다', async () => {
      await verify('캐릭터 하나를 가진 새 계정이 있다', await 캐릭터수(admin, 나!.아이디), 1, { blocker: true });
    });

    await test.step('내 캐릭터 목록을 부른다', async () => {
      const 응답 = await admin.get('/characters', { headers: 플레이어머리(나!) });
      await verify('목록 응답이 200 이다', 응답.status(), 200);
      const 이름들 = (await 응답몸<{ name: string }[]>(응답)).map((x) => x.name).join(', ');
      await verify('내 캐릭터 목록을 부르면 내 캐릭터 이름이 있다', 이름들, 나!.이름);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
