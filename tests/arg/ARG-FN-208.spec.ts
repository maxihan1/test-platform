import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 데이터읽기 } from './helpers/game-state.helper.js';
import { 조건될때까지, 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-208',
  name: '운영툴이 만든 아이템을 받으면 운영툴이 붙인 아이템 번호 그대로 가방에 들어간다',
  platforms: ['android'],
  precondition: ['「녹슨 단검」을 첨부한 우편이 있는 일반 회원이 우편함 창을 열었다'],
  elements: ['item:rusty_dagger'],
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
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 우편을 받아 우편함 창을 연다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-FN-208', [{ 이름: '녹슨 단검', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-208');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누르고 가방 아이템 번호를 읽는다', async () => {
      const 창 = 우편함창.지금(game);
      await 창.받기(우편제목('ARG-FN-208'));
      await 조건될때까지(async () => (await 창.목록.칸글((await 창.목록.이름줄(우편제목('ARG-FN-208'))) ?? '', 2)) === '첨부 없음');
      await 창.닫기누르기();
      const 줄들 = await 데이터읽기(game, 'bag');
      const 단검줄 = 줄들.find((글) => 글.includes('녹슨 단검')) ?? '';
      const 번호 = Number(/(\d+)\D*$/.exec(단검줄)?.[1] ?? 'NaN');
      await verify('운영툴이 만든 아이템을 받으면 운영툴이 붙인 아이템 번호 그대로 가방에 들어간다', Number.isInteger(번호), true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
