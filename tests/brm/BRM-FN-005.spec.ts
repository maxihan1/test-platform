import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 영웅카드수, 영웅카드자리, 영웅카드직업이름들 } from './helpers/login-tools.helper.js';
import { 로비로 } from './helpers/game-enter.helper.js';
import { 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';
import { 로비화면 } from './pages/lobby.page.js';

export const spec = defineCase({
  tcId: 'BRM-FN-005',
  name: '로비에 들어오면 아래쪽 영웅 카드가 8장 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로비에 들어와 있다'],
  elements: ['zone:CharSelect', 'state:직업=탱커', 'state:직업=궁수', 'state:직업=마법사', 'state:직업=도적'],
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
  await test.step('일반 회원으로 로비에 들어간다', async () => {
    await 로비로(game, driver, 나);
    const 보임 = await 로비화면.열기(game).then(
      () => true,
      () => false,
    );
    await verify('로비 화면이 보인다', 보임, true, { blocker: true });
  });
  await test.step('로비 아래쪽 영웅 카드를 센다', async () => {
    const 장수 = await verify('영웅 카드가 8장이다', await 영웅카드수(game), 8);
    const 자리 = await 영웅카드자리(game, 0);
    const 아래 = await verify('영웅 카드가 화면 아래쪽에 있다', 자리?.세로 ?? null, '아래');
    await verify('로비에 들어오면 아래쪽 영웅 카드가 8장 보인다', 장수 && 아래, true);
  });
  await test.step('영웅 카드를 하나씩 눌러 정보 상자의 직업 이름을 읽는다', async () => {
    const 이름들 = await 영웅카드직업이름들(game);
    const 탱커 = await verify('탱커가 2장이다', 이름들.filter((글) => 글.includes('탱커')).length, 2);
    const 궁수 = await verify('궁수가 2장이다', 이름들.filter((글) => 글.includes('궁수')).length, 2);
    const 마법사 = await verify('마법사가 2장이다', 이름들.filter((글) => 글.includes('마법사')).length, 2);
    const 도적 = await verify('도적이 2장이다', 이름들.filter((글) => 글.includes('도적')).length, 2);
    await verify('직업 이름이 탱커 2 · 궁수 2 · 마법사 2 · 도적 2 로 나온다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
