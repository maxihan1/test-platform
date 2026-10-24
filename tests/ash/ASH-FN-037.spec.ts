import { defineCase, test, verify } from '@platform/kit';

import { type 능력치, type 직업, type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 레벨주기, 새캐릭터, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 장비벗기기 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-037',
  name: '직업마다 장비를 벗긴 레벨 1 · 레벨 2 능력치를 받으면 직업 표의 HP · MP · 공격력 · 방어력과 같다',
  platforms: ['android'],
  precondition: ['직업마다 새 캐릭터가 있다'],
  elements: ['class:Archer', 'class:Mage', 'class:Warrior'],
  params: null,
  expected: null,
});

const 기획서: Record<직업, Record<string, string>> = {
  Warrior: { HP: '120 / +12', MP: '30 / +2', 공격력: '12 / +2', 방어력: '6 / +1' },
  Archer: { HP: '90 / +9', MP: '40 / +3', 공격력: '14 / +3', 방어력: '4 / +1' },
  Mage: { HP: '80 / +8', MP: '70 / +6', 공격력: '15 / +3', 방어력: '3 / +1' },
};

function 직업표꼴(레벨1: 능력치, 레벨2: 능력치): Record<string, string> {
  return {
    HP: `${String(레벨1.maxHp)} / +${String(레벨2.maxHp - 레벨1.maxHp)}`,
    MP: `${String(레벨1.maxMp)} / +${String(레벨2.maxMp - 레벨1.maxMp)}`,
    공격력: `${String(레벨1.attack)} / +${String(레벨2.attack - 레벨1.attack)}`,
    방어력: `${String(레벨1.defense)} / +${String(레벨2.defense - 레벨1.defense)}`,
  };
}

test(spec, async ({ game, admin, request }) => {
  const 직업들: 직업[] = ['Warrior', 'Archer', 'Mage'];
  const 만든: 캐릭터[] = [];
  let 입장용: 캐릭터 | undefined;
  try {
    await test.step('직업마다 새 캐릭터를 만든다', async () => {
      for (const 직업값 of 직업들) 만든.push(await 새캐릭터(admin, 'qafn037', 직업값));
    });
    await test.step('직업마다 새 캐릭터가 있는지 확인한다', async () => {
      const 직업글: string[] = [];
      for (const 나 of 만든) 직업글.push((await 캐릭터정보받기(request, 나)).classType);
      await verify('직업마다 새 캐릭터가 있다', 직업글.join(', '), 'Warrior, Archer, Mage', { blocker: true });
    });
    await test.step('직업마다 장비를 벗기고 레벨 1 · 레벨 2 능력치를 받는다', async () => {
      const 읽은: Record<string, Record<string, string>> = {};
      for (const 나 of 만든) {
        await 장비벗기기(request, 나);
        const 첫째 = await 캐릭터정보받기(request, 나);
        await 레벨주기(admin, 나, 2);
        const 둘째 = await 캐릭터정보받기(request, 나);
        읽은[첫째.classType] = 직업표꼴(첫째.stats, 둘째.stats);
      }
      const 전사 = await verify.element('전사 레벨 1 · 레벨 2 능력치가 직업 표의 값과 같다', 'class:Warrior', 읽은.Warrior, 기획서.Warrior);
      const 궁수 = await verify.element('궁수 레벨 1 · 레벨 2 능력치가 직업 표의 값과 같다', 'class:Archer', 읽은.Archer, 기획서.Archer);
      const 마법사 = await verify.element('마법사 레벨 1 · 레벨 2 능력치가 직업 표의 값과 같다', 'class:Mage', 읽은.Mage, 기획서.Mage);
      await verify('직업마다 장비를 벗긴 레벨 1 · 레벨 2 능력치를 받으면 직업 표의 HP · MP · 공격력 · 방어력과 같다', 전사 && 궁수 && 마법사, true);
    });
    await test.step('게임에 들어갈 새 전사 캐릭터를 만든다', async () => {
      입장용 = await 새캐릭터(admin, 'qafn037');
    });
    await test.step('게임에 들어갈 캐릭터가 새 전사인지 확인한다', async () => {
      await verify('게임에 들어갈 캐릭터가 새 전사 캐릭터다', (await 캐릭터정보받기(request, 입장용!)).classType, 'Warrior', { blocker: true });
    });
    await test.step('새 전사 캐릭터로 게임에 들어가 HP 를 읽는다', async () => {
      const 월드 = await 게임입장(game, 입장용!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
      await verify('새 전사 캐릭터로 게임에 들어가면 상태 칸에 「HP 120 / 120」이 보인다', await 월드.HP글(), 'HP 120 / 120');
    });
  } finally {
    for (const 나 of 만든) await 캐릭터지우기(admin, 나);
    if (입장용 !== undefined) await 캐릭터지우기(admin, 입장용);
  }
});
