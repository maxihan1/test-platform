import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 사망보고, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-067',
  name: '경험치 0 인 레벨 3 캐릭터가 사망해도 레벨이 3 이다',
  platforms: ['android'],
  precondition: ['레벨 3 이고 경험치가 0 인 새 캐릭터가 초록 들판에 있다'],
  elements: ['zone:Beginner', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('레벨 3 이고 경험치가 0 인 새 캐릭터를 초록 들판에 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa067');
      await 순간이동(admin, 나, 'Beginner');
      await 바꾸기(admin, 나, { level: 3 });
      await 바꾸기(admin, 나, { exp: 0 });
    });

    await test.step('새 캐릭터가 레벨 3 이고 경험치 0 으로 초록 들판에 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      const 레벨 = await verify('캐릭터 레벨이 3 이다', 읽음.level, 3, { blocker: true });
      const 경험치 = await verify('캐릭터 경험치가 0 이다', 읽음.exp, 0, { blocker: true });
      const 구역 = await verify('캐릭터가 초록 들판에 있다', 읽음.zone, 'Beginner', { blocker: true });
      await verify('레벨 3 이고 경험치가 0 인 새 캐릭터가 초록 들판에 있다', 레벨 && 경험치 && 구역, true, { blocker: true });
    });

    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 응답 = await 사망보고(admin, 나!);
      await verify('사망 보고 응답 코드가 200 이다', 응답.status(), 200);
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('경험치 0 인 레벨 3 캐릭터가 사망해도 레벨이 3 이다', 읽음.level, 3);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
