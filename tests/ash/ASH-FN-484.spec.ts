import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 새캐릭터, 순간이동, 캐릭터읽기, type 캐릭터 } from './helpers/game-state.helper.js';
import { GM성향, 선공표시만들기 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-484',
  name: 'GM 성향치 −50 을 주면 성향치가 −50 이다',
  platforms: ['android'],
  precondition: ['선공 표시가 있는 새 캐릭터가 있다'],
  elements: ['state:성향=보라'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 나: 캐릭터 | undefined;
  try {
    await test.step('초록 들판에서 선량한 봇을 먼저 공격해 선공 표시가 있는 새 캐릭터를 만든다', async () => {
      나 = await 새캐릭터(admin, 'zqa484');
      await 순간이동(admin, 나, 'Beginner');
      await 선공표시만들기(admin, 나);
    });

    await test.step('선공 표시가 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('선공 표시 만료 시각이 있다', 읽음.alignment.purpleUntil !== null, true, { blocker: true });
    });

    await test.step('GM 성향치 −50 을 준다', async () => {
      const 응답 = await GM성향(admin, 나!, -50, false);
      const 코드 = await verify('GM 성향 응답이 200 이다', 응답.status(), 200);
      const 값 = await verify('성향치가 −50 이다', (await 캐릭터읽기(admin, 나!)).alignment.value, -50);
      await verify('GM 성향치 −50 을 주면 성향치가 −50 이다', 코드 && 값, true);
    });

    await test.step('선공 표시가 남아 있는지 확인한다', async () => {
      const 읽음 = await 캐릭터읽기(admin, 나!);
      await verify('선공 표시 만료 시각이 아직 있다', 읽음.alignment.purpleUntil !== null, true, { blocker: true });
    });

    await test.step('GM 성향 clearPurple 을 준다', async () => {
      const 응답 = await GM성향(admin, 나!, -50, true);
      const 코드 = await verify('GM clearPurple 응답이 200 이다', 응답.status(), 200);
      const 비었음 = await verify('선공 표시 만료 시각이 비어 있다', (await 캐릭터읽기(admin, 나!)).alignment.purpleUntil, null);
      await verify('GM clearPurple 을 주면 선공 표시 만료 시각이 비어 있다', 코드 && 비었음, true);
    });
  } finally {
    if (나 !== undefined) await 계정지우기(admin, 나);
  }
});
