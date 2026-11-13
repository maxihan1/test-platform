import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 열린창닫기, 로비까지, 메인메뉴로 } from './helpers/login.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 가방창 } from './pages/bag.page.js';
import { 퀘스트창 } from './pages/quest.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-060',
  name: '다시 접속하면 골드가 나가기 전과 같다',
  platforms: ['android'],
  precondition: ['일반 회원 계정으로 로그인해 로비에 있다'],
  elements: ['quest:shop_buy', 'flow:골드-상점구매'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    const 대기실 = await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
    await verify('로비 화면에 상단 바가 보인다', await 대기실.hud.보이는지(), true, { blocker: true });
  });

  const 퀘스트이름 = '상점에서 물건 구매';
  let 앞골드 = 0;
  let 앞무기 = '';
  let 앞진행 = '';

  await test.step('골드 · 장착 무기 · 「상점에서 물건 구매」 진행을 적어 두고 메인 메뉴로 나갔다가 다시 로그인한다', async () => {
    앞골드 = await new 공통HUD(game).골드();
    const 가방 = await 가방창.열기(game);
    앞무기 = await 가방.칸이름원문('무기');
    await 열린창닫기(game);
    const 퀘스트 = await 퀘스트창.열기(game);
    앞진행 = await 퀘스트.진행(퀘스트이름);
    await 열린창닫기(game);
    await 메인메뉴로(game);
    await 로비까지(game, params.loginId ?? '', params.loginPassword ?? '');
  });

  await test.step('다시 접속한 뒤 골드 · 장착 무기 · 「상점에서 물건 구매」 진행을 확인한다', async () => {
    const hud = new 공통HUD(game);
    const 골드같다 = await hud.골드가될때까지(앞골드, 15_000).then(
      () => true,
      () => false,
    );
    await verify('다시 접속하면 골드가 나가기 전과 같다', 골드같다 && (await hud.골드()) === 앞골드, true);

    const 가방 = await 가방창.열기(game);
    const 무기같다 = await game.waitFor(`${가방창.칸('무기')}/Label[1]/Text`, { text: 앞무기, timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('장착 무기가 나가기 전과 같다', 무기같다 && (await 가방.칸이름원문('무기')) === 앞무기, true);
    await 열린창닫기(game);

    const 퀘스트 = await 퀘스트창.열기(game);
    const 진행같다 = await game.waitFor(`${퀘스트창.줄(await 퀘스트.줄찾기(퀘스트이름))}/Label[2]/Text`, { text: 앞진행, timeoutMs: 10_000 }).then(
      () => true,
      () => false,
    );
    await verify('「상점에서 물건 구매」 진행이 나가기 전과 같다', 진행같다 && (await 퀘스트.진행(퀘스트이름)) === 앞진행, true);
    await 열린창닫기(game);
  });
});
