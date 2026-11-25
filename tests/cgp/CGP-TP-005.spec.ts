import { defineCase, defineProcedure, test, verify } from '@platform/kit';

import { 식물이있는판, 체력오를때까지 } from './helpers/stage-flow.helper.js';
import { 스테이지까지 } from './helpers/enter.helper.js';
import { 스테이지화면 } from './pages/stage.page.js';

const 심기 = defineCase({
  tcId: 'CGP-FN-052',
  name: '스테이지에서 X 를 누른 뒤 X 를 한 번 더 누르면 고양이 자리에 식물이 심기고 고기가 5 준다',
  platforms: ['windows'],
  smoke: true,
  precondition: ['첫 맵 스테이지에 들어와 고기가 20 이다'],
  params: null,
  expected: null,
});

const 식물머리 = defineCase({
  tcId: 'CGP-FN-088',
  name: '심은 식물 곁으로 다가가면 머리 위에 방패 숫자(레벨) · 초록 막대(체력) · 노란 막대(먹인 고기)가 나타난다',
  platforms: ['windows'],
  precondition: ['식물이 하나 심겨 있다'],
  params: null,
  expected: null,
});

const 체력줄어듦 = defineCase({
  tcId: 'CGP-FN-064',
  name: '심은 식물을 그대로 두면 시간이 지나며 체력이 준다',
  platforms: ['windows'],
  precondition: ['식물이 하나 심겨 있다'],
  params: null,
  expected: null,
});

const 겹쳐심기 = defineCase({
  tcId: 'CGP-FN-055',
  name: '심은 식물 바로 옆에서 X 를 두 번 누르면 식물이 더 심기지 않고 고기가 그대로다',
  platforms: ['windows'],
  precondition: ['식물이 하나 심겨 있다'],
  params: null,
  expected: null,
});

const 체력회복 = defineCase({
  tcId: 'CGP-FN-082',
  name: '체력이 80% 아래인 식물에 C 로 고기를 먹이면 먹인 고기는 그대로이고 체력이 오른다',
  platforms: ['windows'],
  precondition: ['식물 체력이 80% 아래로 줄었다'],
  held: '보류 — 판 중에는 악마가 식물을 쳐서 먹인 뒤 체력이 오르는지 가를 수 없다',
  params: null,
  expected: null,
});

const 체력영 = defineCase({
  tcId: 'CGP-FN-301',
  name: '식물 체력이 0 이 될 때까지 두면 잠시 뒤 식물이 사라진다',
  platforms: ['windows'],
  precondition: ['식물이 하나 심겨 있다'],
  held: '보류 — 식물 체력이 0 이 되는 동안 세계수를 지킬 길이 없다',
  params: null,
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'CGP-TP-005',
  name: '식물 하나 — 심기부터 겹쳐 심기까지',
  platforms: ['windows'],
  precondition: [],
  cases: [심기, 식물머리, 체력줄어듦, 겹쳐심기, 체력회복, 체력영],
});

test(procedure, async ({ game }) => {
  let 스테이지!: 스테이지화면;
  let 식물 = '';

  await test.case(심기, async () => {
    let 앞고기 = 0;
    await test.step('메인 메뉴에서 첫 맵 스테이지로 들어가 고기를 읽는다', async () => {
      스테이지 = await 스테이지까지(game);
      앞고기 = await 스테이지.고기수();
      await verify('고기가 20이다', 앞고기, 20, { blocker: true });
      await 스테이지.자리로가기([18.2, 27.0]);
    });
    await test.step('스테이지에서 X 를 누른 뒤 X 를 한 번 더 누른다', async () => {
      await 스테이지.여기심기();
      const 심김 = await verify('식물이 하나 심긴다', await 스테이지.식물수될때까지(1, 3_000), 1);
      const 줄어듦 = await verify('고기가 5 줄어든다', 앞고기 - (await 스테이지.고기바뀔때까지(앞고기, 3_000)), 5);
      await verify('스테이지에서 X 를 누른 뒤 X 를 한 번 더 누르면 고양이 자리에 식물이 심기고 고기가 5 준다', 심김 && 줄어듦, true);
    });
  });

  await test.case(식물머리, async () => {
    await test.step('스테이지에서 식물 하나가 심겨 있게 맞춘다', async () => {
      ({ 스테이지, 식물 } = await 식물이있는판(game));
    });
    await test.step('심은 식물 곁으로 다가간다', async () => {
      await 스테이지.식물곁에서기(식물);
      const 레벨 = await verify('방패 숫자(레벨)가 나타난다', await 스테이지.식물머리보이나('레벨'), true);
      const 체력 = await verify('초록 막대(체력)가 나타난다', await 스테이지.식물머리보이나('체력막대'), true);
      const 먹이 = await verify('노란 막대(먹인 고기)가 나타난다', await 스테이지.식물머리보이나('먹이막대'), true);
      await verify(
        '심은 식물 곁으로 다가가면 머리 위에 방패 숫자(레벨) · 초록 막대(체력) · 노란 막대(먹인 고기)가 나타난다',
        레벨 && 체력 && 먹이,
        true,
      );
    });
  });

  await test.case(체력줄어듦, async () => {
    await test.step('스테이지에서 심은 식물이 남아 있게 맞춘다', async () => {
      ({ 스테이지, 식물 } = await 식물이있는판(game));
    });
    await test.step('심은 식물의 체력을 두 번 읽는다', async () => {
      const 앞 = await 스테이지.식물체력(식물);
      const 뒤 = await 스테이지.체력줄때까지(식물, 앞, 10_000);
      await verify('심은 식물을 그대로 두면 시간이 지나며 체력이 준다', 뒤 < 앞, true);
    });
  });

  await test.case(겹쳐심기, async () => {
    await test.step('스테이지에서 식물 하나가 아직 심겨 있게 맞춘다', async () => {
      ({ 스테이지, 식물 } = await 식물이있는판(game));
    });
    await test.step('심은 식물 바로 옆에서 X 를 두 번 누른다', async () => {
      const 앞고기 = await 스테이지.고기수();
      await 스테이지.그자리X두번();
      const 뒤고기 = await 스테이지.고기바뀔때까지(앞고기, 3_000);
      const 안심김 = await verify('식물이 더 심기지 않는다', await 스테이지.식물수될때까지(1, 3_000), 1);
      const 그대로 = await verify('고기가 그대로다', 뒤고기, 앞고기);
      await verify('심은 식물 바로 옆에서 X 를 두 번 누르면 식물이 더 심기지 않고 고기가 그대로다', 안심김 && 그대로, true);
    });
  });

  await test.case(체력회복, async () => {
    await test.step('스테이지에서 식물 체력이 80% 아래가 될 때까지 기다린다', async () => {
      ({ 스테이지, 식물 } = await 식물이있는판(game));
      const 비율 = await 스테이지.체력비율아래될때까지(식물, 0.8, 40_000);
      if (비율 >= 0.8) throw new Error(`식물 체력이 40초 안에 80% 아래로 줄지 않았다 — 지금 ${String(비율)}`);
    });
    await test.step('체력이 80% 아래인 식물에 C 로 고기를 먹인다', async () => {
      await 스테이지.식물곁에서기(식물);
      const 앞먹임 = await 스테이지.먹인고기(식물);
      const 앞체력 = await 스테이지.식물체력(식물);
      await 스테이지.먹이기(1);
      const 뒤체력 = await 체력오를때까지(스테이지, 식물, 앞체력, 5_000);
      const 그대로 = await verify('먹인 고기가 그대로다', await 스테이지.먹인고기(식물), 앞먹임);
      const 오름 = await verify('체력이 오른다', 뒤체력 > 앞체력, true);
      await verify('체력이 80% 아래인 식물에 C 로 고기를 먹이면 먹인 고기는 그대로이고 체력이 오른다', 그대로 && 오름, true);
    });
  });

  await test.case(체력영, async () => {
    await test.step('스테이지에서 식물 하나가 심긴 판을 이어 받는다', async () => {
      ({ 스테이지 } = await 식물이있는판(game));
    });
    await test.step('식물 체력이 0 이 될 때까지 둔다', async () => {
      await verify('식물 체력이 0 이 될 때까지 두면 잠시 뒤 식물이 사라진다', await 스테이지.식물수될때까지(0, 130_000), 0);
    });
  });
});
