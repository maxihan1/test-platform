import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기, 색이름, 글자색읽기, 바탕색읽기 } from './helpers/economy.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-143',
  name: '안 읽은 우편 줄은 제목 앞에 금색 「● 」가 붙고 바탕이 옅은 금색으로 보인다',
  held: '보류 — 주소가 비었습니다(우편함에서 그 우편 줄을 못 찾음)',
  platforms: ['android'],
  precondition: ['첨부 없는 안 읽은 우편이 있는 일반 회원으로 로비에 있다'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 없는 우편을 보내 두고 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-143');
      await 로비로(game, 아이디, 비밀번호);
    });
    await test.step('로비에 들어왔는지 확인한다', async () => {
      await verify('로비에 「준비!」 버튼이 보인다', await 로비화면.지금(game).보이나(로비화면.준비), true, { blocker: true });
    });
    await test.step('우편함 창을 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-UI-143');
      const 줄 = (await 창.목록.이름줄(우편제목('ARG-UI-143'))) ?? '';
      const 점주소 = await 창.칸주소(우편제목('ARG-UI-143'), 0);
      const 점 = await verify('제목 앞에 「● 」가 붙는다', (await 창.목록.칸글(줄, 0)).startsWith('● '), true);
      const 점색 = await verify('「● 」가 금색이다', 색이름(await 글자색읽기(game, 점주소)), '금색');
      const 바탕 = await verify('줄 바탕이 금색이다', 색이름(await 바탕색읽기(game, 줄)), '금색');
      await verify('안 읽은 우편 줄은 제목 앞에 금색 「● 」가 붙고 바탕이 옅은 금색으로 보인다', 점 && 점색 && 바탕, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
