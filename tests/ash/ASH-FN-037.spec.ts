import { defineCase, test, verify } from '@platform/kit';

import { 계정지우기, 바꾸기, 새계정, 캐릭터더하기, 캐릭터읽기, type 계정 } from './helpers/game-state.helper.js';
import { 장비전부해제, 직업스탯, 스탯글 } from './helpers/world.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-037',
  name: '직업마다 새 캐릭터를 만들고 레벨을 바꾸면 HP · MP · 공격력 · 방어력이 직업 표 값과 같다',
  platforms: ['android'],
  precondition: ['로그인한 계정이 있다'],
  elements: ['class:Warrior', 'class:Archer', 'class:Mage'],
  params: null,
  expected: null,
});

test(spec, async ({ admin }) => {
  let 주인: 계정 | undefined;
  try {
    await test.step('로그인한 계정을 만든다', async () => {
      주인 = await 새계정(admin, 'zqa037');
    });

    await test.step('로그인한 계정이 있는지 확인한다', async () => {
      const 응답 = await admin.get('/characters', { headers: { authorization: `Bearer ${주인!.토큰}` } });
      await verify('로그인한 계정이 있다', 응답.status(), 200, { blocker: true });
    });

    await test.step('직업마다 새 캐릭터를 만들고 레벨을 10 으로 바꾼다', async () => {
      const 전사 = await 캐릭터더하기(admin, 주인!, 'Warrior');
      await 바꾸기(admin, 전사, { level: 10 });
      await 장비전부해제(admin, 전사);
      const 전사스탯 = (await 캐릭터읽기(admin, 전사)).stats;
      const 전사맞음 = await verify.element('전사의 HP · MP · 공격력 · 방어력이 직업 표 값과 같다', 'class:Warrior', 스탯글(전사스탯), 스탯글(직업스탯('Warrior', 10)));

      const 궁수 = await 캐릭터더하기(admin, 주인!, 'Archer');
      await 바꾸기(admin, 궁수, { level: 10 });
      await 장비전부해제(admin, 궁수);
      const 궁수스탯 = (await 캐릭터읽기(admin, 궁수)).stats;
      const 궁수맞음 = await verify.element('궁수의 HP · MP · 공격력 · 방어력이 직업 표 값과 같다', 'class:Archer', 스탯글(궁수스탯), 스탯글(직업스탯('Archer', 10)));

      const 마법사 = await 캐릭터더하기(admin, 주인!, 'Mage');
      await 바꾸기(admin, 마법사, { level: 10 });
      await 장비전부해제(admin, 마법사);
      const 마법사스탯 = (await 캐릭터읽기(admin, 마법사)).stats;
      const 마법사맞음 = await verify.element('마법사의 HP · MP · 공격력 · 방어력이 직업 표 값과 같다', 'class:Mage', 스탯글(마법사스탯), 스탯글(직업스탯('Mage', 10)));

      await verify('직업마다 새 캐릭터를 만들고 레벨을 바꾸면 HP · MP · 공격력 · 방어력이 직업 표 값과 같다', 전사맞음 && 궁수맞음 && 마법사맞음, true);
    });
  } finally {
    if (주인 !== undefined) await 계정지우기(admin, 주인);
  }
});
