import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { 스폰수, 월드스폰표 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-028',
  name: '스폰 표를 부르면 불꽃 군주의 폐허에 임프 군주 스폰 1곳과 반달 임프 스폰 4곳이 있다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['zone:Boss', 'monster:ImpBoss', 'monster:VandalImp'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa028');
    });

    await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('몬스터 스폰 표에서 불꽃 군주의 폐허를 센다', async () => {
      const 표 = await 월드스폰표(admin, 나!);
      const 군주 = await verify('불꽃 군주의 폐허에 임프 군주 스폰이 1곳이다', 스폰수(표, 'Boss', 'ImpBoss'), 1);
      const 반달 = await verify('불꽃 군주의 폐허에 반달 임프 스폰이 4곳이다', 스폰수(표, 'Boss', 'VandalImp'), 4);
      await verify('스폰 표를 부르면 불꽃 군주의 폐허에 임프 군주 스폰 1곳과 반달 임프 스폰 4곳이 있다', 군주 && 반달, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
