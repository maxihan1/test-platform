import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 스킬목록 } from './helpers/dungeon-tools.helper.js';
import { 던전으로, 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-090',
  name: '궁수로 던전에 들어오면 「스킬 2」 버튼의 스킬이 세 번째 스킬 「일제 사격」이다',
  platforms: ['android'],
  precondition: ['일반 회원이 궁수로 혼자 던전에 들어와 있다'],
  elements: ['class:궁수', 'skill:일제 사격'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
  });
  await test.step('일반 회원이 궁수로 혼자 던전에 들어간다', async () => {
    await 던전으로(game, driver, 나, 2);
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('「/gm stat」 셋째 줄의 스킬을 읽는다', async () => {
    const 상태 = await GM상태(game);
    await verify('직업이 궁수다', 상태['직업'], '궁수', { blocker: true });
    await verify('궁수로 던전에 들어오면 「스킬 2」 버튼의 스킬이 세 번째 스킬 「일제 사격」이다', 스킬목록(상태)[2], '일제 사격');
  });
});
