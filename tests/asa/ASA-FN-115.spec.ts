import { defineCase, test, verify } from '@platform/kit';

import { 장착장비수 } from './helpers/character.helper.js';
import { GM레벨, 가방읽기, 계정만들기, 장비다해제, 캐릭터읽기, 플레이어만들기, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-115',
  name: '1레벨 전사가 장비를 다 해제하면 최대 HP 120 · 최대 MP 30 · 공격력 12 · 방어력 6 이다',
  apiDoc: 1,
  precondition: [
    '장비를 다 해제한 1레벨 전사가 있다',
    '장비를 다 해제한 1레벨 궁수가 있다',
    '장비를 다 해제한 1레벨 마법사가 있다',
    '장비를 다 해제한 전사가 있다',
    '장비를 다 해제한 궁수가 있다',
    '장비를 다 해제한 마법사가 있다',
  ],
  params: null,
  expected: null,
});

test(spec, async ({ request }) => {
  let 전사!: 플레이어;
  let 궁수!: 플레이어;
  let 마법사!: 플레이어;

  await test.step('일회용 계정으로 전사 · 궁수 · 마법사를 만들고 장비를 다 해제한다', async () => {
    const 토큰 = await 계정만들기(request);
    전사 = await 플레이어만들기(request, 'Warrior', 토큰);
    궁수 = await 플레이어만들기(request, 'Archer', 토큰);
    마법사 = await 플레이어만들기(request, 'Mage', 토큰);
    await 장비다해제(request, 전사);
    await 장비다해제(request, 궁수);
    await 장비다해제(request, 마법사);
  });

  await test.step('장비를 다 해제한 1레벨 전사 · 궁수 · 마법사를 확인한다', async () => {
    await verify('전사 캐릭터 번호가 돌아온다', 전사.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('전사가 1레벨이다', (await 캐릭터읽기(request, 전사)).level, 1, { blocker: true });
    await verify('전사가 장착한 장비가 없다', 장착장비수(await 가방읽기(request, 전사)), 0, { blocker: true });
    await verify('궁수 캐릭터 번호가 돌아온다', 궁수.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('궁수가 1레벨이다', (await 캐릭터읽기(request, 궁수)).level, 1, { blocker: true });
    await verify('궁수가 장착한 장비가 없다', 장착장비수(await 가방읽기(request, 궁수)), 0, { blocker: true });
    await verify('마법사 캐릭터 번호가 돌아온다', 마법사.캐릭터번호 > 0, true, {
      blocker: true,
    });
    await verify('마법사가 1레벨이다', (await 캐릭터읽기(request, 마법사)).level, 1, { blocker: true });
    await verify('마법사가 장착한 장비가 없다', 장착장비수(await 가방읽기(request, 마법사)), 0, { blocker: true });
  });

  await test.step('전사 능력치를 읽는다', async () => {
    const 능력치 = (await 캐릭터읽기(request, 전사)).stats;
    const 체력 = await verify('1레벨 전사의 최대 HP 가 120 이다', 능력치.maxHp, 120);
    const 마나 = await verify('1레벨 전사의 최대 MP 가 30 이다', 능력치.maxMp, 30);
    const 공격 = await verify('1레벨 전사의 공격력이 12 이다', 능력치.attack, 12);
    const 방어 = await verify('1레벨 전사의 방어력이 6 이다', 능력치.defense, 6);
    await verify('1레벨 전사가 장비를 다 해제하면 최대 HP 120 · 최대 MP 30 · 공격력 12 · 방어력 6 이다', 체력 && 마나 && 공격 && 방어, true);
  });

  await test.step('궁수 능력치를 읽는다', async () => {
    const 능력치 = (await 캐릭터읽기(request, 궁수)).stats;
    const 체력 = await verify('1레벨 궁수의 최대 HP 가 90 이다', 능력치.maxHp, 90);
    const 마나 = await verify('1레벨 궁수의 최대 MP 가 40 이다', 능력치.maxMp, 40);
    const 공격 = await verify('1레벨 궁수의 공격력이 14 이다', 능력치.attack, 14);
    const 방어 = await verify('1레벨 궁수의 방어력이 4 이다', 능력치.defense, 4);
    await verify('1레벨 궁수가 장비를 다 해제하면 최대 HP 90 · 최대 MP 40 · 공격력 14 · 방어력 4 다', 체력 && 마나 && 공격 && 방어, true);
  });

  await test.step('마법사 능력치를 읽는다', async () => {
    const 능력치 = (await 캐릭터읽기(request, 마법사)).stats;
    const 체력 = await verify('1레벨 마법사의 최대 HP 가 80 이다', 능력치.maxHp, 80);
    const 마나 = await verify('1레벨 마법사의 최대 MP 가 70 이다', 능력치.maxMp, 70);
    const 공격 = await verify('1레벨 마법사의 공격력이 15 이다', 능력치.attack, 15);
    const 방어 = await verify('1레벨 마법사의 방어력이 3 이다', 능력치.defense, 3);
    await verify('1레벨 마법사가 장비를 다 해제하면 최대 HP 80 · 최대 MP 70 · 공격력 15 · 방어력 3 이다', 체력 && 마나 && 공격 && 방어, true);
  });

  await test.step('GM 으로 전사를 2레벨로 올린다', async () => {
    await GM레벨(request, 전사, 2);
    const 능력치 = (await 캐릭터읽기(request, 전사)).stats;
    const 체력 = await verify('2레벨 전사의 최대 HP 가 132 이다', 능력치.maxHp, 132);
    const 마나 = await verify('2레벨 전사의 최대 MP 가 32 이다', 능력치.maxMp, 32);
    const 공격 = await verify('2레벨 전사의 공격력이 14 이다', 능력치.attack, 14);
    const 방어 = await verify('2레벨 전사의 방어력이 7 이다', 능력치.defense, 7);
    await verify('장비를 다 해제한 전사를 2레벨로 올리면 최대 HP 132 · 최대 MP 32 · 공격력 14 · 방어력 7 이다', 체력 && 마나 && 공격 && 방어, true);
  });

  await test.step('GM 으로 궁수를 2레벨로 올린다', async () => {
    await GM레벨(request, 궁수, 2);
    const 능력치 = (await 캐릭터읽기(request, 궁수)).stats;
    const 체력 = await verify('2레벨 궁수의 최대 HP 가 99 이다', 능력치.maxHp, 99);
    const 마나 = await verify('2레벨 궁수의 최대 MP 가 43 이다', 능력치.maxMp, 43);
    const 공격 = await verify('2레벨 궁수의 공격력이 17 이다', 능력치.attack, 17);
    const 방어 = await verify('2레벨 궁수의 방어력이 5 이다', 능력치.defense, 5);
    await verify('장비를 다 해제한 궁수를 2레벨로 올리면 최대 HP 99 · 최대 MP 43 · 공격력 17 · 방어력 5 다', 체력 && 마나 && 공격 && 방어, true);
  });

  await test.step('GM 으로 마법사를 2레벨로 올린다', async () => {
    await GM레벨(request, 마법사, 2);
    const 능력치 = (await 캐릭터읽기(request, 마법사)).stats;
    const 체력 = await verify('2레벨 마법사의 최대 HP 가 88 이다', 능력치.maxHp, 88);
    const 마나 = await verify('2레벨 마법사의 최대 MP 가 76 이다', 능력치.maxMp, 76);
    const 공격 = await verify('2레벨 마법사의 공격력이 18 이다', 능력치.attack, 18);
    const 방어 = await verify('2레벨 마법사의 방어력이 4 이다', 능력치.defense, 4);
    await verify('장비를 다 해제한 마법사를 2레벨로 올리면 최대 HP 88 · 최대 MP 76 · 공격력 18 · 방어력 4 다', 체력 && 마나 && 공격 && 방어, true);
  });
});
