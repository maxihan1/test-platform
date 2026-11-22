import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 실패걸기 } from './helpers/game-state.helper.js';
import { 로그인화면 } from './pages/login.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-034',
  name: '로그인 확인 요청이 실패하면 「접속 실패」 창에 「서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요」가 보인다',
  platforms: ['windows'],
  precondition: ['다음 로그인 확인 요청 한 번이 실패하게 걸어 두었다'],
  techniques: ['동등 분할'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  const 화면 = await 로그인화면.열림(game);
  await test.step('다음 로그인 확인 요청 한 번이 실패하게 건다', async () => {
    await 실패걸기(admin, '/api/login');
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    await 화면.넣고시작(아이디, 비밀번호);
    await verify('안내 창이 뜬다', await 화면.안내.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('안내 창 제목이 「접속 실패」다', await 화면.안내.제목(), '접속 실패');
    const 본문 = await verify('안내 창 본문에 「서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요」가 들어 있다', (await 화면.안내.본문()).includes('서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요'), true);
    await verify('로그인 확인 요청이 실패하면 「접속 실패」 창에 「서버에 문제가 생겼습니다. 잠시 뒤 다시 시도해 주세요」가 보인다', 제목 && 본문, true);
  });
});
