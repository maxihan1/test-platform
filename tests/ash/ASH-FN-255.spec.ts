import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 성향주기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장착만남기기, 죽음보고 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-255',
  name: '성향치 −100 캐릭터는 드랍이 나와도 장착 장비를 떨어뜨리지 않는다',
  platforms: ['android'],
  precondition: ['성향치 −100 인 새 전사 캐릭터가 장착한 장비만 가지고 있고 사망 드랍이 나오도록 고정돼 있다'],
  techniques: ['결정 테이블', '상태 전이'],
  elements: ['zone:Beginner', 'drop:death_-1~-299', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −100 인 새 전사 캐릭터를 장착한 장비만 남기고 만든다', async () => {
      await 결과고정비우기(admin);
      const 나 = await 새캐릭터(admin, 'qafn255');
      누구 = 나;
      await 성향주기(admin, 나, -100);
      await 순간이동(admin, 나, 'Beginner');
      await 장착만남기기(admin, 나);
      await 결과고정(admin, { deathDrop: [true] });
    });
    await test.step('캐릭터가 장착한 장비만 가지고 있고 사망 드랍이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터의 성향치가 −100 이다', 정보.alignment.value, -100, { blocker: true });
      await verify('가방에 장착하지 않은 아이템이 없다', (await 가방읽기(admin, 누구!)).items.filter((i) => i.equippedSlot === null).length, 0, { blocker: true });
      await verify('사망 드랍이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.deathDrop[0], true, { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 죽음 = await 죽음보고(request, 누구!);
      const 비었다 = await verify('드랍이 비어 있다', 죽음.dropped ?? null, null);
      const 남았다 = await verify('장착 장비가 가방에 그대로 있다', (await 가방읽기(admin, 누구!)).items.filter((i) => i.equippedSlot !== null).length, 2);
      await verify('성향치 −100 캐릭터는 드랍이 나와도 장착 장비를 떨어뜨리지 않는다', 비었다 && 남았다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
