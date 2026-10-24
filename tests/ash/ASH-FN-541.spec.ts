import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새캐릭터, 초기화, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-541',
  name: '캐릭터를 초기화하면 레벨 1 · 골드 500 · 성향치 0 · 마을로 돌아간다',
  platforms: ['android'],
  precondition: ['레벨 · 골드 · 성향 · 위치를 바꾼 새 캐릭터가 있다'],
  elements: ['flow:골드-어드민', 'state:구역=마을', 'zone:Town'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('레벨 · 골드 · 성향 · 위치를 바꾼 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa541');
      await 바꾸기(admin, 나, { level: 10, gold: 900, alignment: -100, x: 100, z: 150 });
    });

    await test.step('바꾼 레벨 · 골드 · 성향 · 위치가 그대로인지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('캐릭터 레벨이 10 이다', 읽음.level, 10, { blocker: true });
      await verify('캐릭터 골드가 900 이다', 읽음.gold, 900, { blocker: true });
      await verify('캐릭터 성향치가 −100 이다', 읽음.alignment.value, -100, { blocker: true });
      await verify('캐릭터 구역이 「Beginner」다', 읽음.zone, 'Beginner', { blocker: true });
    });

    await test.step('어드민에서 캐릭터를 초기화한다', async () => {
      const 읽음 = await 초기화(admin, 나!);
      const 레벨 = await verify('레벨이 1 이다', 읽음.level, 1);
      const 골드 = await verify('골드가 500 이다', 읽음.gold, 500);
      const 성향 = await verify('성향치가 0 이다', 읽음.alignment.value, 0);
      const 마을 = await verify('캐릭터 구역이 「Town」이다', 읽음.zone, 'Town');
      await verify('캐릭터를 초기화하면 레벨 1 · 골드 500 · 성향치 0 · 마을로 돌아간다', 레벨 && 골드 && 성향 && 마을, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
