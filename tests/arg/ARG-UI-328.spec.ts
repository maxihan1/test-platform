import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기, 색이름, 글자색읽기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-328',
  name: '첨부 있는 우편 줄에 금색 「첨부: …」와 「받기」 · 「삭제」가 보인다',
  held: '보류 — 주소가 비었습니다(우편함에서 그 우편 줄을 못 찾음)',
  platforms: ['android'],
  precondition: ['첨부 있는 우편과 첨부 없는 우편이 하나씩 있는 일반 회원으로 로비에 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 있는 우편과 첨부 없는 우편을 보내 두고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-328 첨부', [{ 이름: '체력 물약', 개수: 1 }]);
      await 우편넣기(admin, 아이디, 'ARG-UI-328 없음', []);
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-UI-328 없음');
      const 줄 = (await 창.목록.이름줄(우편제목('ARG-UI-328 첨부'))) ?? '';
      const 첨부 = await verify('첨부 줄이 「첨부: …」로 보인다', (await 창.줄칸글(우편제목('ARG-UI-328 첨부'), 2)).startsWith('첨부:'), true);
      const 금색 = await verify('첨부 줄이 금색이다', 색이름(await 글자색읽기(game, await 창.칸주소(우편제목('ARG-UI-328 첨부'), 2))), '금색');
      const 받기 = await verify('「받기」가 보인다', (await 창.목록.줄버튼(줄, '받기')) !== null, true);
      const 삭제 = await verify('「삭제」가 보인다', (await 창.목록.줄버튼(줄, '삭제')) !== null, true);
      await verify('첨부 있는 우편 줄에 금색 「첨부: …」와 「받기」 · 「삭제」가 보인다', 첨부 && 금색 && 받기 && 삭제, true);
    });
    await test.step('첨부 없는 우편 줄을 확인한다', async () => {
      const 창 = 우편함창.지금(game);
      const 줄 = (await 창.목록.이름줄(우편제목('ARG-UI-328 없음'))) ?? '';
      const 글 = await verify('첨부 없는 줄에 「첨부 없음」이 보인다', await 창.줄칸글(우편제목('ARG-UI-328 없음'), 2), '첨부 없음');
      const 회색 = await verify('「첨부 없음」이 회색이다', 색이름(await 글자색읽기(game, await 창.칸주소(우편제목('ARG-UI-328 없음'), 2))), '회색');
      const 삭제 = await verify('「삭제」가 보인다', (await 창.목록.줄버튼(줄, '삭제')) !== null, true);
      const 받기없음 = await verify('「받기」가 없다', await 창.목록.줄버튼(줄, '받기'), null);
      await verify('첨부 없는 우편 줄에는 회색 「첨부 없음」과 「삭제」만 보이고 「받기」가 없다', 글 && 회색 && 삭제 && 받기없음, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
