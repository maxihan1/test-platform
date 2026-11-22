import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 골드맞추기, 총경험치, 퀘스트처음으로 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯, GM퀘스트완료, 스탯숫자 } from './helpers/gm.helper.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-452',
  name: '세 퀘스트 보상을 모두 받으면 골드가 500 늘고 받은 경험치가 모두 650 이다',
  platforms: ['windows'],
  precondition: ['일반 회원이 레벨 1 · 골드 0 이고 /gm quest done 으로 오늘 퀘스트 목표를 채웠다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('일반 회원이 레벨 1 · 골드 0 이고 오늘 퀘스트 목표를 채운 것을 확인한다', async () => {
    await verify('골드가 0 이다', await 골드맞추기(game, 0), true, { blocker: true });
    await verify('레벨이 1 이다', 스탯숫자(await GM스탯(game), '레벨'), 1, { blocker: true });
    await 퀘스트처음으로(game);
    await GM퀘스트완료(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    await verify('「상점에서 물건 구매」 진행이 「1/1」이다', await 퀘스트.진행글('상점에서 물건 구매'), '1/1', { blocker: true });
    await 퀘스트.닫기();
  });

  await test.step('세 퀘스트의 「보상 받기」를 모두 누르고 /gm stat 을 읽는다', async () => {
    const 전 = await GM스탯(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    for (const 이름 of ['임프 30마리 처치', '던전 보스 처치', '상점에서 물건 구매']) {
      await 퀘스트.보상받기(이름);
      await 퀘스트.받음이될때까지(이름);
    }
    await 퀘스트.닫기();
    const 후 = await GM스탯(game);
    const 골드 = await verify('골드가 500 늘어난다', 스탯숫자(후, '골드') - 스탯숫자(전, '골드'), 500);
    const 경험치 = await verify('받은 경험치가 모두 650 이다', 총경험치(후) - 총경험치(전), 650);
    await verify('세 퀘스트 보상을 모두 받으면 골드가 500 늘고 받은 경험치가 모두 650 이다', 골드 && 경험치, true);
  });
});
