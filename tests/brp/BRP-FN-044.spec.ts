import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 접속끊기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-044',
  name: '서버가 게임을 닫으면 「연결 끊김」 창에 「서버가 게임을 종료했습니다」가 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('시험 주소로 일반 회원의 접속을 끊는다', async () => {
    await 접속끊기(admin, 아이디);
    const 창 = new 안내창(game);
    await verify('안내 창이 뜬다', await 창.뜰때까지(20_000), true, { blocker: true });
    const 제목 = await verify('안내 창 제목이 「연결 끊김」이다', await 창.제목(), '연결 끊김');
    const 본문 = await verify('안내 창 본문에 「서버가 게임을 종료했습니다」가 들어 있다', (await 창.본문()).includes('서버가 게임을 종료했습니다'), true);
    await verify('서버가 게임을 닫으면 「연결 끊김」 창에 「서버가 게임을 종료했습니다」가 보인다', 제목 && 본문, true);
  });
});
