import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 금색인가 } from './helpers/connect.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';
import { 색이름, 우편넣기, 우편메뉴글될때까지, 우편제목, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 안읽음표식색, 줄바탕색 } from './helpers/mail.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'ARG-UI-143',
  name: '우편함 창에 안 읽은 우편 제목 앞 「● 」가 금색으로 보인다',
  platforms: ['android'],
  precondition: ['우편함이 빈 일반 회원에게 첨부 있는 우편 1통을 보내 두었다'],
  elements: ['item:health_potion'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 제목 = 우편제목('ARG-UI-143');
  try {
    await test.step('일반 회원 계정을 처음 상태로 되돌리고 첨부 있는 우편 1통을 보낸 뒤 로그인한다', async () => {
      await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
      await 우편넣기(admin, 아이디, 'ARG-UI-143', [{ 이름: '체력 물약', 개수: 1 }]);
      await 로비로(game, 아이디, 비밀번호);
      await 우편메뉴글될때까지(game, '우편 1');
    });
    await test.step('로비 메뉴를 확인한다', async () => {
      await verify('로비 메뉴가 「우편 1」로 보인다', await 로비화면.지금(game).hud.우편메뉴글(), '우편 1', { blocker: true });
    });
    await test.step('로그인해 우편함 창을 처음 연다', async () => {
      const 창 = await 우편줄기다리기(game, 'ARG-UI-143');
      const 표식 = await verify('안 읽은 우편 제목 앞에 「● 」가 있다', await 창.줄칸글(제목, 0), `● ${제목}`);
      const 금색 = await verify('「● 」가 금색이다', 금색인가(await 안읽음표식색(game, 창, 제목)), true);
      await verify('우편함 창에 안 읽은 우편 제목 앞 「● 」가 금색으로 보인다', 표식 && 금색, true);
      const 바탕 = await 줄바탕색(game, 창, 제목);
      const 바탕금색 = await verify('우편 줄 바탕이 금색이다', 색이름(바탕), '금색');
      const 바탕옅음 = await verify('우편 줄 바탕의 알파가 1 보다 작다', (바탕[3] ?? 1) < 1, true);
      await verify('우편함 창에 안 읽은 우편 줄 바탕이 옅은 금색으로 보인다', 바탕금색 && 바탕옅음, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
