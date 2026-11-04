import { defineCase, test, verify } from '@platform/kit';

import { 장착장비수 } from './helpers/character.helper.js';
import { GM아이템, 가방읽기, 장비다해제, 장착, 캐릭터읽기, 템플릿찾기, 플레이어만들기, type 아이템, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-118',
  name: '1레벨 전사가 롱 소드를 장착하면 공격력이 26 이다',
  apiDoc: 1,
  precondition: ['장비를 다 해제한 1레벨 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 나!: 플레이어;
  let 롱소드: 아이템 | undefined;
  let 사슬갑옷: 아이템 | undefined;
  let 강화롱소드: 아이템 | undefined;

  await test.step('일회용 계정으로 전사를 만들고 장비를 다 해제한 뒤 GM 으로 장비를 받는다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    await 장비다해제(request, 나);
    await GM아이템(request, 나, 'sword_long');
    await GM아이템(request, 나, 'armor_chain');
    await GM아이템(request, 나, 'sword_long', 1, 2);
  });

  await test.step('장비를 다 해제한 1레벨 전사와 받은 장비를 확인한다', async () => {
    const 지금 = await 가방읽기(request, 나);
    롱소드 = 템플릿찾기(지금, 'sword_long', 0);
    사슬갑옷 = 템플릿찾기(지금, 'armor_chain');
    강화롱소드 = 템플릿찾기(지금, 'sword_long', 2);
    await verify('캐릭터 번호가 돌아온다', 나.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('전사가 1레벨이다', (await 캐릭터읽기(request, 나)).level, 1, {
      blocker: true,
    });
    await verify('전사가 장착한 장비가 없다', 장착장비수(지금), 0, {
      blocker: true,
    });
    await verify('받은 롱 소드가 가방에 있다', 롱소드 !== undefined, true, {
      blocker: true,
    });
    await verify('받은 사슬 갑옷이 가방에 있다', 사슬갑옷 !== undefined, true, {
      blocker: true,
    });
    await verify('받은 +2 롱 소드가 가방에 있다', 강화롱소드 !== undefined, true, { blocker: true });
  });

  await test.step('GM 으로 받은 롱 소드를 장착한다', async () => {
    if (롱소드 === undefined) return;
    await 장착(request, 나, 롱소드.id);
    await verify('1레벨 전사가 롱 소드를 장착하면 공격력이 26 이다', (await 캐릭터읽기(request, 나)).stats.attack, 26);
  });

  await test.step('GM 으로 받은 사슬 갑옷을 장착한다', async () => {
    if (사슬갑옷 === undefined) return;
    await 장착(request, 나, 사슬갑옷.id);
    await verify('1레벨 전사가 사슬 갑옷을 장착하면 방어력이 14 다', (await 캐릭터읽기(request, 나)).stats.defense, 14);
  });

  await test.step('GM 으로 받은 +2 롱 소드를 장착한다', async () => {
    if (강화롱소드 === undefined) return;
    await 장착(request, 나, 강화롱소드.id);
    await verify('1레벨 전사가 +2 롱 소드를 장착하면 공격력이 30 이다', (await 캐릭터읽기(request, 나)).stats.attack, 30);
  });
});
