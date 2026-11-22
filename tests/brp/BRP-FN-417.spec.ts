import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 안내창 } from './components/popup.component.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-417',
  name: '접속 중에 점검이 걸리면 30초 안팎(45초 안)에 서버가 내보내 「서버 점검 중」 창이 뜬다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: z.object({
    한도초: z.number().describe('점검 창이 뜨는 한도(초)').default(45),
  }),
});

test(spec, async ({ game, admin, params, expected }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('점검 끄기', () => 점검끄기(admin));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('허용 계정 없는 점검을 켜고 기다린다', async () => {
    const 시작 = Date.now();
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 점검 안내 문구', allowedAccountIds: [] });
    const 창 = new 안내창(game);
    const 떴다 = await verify('안내 창이 뜬다', await 창.뜰때까지(60_000), true);
    const 걸린초 = (Date.now() - 시작) / 1000;
    const 제목 = await verify('안내 창 제목이 「서버 점검 중」이다', 떴다 ? await 창.제목() : '', '서버 점검 중');
    const 시간 = await verify('한도 안에 뜬다', 걸린초 <= expected.한도초, true);
    await verify('접속 중에 점검이 걸리면 30초 안팎(45초 안)에 서버가 내보내 「서버 점검 중」 창이 뜬다', 떴다 && 제목 && 시간, true);
  });
});
