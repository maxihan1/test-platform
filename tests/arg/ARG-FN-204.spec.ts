import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 상단바골드, 실패걸기, 캐릭터 } from './helpers/game-state.helper.js';
import { 우편제목, 우편넣기, 우편줄기다리기 } from './helpers/economy.helper.js';
import { 우편함창 } from './pages/mail.page.js';

export const spec = defineCase({
  tcId: 'ARG-FN-204',
  name: '우편 비우기 저장이 실패하면 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다',
  platforms: ['android'],
  precondition: ['첨부 있는 우편이 있고 다음 우편 저장 요청이 실패하도록 걸어 두었다'],
  techniques: ['동등 분할'],
  elements: ['flow:골드-우편'],
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
      await 우편넣기(admin, 아이디, 'ARG-FN-204', [{ 이름: '체력 물약', 개수: 1 }], 100);
      await 로비로(game, 아이디, 비밀번호);
      await 우편줄기다리기(game, 'ARG-FN-204');
    });
    await test.step('우편함 창을 확인한다', async () => {
      await verify('우편함 창이 열려 있다', await 우편함창.지금(game).열렸나(), true, { blocker: true });
    });
    await test.step('그 우편의 「받기」를 누른다', async () => {
      const 창 = 우편함창.지금(game);
      const 전 = await 상단바골드(game);
      await 실패걸기(admin, '/api/savemailmessage');
      await 창.받기(우편제목('ARG-FN-204'));
      const 떴다 = await 창.hud.알림기다리기('우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요');
      await verify('우편 비우기 저장이 실패하면 「우편을 받지 못했습니다. 잠시 뒤 다시 시도해 주세요」 오류 알림이 뜬다', 떴다, true);
      const 화면 = await verify('상단 바 골드가 그대로다', await 상단바골드(game), 전);
      const 서버 = await verify('서버 골드가 그대로다', (await 캐릭터(admin, 아이디)).골드, 전);
      await verify('첨부 골드가 들어오지 않아 골드가 그대로다', 화면 && 서버, true);
    });
  } finally {
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  }
});
