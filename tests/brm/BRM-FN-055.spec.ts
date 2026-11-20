import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { HUD이름뜰때까지, 로그인화면준비 } from './helpers/login-tools.helper.js';
import { 내이름, 지금화면, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기, 캐릭터값넣기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-055',
  name: '캐릭터 이름이 빈 계정으로 로그인하면 이름이 아이디로 보인다',
  platforms: ['android'],
  precondition: ['새 계정 캐릭터 이름이 비어 있다', '새 계정 캐릭터 이름이 「New Player」다'],
  techniques: ['동등 분할'],
  params: z.object({
    newId: z.string().describe('새 계정 아이디').optional().meta({ secret: true, account: '새 계정' }),
    newPassword: z.string().describe('새 계정 비밀번호').optional().meta({ secret: true, account: '새 계정' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 새 = 계정꺼내기(params.newId, params.newPassword, '새 계정');
  await test.cleanup('켜 둔 봇 끄기 · 새 계정 캐릭터 지우기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 새, 'new');
  });
  await test.step('새 계정 캐릭터 이름을 비운다', async () => {
    await 계정되돌리기(admin, 새, 'new');
    await 캐릭터값넣기(admin, 새, { charName: '' });
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('새 계정으로 로그인한다', async () => {
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    await verify('캐릭터 이름이 빈 계정으로 로그인하면 이름이 아이디로 보인다', await 내이름(game), 새.아이디);
  });
  await test.step('새 계정 캐릭터 이름을 「New Player」로 바꾼다', async () => {
    await 계정되돌리기(admin, 새, 'new');
    await 캐릭터값넣기(admin, 새, { charName: 'New Player' });
    await 로그인화면준비(game, driver);
    await verify('로그인 화면이 보인다', await 지금화면(game), '로그인', { blocker: true });
  });
  await test.step('새 계정으로 다시 로그인한다', async () => {
    await 로그인하기(game, driver, 새);
    await HUD이름뜰때까지(game, 새.아이디);
    await verify('이름이 아이디로 보인다', await 내이름(game), 새.아이디);
  });
});
