import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 공통HUD } from './components/hud.component.js';
import { 직업별기본체력 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { GM자료, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-006',
  name: '「/gm data skill」을 보내면 직업별 기본 체력이 탱커 1,200 · 궁수 900 · 마법사 800 · 도적 1,000 이다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['class:탱커', 'class:궁수', 'class:마법사', 'class:도적'],
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
  const hud = new 공통HUD(game);
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 보임 = await hud.그려질때까지().then(
      () => true,
      () => false,
    );
    await verify('상단 바가 보인다', 보임, true, { blocker: true });
  });
  await test.step('채팅 칸에 「/gm data skill」을 보낸다', async () => {
    const 줄들 = await GM자료(game, 'skill');
    const 탱커 = await verify('탱커 기본 체력이 1,200 이다', 직업별기본체력(줄들, '탱커'), 1200);
    const 궁수 = await verify('궁수 기본 체력이 900 이다', 직업별기본체력(줄들, '궁수'), 900);
    const 마법사 = await verify('마법사 기본 체력이 800 이다', 직업별기본체력(줄들, '마법사'), 800);
    const 도적 = await verify('도적 기본 체력이 1,000 이다', 직업별기본체력(줄들, '도적'), 1000);
    await verify('「/gm data skill」을 보내면 직업별 기본 체력이 탱커 1,200 · 궁수 900 · 마법사 800 · 도적 1,000 이다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
