import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 거절창기다리기 } from './helpers/screen-check.helper.js';
import { 점검끄기, 점검바꾸기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-029',
  name: '끝나는 시각이 있는 점검 중에 로그인하면 점검 안내 창에 「종료 예정:」과 「(UTC)」가 든 줄이 보인다',
  platforms: ['windows'],
  precondition: ['끝나는 시각이 있는 점검이 켜져 있다'],
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

  await test.step('끝나는 시각이 있는 점검을 켠다', async () => {
    const 끝 = new Date(Date.now() + 3_600_000).toISOString();
    await 점검바꾸기(admin, { enabled: true, message: '[QA] 기간 점검', allowedAccountIds: [], endsAt: 끝 });
  });

  await test.step('일반 회원으로 「게임 시작」을 누른다', async () => {
    const 창 = await 거절창기다리기(game, 아이디, 비밀번호, '서버 점검 중');
    await verify('점검 안내 창이 뜬다', 창 !== null, true, { blocker: true });
    const 줄 = (창?.본문 ?? '').split('\n').find((글) => 글.includes('종료 예정:'));
    const 예정줄 = await verify('본문에 「종료 예정:」 줄이 있다', 줄 !== undefined, true);
    const 표준시 = await verify('「종료 예정:」 줄에 「(UTC)」가 들어 있다', (줄 ?? '').includes('(UTC)'), true);
    await verify('끝나는 시각이 있는 점검 중에 로그인하면 점검 안내 창에 「종료 예정:」과 「(UTC)」가 든 줄이 보인다', 예정줄 && 표준시, true);
  });
});
