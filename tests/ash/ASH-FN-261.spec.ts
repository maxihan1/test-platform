import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 가방읽기, 결과고정, 결과고정비우기, 새캐릭터, 설정읽기, 성향주기, 순간이동, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 바닥아이템찾기, 장착만남기기, 죽음보고 } from './helpers/pk.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-261',
  name: '성향치 −700 캐릭터가 장착 장비만 가진 채 드랍이 나오면 장착 장비가 바닥에 떨어진다',
  platforms: ['android'],
  precondition: ['성향치 −700 인 새 전사 캐릭터가 장착한 장비만 가지고 있고 사망 드랍이 나오도록 고정돼 있다'],
  techniques: ['결정 테이블', '상태 전이'],
  elements: ['zone:Beginner', 'drop:death_-600이하', 'state:생존=죽음'],
  params: null,
  expected: null,
});

test(spec, async ({ admin, request }) => {
  let 누구: 캐릭터 | undefined;
  try {
    await test.step('성향치 −700 인 새 전사 캐릭터를 장착한 장비만 남기고 만든다', async () => {
      await 결과고정비우기(admin);
      const 나 = await 새캐릭터(admin, 'qafn261');
      누구 = 나;
      await 성향주기(admin, 나, -700);
      await 순간이동(admin, 나, 'Beginner');
      await 장착만남기기(admin, 나);
      await 결과고정(admin, { deathDrop: [true] });
    });
    await test.step('캐릭터가 장착한 장비만 가지고 있고 사망 드랍이 나오도록 고정돼 있는지 확인한다', async () => {
      const 정보 = await 캐릭터정보받기(request, 누구!);
      await verify('캐릭터가 초록 들판에 있다', 정보.zone, 'Beginner', { blocker: true });
      await verify('캐릭터의 성향치가 −700 이다', 정보.alignment.value, -700, { blocker: true });
      await verify('가방에 장착하지 않은 아이템이 없다', (await 가방읽기(admin, 누구!)).items.filter((i) => i.equippedSlot === null).length, 0, { blocker: true });
      await verify('사망 드랍이 나오도록 고정돼 있다', (await 설정읽기(admin)).forced.deathDrop[0], true, { blocker: true });
    });
    await test.step('몬스터에게 죽었다고 보고한다', async () => {
      const 죽음 = await 죽음보고(request, 누구!);
      const 나왔다 = await verify('드랍이 나온다', (죽음.dropped ?? null) !== null, true);
      const 장비다 = await verify('떨어진 것이 장착하던 장비다', ['sword_short', 'armor_leather'].includes(죽음.dropped?.templateId ?? ''), true);
      const 바닥이다 = await verify('그 장비가 바닥 아이템 목록에 있다', (await 바닥아이템찾기(request, 누구!, 'Beginner', 죽음.dropped?.id ?? -1)) !== undefined, true);
      await verify('성향치 −700 캐릭터가 장착 장비만 가진 채 드랍이 나오면 장착 장비가 바닥에 떨어진다', 나왔다 && 장비다 && 바닥이다, true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    await 결과고정비우기(admin);
  }
});
