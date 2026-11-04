import { defineCase, test, verify } from '@platform/kit';

import { 어드민가방읽기, 어드민캐릭터고치기, 어드민캐릭터읽기, 어드민초기화 } from './helpers/admin.helper.js';
import { 장착장비수, 장착중인가 } from './helpers/character.helper.js';
import { 값읽기, 사냥터좌표, 장비다해제, 템플릿찾기, 플레이어만들기, type 캐릭터, type 플레이어 } from './helpers/game.helper.js';

export const spec = defineCase({
  tcId: 'ASA-FN-415',
  name: '어드민으로 캐릭터를 초기화하면 레벨이 1 이다',
  apiDoc: 1,
  precondition: ['레벨 · 골드 · 성향치 · 위치를 바꾸고 장비를 다 해제한 전사가 있다'],
  params: null,
  expected: null,
});

test(spec, async ({ request, admin }) => {
  let 나!: 플레이어;

  await test.step('일회용 계정으로 전사를 만들고 레벨 · 골드 · 성향치 · 위치를 바꾼다', async () => {
    나 = await 플레이어만들기(request, 'Warrior');
    await 장비다해제(request, 나);
    await 어드민캐릭터고치기(admin, 나.캐릭터번호, {
      level: 5,
      gold: 2000,
      alignment: -100,
      x: 사냥터좌표.Beginner.x,
      z: 사냥터좌표.Beginner.z,
    });
  });

  await test.step('바꾼 전사를 확인한다', async () => {
    const 지금 = await 어드민캐릭터읽기(admin, 나.캐릭터번호);
    await verify('캐릭터 레벨이 5 다', 지금.level, 5, { blocker: true });
    await verify('캐릭터 골드가 2000 이다', 지금.gold, 2000, { blocker: true });
    await verify('캐릭터 성향치가 −100 이다', 지금.alignment?.value, -100, {
      blocker: true,
    });
    await verify('캐릭터 구역이 마을이 아니다', 지금.zone !== 'Town', true, {
      blocker: true,
    });
    await verify('장착한 장비가 없다', 장착장비수(await 어드민가방읽기(admin, 나.캐릭터번호)), 0, { blocker: true });
  });

  await test.step('어드민으로 캐릭터를 초기화한다', async () => {
    const 값 = await 값읽기<Partial<캐릭터>>(await 어드민초기화(admin, 나.캐릭터번호));
    await verify('어드민으로 캐릭터를 초기화하면 레벨이 1 이다', 값.level, 1);
    await verify('초기화하면 골드가 시작 골드 500 이다', 값.gold, 500);
    const 가방 = await 어드민가방읽기(admin, 나.캐릭터번호);
    await verify('초기화하면 짧은 검을 장착하고 있다', 장착중인가(템플릿찾기(가방, 'sword_short')), true);
    await verify('초기화하면 가죽 갑옷을 장착하고 있다', 장착중인가(템플릿찾기(가방, 'armor_leather')), true);
    await verify('초기화하면 성향치가 0 이다', 값.alignment?.value, 0);
    await verify('초기화하면 구역이 마을 「Town」이다', 값.zone, 'Town');
  });
});
