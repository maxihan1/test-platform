import { defineCase, test, verify } from '@platform/kit';

import { 아이템템플릿들, 어드민열림 } from './helpers/admin-api.helper.js';

export const spec = defineCase({
  tcId: 'ASH-FN-529',
  name: '아이템 템플릿 목록의 id 가 아이템 표의 20가지와 같고 줄마다 name 과 type 이 있다',
  platforms: ['android'],
  precondition: ['어드민 키가 있다'],
  elements: [
    'item:armor_chain',
    'item:armor_leather',
    'item:armor_plate',
    'item:axe_battle',
    'item:boots_iron',
    'item:boots_leather',
    'item:bow_long',
    'item:bow_short',
    'item:gloves_iron',
    'item:gloves_leather',
    'item:helm_iron',
    'item:helm_leather',
    'item:potion_hp_l',
    'item:potion_hp_s',
    'item:potion_mp_s',
    'item:scroll_armor',
    'item:scroll_weapon',
    'item:staff_oak',
    'item:sword_long',
    'item:sword_short',
  ],
  params: null,
  expected: null,
});

const 표의아이템 = [
  'potion_hp_s',
  'potion_hp_l',
  'potion_mp_s',
  'scroll_weapon',
  'scroll_armor',
  'sword_short',
  'sword_long',
  'bow_short',
  'bow_long',
  'staff_oak',
  'axe_battle',
  'helm_leather',
  'helm_iron',
  'armor_leather',
  'armor_chain',
  'armor_plate',
  'gloves_leather',
  'gloves_iron',
  'boots_leather',
  'boots_iron',
];

test(spec, async ({ admin }) => {
  await test.step('어드민 키로 어드민 API 가 열리는지 확인한다', async () => {
    await verify('어드민 키로 어드민 계정 목록을 부르면 200 이다', await 어드민열림(admin), 200, { blocker: true });
  });

  await test.step('아이템 템플릿 목록을 부른다', async () => {
    const 목록 = await 아이템템플릿들(admin);
    const 같음 = await verify('템플릿 id 가 아이템 표의 20가지와 같다', 목록.map((x) => x.id).sort().join(', '), [...표의아이템].sort().join(', '));
    const 빈칸 = await verify('name 이나 type 이 빈 줄이 없다', 목록.filter((x) => !x.name || !x.type).map((x) => x.id).join(', '), '');
    await verify('아이템 템플릿 목록의 id 가 아이템 표의 20가지와 같고 줄마다 name 과 type 이 있다', 같음 && 빈칸, true);
  });
});
