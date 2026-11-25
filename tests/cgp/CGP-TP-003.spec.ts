import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 살아있는스테이지, 빨간글인가, 지점마다길이하나 } from './helpers/stage-flow.helper.js';
import { 맵선택까지 } from './helpers/enter.helper.js';
import { 뜰때까지 } from './helpers/menu.helper.js';
import { 맵선택창 } from './pages/map-select.page.js';
import { 일시정지창 } from './pages/pause.page.js';
import { 스테이지화면 } from './pages/stage.page.js';

const 스테이지열기 = defineCase({
  tcId: 'CGP-FN-025',
  name: '맵 선택에서 첫 맵 「소심한 눈사람」을 고르고 Enter 를 누르면 스테이지가 열린다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['「맵 선택」 창이 열려 있다'],
  params: null,
  expected: null,
});

const 시작문구 = defineCase({
  tcId: 'CGP-FN-253',
  name: '스테이지가 열리면 「악마들이 쳐들어옵니다. 식물을 심고 악마들을 무찌를 준비를 하세요!」가 보인다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['스테이지가 막 열렸다'],
  params: null,
  expected: null,
});

const 시작고기 = defineCase({
  tcId: 'CGP-FN-256',
  name: '첫 맵 1P 로 스테이지를 시작하면 고기는 20 이다',
  platforms: ['windows'],
  precondition: ['첫 맵을 1P 로 시작했다'],
  params: null,
  expected: null,
});

const 웨이브칸 = defineCase({
  tcId: 'CGP-FN-022',
  name: '스테이지 화면 위를 읽으면 다음 웨이브까지 남은 시간 · 지금 웨이브 / 전체 웨이브 · 남은 악마 수가 보인다',
  platforms: ['windows'],
  precondition: ['스테이지에 있다'],
  params: null,
  expected: null,
});

const 전체웨이브 = defineCase({
  tcId: 'CGP-FN-028',
  name: '첫 맵 「소심한 눈사람」에서 웨이브 칸을 읽으면 전체 웨이브는 6 이다',
  platforms: ['windows'],
  precondition: ['첫 맵 스테이지에 있다'],
  params: null,
  expected: null,
});

const 첫웨이브악마 = defineCase({
  tcId: 'CGP-FN-031',
  name: '첫 맵 1웨이브 악마가 다 나오면 남은 악마는 30 이다',
  platforms: ['windows'],
  precondition: ['첫 맵 1웨이브가 시작됐다'],
  params: null,
  expected: null,
});

const 일시정지버튼 = defineCase({
  tcId: 'CGP-FN-259',
  name: '스테이지에서 Esc 를 누르면 일시정지 창에 「돌아가기」 · 「게임 가이드」 · 「환경설정」 · 「로비」 · 「메인메뉴」 버튼이 보인다',
  platforms: ['windows'],
  precondition: ['스테이지에 있다'],
  params: null,
  expected: null,
});

const 웨이브안넘어감 = defineCase({
  tcId: 'CGP-FN-012',
  name: '악마를 잡지 않고 세계수가 무너질 때까지 두면 웨이브 칸은 1/6 에서 넘어가지 않는다',
  platforms: ['windows'],
  precondition: ['첫 맵 1웨이브 악마가 남아 있다'],
  techniques: ['결정 테이블'],
  params: null,
  expected: null,
});

const 출현과길 = defineCase({
  tcId: 'CGP-FN-293',
  name: '1웨이브가 시작되면 악마가 모든 출현 지점에서 한꺼번에 나와 자기 길만 따라온다',
  platforms: ['windows'],
  precondition: ['첫 맵 1웨이브가 시작됐다'],
  held: '보류 — 악마마다 나온 출현 지점과 길을 가를 주소를 모른다',
  params: z.object({
    악마틀: z.string().describe('1웨이브 악마 오브젝트 주소 — 순번 [n] 앞까지'),
    지점칸: z.string().describe('악마가 나온 출현 지점을 읽는 칸 — 컴포넌트.칸'),
    길칸: z.string().describe('악마가 따라가는 길을 읽는 칸 — 컴포넌트.칸'),
    출현지점수: z.number().int().min(1).describe('첫 맵의 출현 지점 수'),
  }),
  expected: null,
});

const 남은악마색 = defineCase({
  tcId: 'CGP-FN-295',
  name: '악마가 몰려오는 중에 남은 악마 칸을 읽으면 글이 빨간색이다',
  platforms: ['windows'],
  precondition: ['악마가 몰려오는 중이다'],
  held: '보류 — 남은 악마 칸의 글 색을 읽는 컴포넌트를 모른다',
  params: z.object({
    글색칸: z.string().describe('남은 악마 칸의 글 색을 읽는 칸 — 컴포넌트.칸'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-003',
  name: '스테이지 — 들어가기부터 세계수가 무너질 때까지',
  platforms: ['windows'],
  precondition: [],
  cases: [스테이지열기, 시작문구, 첫웨이브악마, 시작고기, 웨이브칸, 전체웨이브, 일시정지버튼, 웨이브안넘어감, 출현과길, 남은악마색],
});

test(procedure, async ({ game }) => {
  let 스테이지!: 스테이지화면;
  let 정지!: 일시정지창;

  await test.case(스테이지열기, async () => {
    let 맵!: 맵선택창;
    await test.step('캐릭터 선택에서 식물 셋을 채워 「맵 선택」 창을 연다', async () => {
      맵 = await 맵선택까지(game);
      await verify('「맵 선택」 창이 열려 있다', await 맵.보이나(맵선택창.창), true, { blocker: true });
    });
    await test.step('「맵 선택」 창에서 첫 맵 「소심한 눈사람」을 두고 Enter 를 누른다', async () => {
      const 이름 = await verify('고른 맵이 「소심한 눈사람」이다', await 맵.글(맵선택창.맵이름), '소심한 눈사람');
      const 열림 = await verify('스테이지 장면이 뜬다', await 맵.들어가기(), true);
      await verify('맵 선택에서 첫 맵 「소심한 눈사람」을 고르고 Enter 를 누르면 스테이지가 열린다', 이름 && 열림, true);
    });
  });

  await test.case(시작문구, async () => {
    await test.step('열린 스테이지 화면을 기다린다', async () => {
      스테이지 = await 스테이지화면.기다리기(game);
    });
    await test.step('스테이지가 열린 바로 뒤 시작 문구를 읽는다', async () => {
      await verify(
        '스테이지가 열리면 「악마들이 쳐들어옵니다. 식물을 심고 악마들을 무찌를 준비를 하세요!」가 보인다',
        await 스테이지.시작문구뜰때까지(),
        '악마들이 쳐들어옵니다. 식물을 심고 악마들을 무찌를 준비를 하세요!',
      );
    });
  });

  await test.case(첫웨이브악마, async () => {
    await test.step('1웨이브 악마가 다 나올 때까지 남은 악마 칸을 읽는다', async () => {
      await verify('첫 맵 1웨이브 악마가 다 나오면 남은 악마는 30 이다', await 스테이지.남은악마최대(40_000), 30);
    });
  });

  await test.case(시작고기, async () => {
    await test.step('스테이지 화면의 고기 칸을 읽는다', async () => {
      await verify('첫 맵 1P 로 스테이지를 시작하면 고기는 20 이다', await 스테이지.고기수(), 20);
    });
  });

  await test.case(웨이브칸, async () => {
    await test.step('스테이지 화면 위 웨이브 칸을 읽는다', async () => {
      const 시간 = await verify('다음 웨이브까지 남은 시간이 보인다', await 뜰때까지(game, 스테이지화면.남은시간, 5_000), true);
      const 웨이브 = await verify('지금 웨이브 / 전체 웨이브가 보인다', await 뜰때까지(game, 스테이지화면.웨이브, 5_000), true);
      const 악마 = await verify('남은 악마 수가 보인다', await 뜰때까지(game, 스테이지화면.남은악마, 5_000), true);
      await verify(
        '스테이지 화면 위를 읽으면 다음 웨이브까지 남은 시간 · 지금 웨이브 / 전체 웨이브 · 남은 악마 수가 보인다',
        시간 && 웨이브 && 악마,
        true,
      );
    });
  });

  await test.case(전체웨이브, async () => {
    await test.step('웨이브 칸의 전체 웨이브 수를 읽는다', async () => {
      const 글 = await 스테이지.웨이브글();
      await verify('첫 맵 「소심한 눈사람」에서 웨이브 칸을 읽으면 전체 웨이브는 6 이다', Number(글.split('/')[1]), 6);
    });
  });

  await test.case(일시정지버튼, async () => {
    await test.step('스테이지에서 Esc 를 누른다', async () => {
      정지 = await 일시정지창.열기(game);
      const 돌아가기 = await verify('「돌아가기」 버튼이 보인다', await 정지.버튼글('돌아가기'), '돌아가기');
      const 가이드 = await verify('「게임 가이드」 버튼이 보인다', await 정지.버튼글('게임 가이드'), '게임 가이드');
      const 환경설정 = await verify('「환경설정」 버튼이 보인다', await 정지.버튼글('환경설정'), '환경설정');
      const 로비 = await verify('「로비」 버튼이 보인다', await 정지.버튼글('로비'), '로비');
      const 메인메뉴 = await verify('「메인메뉴」 버튼이 보인다', await 정지.버튼글('메인메뉴'), '메인메뉴');
      const 배치 = await game.layout(일시정지창.창);
      await verify('일시정지 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
      await verify(
        '스테이지에서 Esc 를 누르면 일시정지 창에 「돌아가기」 · 「게임 가이드」 · 「환경설정」 · 「로비」 · 「메인메뉴」 버튼이 보인다',
        돌아가기 && 가이드 && 환경설정 && 로비 && 메인메뉴,
        true,
      );
    });
    await test.step('일시정지 창에서 「돌아가기」를 눌러 닫는다', async () => {
      await 정지.누르기('돌아가기');
      await verify('일시정지 창이 닫힌다', await 정지.닫혔나(), true);
    });
  });

  await test.case(웨이브안넘어감, async () => {
    await test.step('악마를 잡지 않고 세계수가 무너질 때까지 둔다', async () => {
      const 무너짐 = await verify('세계수가 무너진다', await 스테이지.판끝날때까지(90_000), true);
      const 웨이브 = await verify('웨이브 칸이 「1/6」이다', await 스테이지.웨이브글(), '1/6');
      await verify('악마를 잡지 않고 세계수가 무너질 때까지 두면 웨이브 칸은 1/6 에서 넘어가지 않는다', 무너짐 && 웨이브, true);
    });
  });

  await test.case(출현과길, async ({ params }) => {
    await test.step('스테이지에서 1웨이브 악마가 다 나올 때까지 기다린다', async () => {
      스테이지 = await 살아있는스테이지(game);
      if (!(await 스테이지.남은악마될때까지('30', 30_000))) throw new Error('1웨이브 악마가 30 이 되지 않았다');
    });
    await test.step('1웨이브 악마가 나오는 자리와 길을 본다', async () => {
      const 지점들: string[] = [];
      const 길들: string[] = [];
      for (let 순번 = 0; 순번 < 30; 순번 += 1) {
        const 주소 = `${params.악마틀}[${String(순번)}]`;
        지점들.push(String(await game.get(주소, params.지점칸)));
        길들.push(String(await game.get(주소, params.길칸)));
      }
      const 지점 = await verify('악마가 나온 출현 지점의 수가 첫 맵의 출현 지점 수와 같다', new Set(지점들).size, params.출현지점수);
      const 길 = await verify('출현 지점마다 악마가 따라오는 길이 하나다', 지점마다길이하나(지점들, 길들), true);
      await verify('1웨이브가 시작되면 악마가 모든 출현 지점에서 한꺼번에 나와 자기 길만 따라온다', 지점 && 길, true);
    });
  });

  await test.case(남은악마색, async ({ params }) => {
    await test.step('스테이지에서 악마가 몰려올 때까지 기다린다', async () => {
      스테이지 = await 살아있는스테이지(game);
      if (!(await 스테이지.남은악마될때까지('30', 30_000))) throw new Error('악마가 30 마리가 되지 않았다');
    });
    await test.step('남은 악마 칸의 글 색을 읽는다', async () => {
      await verify(
        '악마가 몰려오는 중에 남은 악마 칸을 읽으면 글이 빨간색이다',
        await 빨간글인가(game, 스테이지화면.남은악마, params.글색칸),
        true,
      );
    });
  });
});
