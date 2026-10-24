import { defineCase, test, verify } from '@platform/kit';

import { type 캐릭터, 캐릭터정보받기 } from './helpers/api.helper.js';
import { 게임입장 } from './helpers/game-enter.helper.js';
import { 구역자리, 새캐릭터, 스폰목록, 스폰앞으로, 스폰찾기, 캐릭터지우기 } from './helpers/game-state.helper.js';
import { 가까운스폰, 몬스터처치 } from './helpers/world.helper.js';
import { GM콘솔 } from './pages/gm-console.page.js';
import { 월드화면 } from './pages/world.page.js';

export const spec = defineCase({
  tcId: 'ASH-FN-073',
  name: '몬스터마다 처치를 보고하면 받는 경험치 · 골드가 몬스터 표의 값과 같다',
  platforms: ['android'],
  precondition: ['새 전사 캐릭터가 있다', '새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있다'],
  elements: ['monster:Imp', 'monster:ImpBoss', 'monster:VandalImp', 'zone:Beginner'],
  params: null,
  expected: null,
});

function 골드꼴(받은: number, 낮: number, 높: number): string {
  return 받은 >= 낮 && 받은 <= 높 ? `${String(낮)}~${String(높)}` : String(받은);
}

test(spec, async ({ game, admin, request }) => {
  let 누구: 캐릭터 | undefined;
  let 입장용: 캐릭터 | undefined;
  try {
    await test.step('새 전사 캐릭터를 만든다', async () => {
      누구 = await 새캐릭터(admin, 'qafn073');
    });
    await test.step('새 전사 캐릭터가 있는지 확인한다', async () => {
      await verify('새 전사 캐릭터가 있다', (await 캐릭터정보받기(request, 누구!)).classType, 'Warrior', { blocker: true });
    });
    await test.step('몬스터마다 스폰 앞으로 옮겨 처치를 보고한다', async () => {
      const 나 = 누구!;
      const 임프스폰 = await 스폰찾기(admin, 'Beginner', 'Imp');
      await 스폰앞으로(admin, 나, 임프스폰);
      const 임프 = await 몬스터처치(request, 나, 임프스폰);
      const 반달스폰 = await 스폰찾기(admin, 'Intermediate', 'VandalImp');
      await 스폰앞으로(admin, 나, 반달스폰);
      const 반달 = await 몬스터처치(request, 나, 반달스폰);
      const 군주스폰 = await 스폰찾기(admin, 'Boss', 'ImpBoss');
      await 스폰앞으로(admin, 나, 군주스폰);
      const 군주 = await 몬스터처치(request, 나, 군주스폰);
      const 임프표 = await verify.element('임프 처치 경험치 · 골드가 몬스터 표와 같다', 'monster:Imp', { 경험치: 임프.expGained, 골드: 골드꼴(임프.goldGained, 8, 15) }, { 경험치: 20, 골드: '8~15' });
      const 반달표 = await verify.element('반달 임프 처치 경험치 · 골드가 몬스터 표와 같다', 'monster:VandalImp', { 경험치: 반달.expGained, 골드: 골드꼴(반달.goldGained, 30, 55) }, { 경험치: 90, 골드: '30~55' });
      const 군주표 = await verify.element('임프 군주 처치 경험치 · 골드가 몬스터 표와 같다', 'monster:ImpBoss', { 경험치: 군주.expGained, 골드: 골드꼴(군주.goldGained, 800, 1200) }, { 경험치: 2000, 골드: '800~1200' });
      await verify('몬스터마다 처치를 보고하면 받는 경험치 · 골드가 몬스터 표의 값과 같다', 임프표 && 반달표 && 군주표, true);
    });
    await test.step('게임에 들어갈 새 전사 캐릭터를 만든다', async () => {
      입장용 = await 새캐릭터(admin, 'qafn073');
    });
    await test.step('새 전사 캐릭터로 게임에 들어와 하늘빛 마을에 있는지 확인한다', async () => {
      const 월드 = await 게임입장(game, 입장용!);
      await verify('월드 화면 구역 이름에 「하늘빛 마을」이 보인다', await 월드.구역글(), '하늘빛 마을', { blocker: true });
    });
    await test.step('초록 들판으로 옮겨 임프 이름표를 읽는다', async () => {
      const 스폰값 = 가까운스폰(await 스폰목록(admin), 'Beginner', 구역자리.Beginner);
      const 콘솔 = await GM콘솔.열기(game);
      await 콘솔.순간이동누르기('TeleportBeginner');
      await 콘솔.닫기누르기();
      await 콘솔.닫힐때까지();
      const 월드 = new 월드화면(game);
      await 월드.구역글뜰때까지('초록 들판');
      const 주소 = 월드.몬스터이름표(스폰값.id, 'Imp');
      await 월드.이름표뜰때까지(주소);
      const 글 = await 월드.이름표글(주소);
      await verify('초록 들판에서 임프 이름표에 몬스터 표의 레벨 「Lv.3」이 보인다', 글.includes('Lv.3'), true);
    });
  } finally {
    if (누구 !== undefined) await 캐릭터지우기(admin, 누구);
    if (입장용 !== undefined) await 캐릭터지우기(admin, 입장용);
  }
});
