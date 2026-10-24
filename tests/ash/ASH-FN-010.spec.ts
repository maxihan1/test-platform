import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 스폰수, 월드스폰표 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-010',
  name: '스폰 표를 부르면 초록 들판의 임프 스폰이 24곳이다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['zone:Beginner', 'monster:Imp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa010');
    });

    await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('몬스터 스폰 표를 부른다', async () => {
      const 표 = await 월드스폰표(admin, 나!);
      await verify('스폰 표를 부르면 초록 들판의 임프 스폰이 24곳이다', 스폰수(표, 'Beginner', 'Imp'), 24);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
