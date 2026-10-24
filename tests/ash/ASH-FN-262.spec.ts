import { defineCase, test, verify } from '@platform/kit';

import { 개수, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 죽음보고 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-262',
  name: '사망 드랍이 나오면 빨간 물약 10개 스택 전체가 죽은 자리 바닥에 떨어진다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 초록 들판 (100, 120) 에 있고 사망 드랍이 나오도록 고정돼 있다'],
  elements: ['zone:Beginner', 'item:potion_hp_s', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 초록 들판 (100, 120) 에 만든다', async () => {
      await 결과고정비우기(admin);
      const 나 = await 새캐릭터(admin, 'qafn262');
      누구 = 나;
      await 순간이동(admin, 나, { x: 100, z: 120 });
      await 결과고정(admin, { deathDrop: [true] });
    });
    await test.step('캐릭터가 초록 들판 (100, 120) 에 있고 사망 드랍이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터가 (100, 120) 에 있다', Math.hypot(정보.position.x - 100, 정보.position.z - 120) <= 1, true, { blocker: true });
      await verify('가방에 빨간 물약이 10개 있다', 개수(await 가방읽기(admin, 누구!), 'potion_hp_s'), 10, { blocker: true });
      await verify('사망 드랍이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.deathDrop[0], true, { blocker: true });
    });
    await test.step('빨간 물약 10개만 남기고 몬스터에게 죽었다고 보고한다', async () => {
      const 죽음 = await 죽음보고(request, 누구!, { x: 100, z: 120 });
      const 떨군 = 죽음.dropped;
      const 물약이다 = await verify('떨어진 것이 빨간 물약이다', 떨군?.templateId, 'potion_hp_s');
      const 열개다 = await verify('떨어진 수량이 10개다', 떨군?.quantity, 10);
      const 그자리다 = await verify('떨어진 자리가 죽은 자리다', Math.hypot((떨군?.x ?? Number.NaN) - 100, (떨군?.z ?? Number.NaN) - 120) <= 1, true);
      await verify('사망 드랍이 나오면 빨간 물약 10개 스택 전체가 죽은 자리 바닥에 떨어진다', 물약이다 && 열개다 && 그자리다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
