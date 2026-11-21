import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 가방에서끼기, 가방에있나, 우편받기 } from './helpers/dungeon-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 레벨맞추기, 봇모두끄기, 우편보내기, 캐릭터 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-638',
  name: '레벨 30 에 용비늘 갑옷을 끼면 방어율이 0.54 로 0.6 을 넘지 않는다',
  platforms: ['android'],
  precondition: ['일반 회원이 용비늘 갑옷을 가지고 로비에 있다'],
  elements: ['item:용비늘 갑옷', 'level:30'],
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
  await test.step('일반 회원이 용비늘 갑옷을 가지고 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 캐릭터번호 = (await 캐릭터(admin, 나.아이디)).id;
    await 우편보내기(admin, 캐릭터번호, { 제목: 'QA 용비늘 갑옷 638', 아이템: [{ 이름: '용비늘 갑옷', 개수: 1 }] });
    await verify('용비늘 갑옷 우편을 받는다', await 우편받기(game, 'QA 용비늘 갑옷 638'), true, { blocker: true });
    await verify('가방에 용비늘 갑옷이 있다', await 가방에있나(game, '용비늘 갑옷'), true, { blocker: true });
  });
  await test.step('「/gm level 30」 뒤 용비늘 갑옷을 끼고 「/gm stat」 첫 줄을 읽는다', async () => {
    await 레벨맞추기(game, 30);
    await 가방에서끼기(game, '용비늘 갑옷', '갑옷');
    const 상태 = await GM상태(game);
    const 값 = await verify('방어율이 0.54 다', Number(상태['방어율']), 0.54);
    const 상한 = await verify('방어율이 0.6 을 넘지 않는다', Number(상태['방어율']) <= 0.6, true);
    await verify('레벨 30 에 용비늘 갑옷을 끼면 방어율이 0.54 로 0.6 을 넘지 않는다', 값 && 상한, true);
  });
});
