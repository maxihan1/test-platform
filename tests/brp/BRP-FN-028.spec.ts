import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 거절창기다리기 } from './helpers/screen-check.helper.js';
import { 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-028',
  name: '점검 중에 허용 계정이 아닌 계정으로 로그인하면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다',
  platforms: ['windows'],
  precondition: ['허용 계정 없는 점검이 켜져 있다'],
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

  const 안내문구 = '[QA] 점검 안내 문구';
  await test.step('허용 계정 없는 점검을 켠다', async () => {
    await 점검바꾸기(admin, { enabled: true, message: 안내문구, allowedAccountIds: [] });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    const 창 = await 거절창기다리기(game, 아이디, 비밀번호, '서버 점검 중');
    await verify('점검 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 제목맞음 = await verify('안내 창 제목이 「서버 점검 중」이다', 창?.제목, '서버 점검 중');
    const 문구맞음 = await verify('안내 창 본문에 운영툴에 적은 점검 안내 문구가 들어 있다', (창?.본문 ?? '').includes(안내문구), true);
    await verify('점검 중에 허용 계정이 아닌 계정으로 로그인하면 「서버 점검 중」 창에 운영툴에 적은 점검 안내 문구가 보인다', 제목맞음 && 문구맞음, true);
  });
});
