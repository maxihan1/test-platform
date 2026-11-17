import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 글색읽기, 금색인가, 회색인가 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 우편보내기 } from './helpers/game-state.helper.js';
import { 우편메뉴글될때까지, 우편받기, 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 보낸사람과본문이어졌나, 줄에버튼있나 } from './helpers/mail.helper.js';
import { 로비화면 } from './pages/lobby.page.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-328',
  name: '우편함 창 우편 줄 둘째 칸에 보낸 사람과 본문이 「 · 」로 이어져 보인다',
  platforms: ['android'],
  precondition: ['일반 회원 우편함에 첨부를 받은 우편 1통과 「체력 물약」 2개 · 골드 100 이 첨부된 우편 1통이 있다'],
  elements: ['item:health_potion', 'flow:골드-우편'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 본문 = '우편 줄 시험';
  const 받은우편 = 우편제목('ARG-UI-328-A');
  const 남은우편 = 우편제목('ARG-UI-328-B');
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부를 받은 우편과 첨부가 남은 우편을 만든다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편보내기(admin, 아이디, { 제목: 받은우편, 본문, 아이템: [{ 이름: '체력 물약', 개수: 1 }] });
      await 로비로(game, 아이디, 비밀번호);
      await 우편받기(game, 'ARG-UI-328-A');
      await 우편보내기(admin, 아이디, { 제목: 남은우편, 본문, 아이템: [{ 이름: '체력 물약', 개수: 2 }], 골드: 100 });
      await 우편메뉴글될때까지(game, '우편 1');
    });
    await test.step('로비 메뉴를 확인한다', async () => {
      await verify('로비 메뉴가 「우편 1」로 보인다', await 로비화면.지금(game).hud.우편메뉴글(), '우편 1', { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-UI-328-B');
      const 받은둘째 = await verify('첨부를 받은 우편 줄 둘째 칸에 보낸 사람과 본문이 「 · 」로 이어져 보인다', 보낸사람과본문이어졌나(await 창.줄칸글(받은우편, 1), 본문), true);
      const 남은둘째 = await verify('첨부가 남은 우편 줄 둘째 칸에 보낸 사람과 본문이 「 · 」로 이어져 보인다', 보낸사람과본문이어졌나(await 창.줄칸글(남은우편, 1), 본문), true);
      await verify('우편함 창 우편 줄 둘째 칸에 보낸 사람과 본문이 「 · 」로 이어져 보인다', 받은둘째 && 남은둘째, true);
      await verify('우편함 창 첨부가 남은 우편 줄에 「첨부: 체력 물약x2, 100 골드」가 보인다', await 창.줄칸글(남은우편, 2), '첨부: 체력 물약x2, 100 골드');
      await verify('첨부가 남은 우편의 첨부 줄 글자가 금색이다', 금색인가(await 글색읽기(game, await 창.칸주소(남은우편, 2))), true);
      await verify('우편함 창 첨부를 받은 우편 줄에 「첨부 없음」이 보인다', await 창.줄칸글(받은우편, 2), '첨부 없음');
      await verify('「첨부 없음」 글자가 회색이다', 회색인가(await 글색읽기(game, await 창.칸주소(받은우편, 2))), true);
      const 받은받기 = await verify('첨부를 받은 우편 줄에 「받기」가 없다', !(await 줄에버튼있나(창, 받은우편, '받기')), true);
      const 남은받기 = await verify('첨부가 남은 우편 줄에 「받기」가 보인다', await 줄에버튼있나(창, 남은우편, '받기'), true);
      await verify('「받기」는 첨부가 남은 우편 줄에만 보인다', 받은받기 && 남은받기, true);
      const 받은삭제 = await verify('첨부를 받은 우편 줄에 「삭제」가 보인다', await 줄에버튼있나(창, 받은우편, '삭제'), true);
      const 남은삭제 = await verify('첨부가 남은 우편 줄에 「삭제」가 보인다', await 줄에버튼있나(창, 남은우편, '삭제'), true);
      await verify('「삭제」는 두 우편 줄에 다 보인다', 받은삭제 && 남은삭제, true);
      const 배치 = await game.layout(우편함창.창);
      await verify('우편함 창의 누를 수 있는 것이 화면 안에 있고 서로 겹치지 않는다', 배치.problems, []);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
