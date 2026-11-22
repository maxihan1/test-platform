import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-418',
  name: '점검으로 내보내지면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다',
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
  await test.cleanup('점검 끄기', () => 점검끄기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('안내 문구를 적은 점검을 켜고 서버가 내보낼 때까지 기다린다', async () => {
    const 안내문구 = '[QA] 점검 안내 문구';
    await 점검바꾸기(admin, { enabled: true, message: 안내문구, allowedAccountIds: [] });
    const 창 = new 안내창(game);
    const 끝 = Date.now() + 60_000;
    let 제목 = '';
    while (제목 !== '서버 점검 중' && Date.now() < 끝) 제목 = (await 창.보이나()) ? await 창.제목() : '';
    await verify('「서버 점검 중」 창이 보인다', 제목, '서버 점검 중', { blocker: true });
    await verify('점검으로 내보내지면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다', await 창.본문(), 안내문구);
  });
});
