import { defineCase, repeatUntil, test, verify } from '@platform/kit';

import { 스테이지까지 } from './helpers/enter.helper.js';
import { 메인메뉴로 } from './helpers/menu.helper.js';
import { 버티기조각, 판끝났나 } from './helpers/play.helper.js';
import { 캐릭터선택화면 } from './pages/char-select.page.js';
import { 결과창 } from './pages/ending.page.js';
import { 맵선택창 } from './pages/map-select.page.js';
import { 스테이지화면 } from './pages/stage.page.js';

export const spec = defineCase({
  tcId: 'CGP-GS-004',
  name: '악마가 세계수에 닿으면 세계수 체력이 계속 준다',
  platforms: ['windows'],
  precondition: ['첫 맵 1P 스테이지 · 고기 20'],
  params: null,
  expected: null,
});

const 준횟수 = (체력들: number[]): number => 체력들.filter((값, i) => i > 0 && 값 < (체력들[i - 1] ?? 값)).length;
const 늘었나 = (체력들: number[]): boolean => 체력들.some((값, i) => i > 0 && 값 > (체력들[i - 1] ?? 값));

test(spec, async ({ game }) => {
  let 스테이지!: 스테이지화면;

  await test.cleanup('스테이지에서 메인 메뉴로 나가기', async () => {
    await 메인메뉴로(game);
  });

  await test.step('첫 맵 스테이지에 들어가 길 옆에 식물 하나를 심는다', async () => {
    스테이지 = await 스테이지까지(game);
    await verify('고기가 20이다', await 스테이지.고기수(), 20, { blocker: true });
    await 스테이지.자리에심기([18.2, 27.0]);
  });

  await test.step('길 옆에 식물 하나를 심고 세계수가 무너질 때까지 둔다', async () => {
    const 체력들: number[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 버티기조각(game, 5, 체력들), {
        progress: async () => ((await 판끝났나(game)) ? 1 : 0),
        goal: 1,
        stallMs: 150_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    const 마지막체력 = 체력들.at(-1) ?? Number.NaN;
    const 계속줆 = await verify('세계수 체력이 두 번 넘게 줄었다', 준횟수(체력들) >= 2, true);
    const 안늘음 = await verify('세계수 체력이 중간에 늘지 않았다', 늘었나(체력들), false);
    await verify('악마가 세계수에 닿으면 세계수 체력이 계속 준다', 계속줆 && 안늘음, true);
    const 영 = await verify('세계수 체력이 0 이하다', 마지막체력 <= 0, true);
    const 끝 = await verify('판이 끝났다', await 판끝났나(game), true);
    await verify('세계수 체력이 0 이 되면 판이 진 채로 끝난다', 영 && 끝, true);

    const 결과 = await 결과창.넘기기(game);
    await verify('끝 연출 뒤 Enter 를 누르면 결과 창에 「패 배」가 보인다', 결과 === null ? '' : await 결과.승패글(), '패 배');
    const 직접 = 결과 === null ? Number.NaN : await 결과.점수('직접처치');
    const 식물 = 결과 === null ? Number.NaN : await 결과.점수('식물처치');
    const 총점 = 결과 === null ? Number.NaN : await 결과.점수('총점');
    await verify.note('결과 창 점수', `직접 처치 ${직접} · 식물 처치 ${식물} · 총점 ${총점}`);
    await verify('결과 창 총점은 직접 처치와 식물 처치를 1점씩 더한 값이다', 총점, 직접 + 식물);
    const 돌아감 = await verify('캐릭터 선택으로 돌아간다', 결과 === null ? false : await 결과.캐릭터선택으로(), true);
    const 선택 = await 캐릭터선택화면.기다리기(game);
    await 선택.고양이고르기();
    await 선택.준비뜰때까지();
    await 선택.준비누르기();
    const 맵 = await 맵선택창.기다리기(game);
    const 다시 = await verify('스테이지에 다시 들어간다', await 맵.들어가기(), true);
    await verify('결과 창에서 Enter 를 누르면 캐릭터 선택으로 돌아가고 같은 키 차례로 스테이지에 다시 들어간다', 돌아감 && 다시, true);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
