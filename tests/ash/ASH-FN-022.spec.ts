import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 봇목록, 새캐릭터, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-022',
  name: '잿빛 숲 봇 목록을 부르면 모든 봇 레벨이 9 이상 15 이하다',
  platforms: ['android'],
  precondition: ['로그인한 캐릭터가 있다'],
  elements: ['zone:Intermediate'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('로그인한 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa022');
    });

    await test.step('로그인한 캐릭터가 있는지 확인한다', async () => {
      await verify('로그인한 캐릭터가 있다', (await 캐릭터읽기(admin, 나!)).name, 나!.이름, { blocker: true });
    });

    await test.step('잿빛 숲 봇 목록을 부른다', async () => {
      const 봇들 = await 봇목록(admin, 나!, 'Intermediate');
      const 있음 = await verify('잿빛 숲 봇 목록에 봇이 있다', 봇들.length > 0, true);
      const 벗어남 = 봇들
        .filter((b) => b.level < 9 || b.level > 15)
        .map((b) => `${b.name} Lv.${String(b.level)}`)
        .join(', ');
      const 범위 = await verify('레벨이 9 이상 15 이하를 벗어난 봇이 없다', 벗어남, '');
      await verify('잿빛 숲 봇 목록을 부르면 모든 봇 레벨이 9 이상 15 이하다', 있음 && 범위, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
