import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇이길드만들기, 봇이볼때까지 } from './helpers/social.helper.js';
import { 계정되돌리기, 봇끄기, 봇시키기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-FN-468',
  name: '이미 길드가 있는데 만들기를 하면 「이미 길드에 들어가 있습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['두 번째 플레이어 봇이 길드장인 길드가 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ admin, params }) => {
  const 둘째 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 길드이름 = '봇길드468';
  try {
    await test.step('두 번째 플레이어 계정을 처음 상태로 되돌리고 봇이 길드를 만든다', async () => {
      await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
      await 봇켜기(admin, { user: 둘째, pass: 둘째비밀번호 });
      await 봇이길드만들기(admin, 둘째, 길드이름);
    });
    await test.step('두 번째 플레이어 봇이 접속했는지 확인한다', async () => {
      await verify('두 번째 플레이어 봇이 접속해 있다', (await 접속자(admin)).players.some((p) => p.user === 둘째), true, { blocker: true });
    });
    await test.step('봇이 다른 이름으로 길드 만들기를 요청한다', async () => {
      await 봇시키기(admin, 둘째, 'guild_create:다른길드468');
      await verify('이미 길드가 있는데 만들기를 하면 「이미 길드에 들어가 있습니다」가 뜬다', await 봇이볼때까지(admin, 둘째, '이미 길드에 들어가 있습니다'), true);
    });
  } finally {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 둘째, 둘째비밀번호, 'base');
  }
});
