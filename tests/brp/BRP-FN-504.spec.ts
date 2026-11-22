import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM기절 } from './helpers/gm.helper.js';
import { 공통HUD } from './components/hud.component.js';
import { 결과화면 } from './pages/postgame.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-504',
  name: '로비와 던전에서 공통 HUD 를 찾으면 로그인한 뒤 로비와 던전에서 상단 바와 메뉴가 늘 보인다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다', '일반 회원이 결과 화면에 있다'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('방을 로비로 돌리고 일반 회원을 기준 상태로 되돌리기', async () => {
    await 로비로되돌리기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
  });

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('로비와 던전에서 공통 HUD 를 찾는다', async () => {
    const 보임 = async (주소: string): Promise<boolean> => (await game.find(주소)) !== null;
    const 로비바 = await verify('로비에서 상단 바가 보인다', await 보임(공통HUD.상단바), true);
    const 로비메뉴 = await verify('로비에서 메뉴가 보인다', await 보임(공통HUD.메뉴), true);
    await 던전입장(game, '탱커');
    const 던전바 = await verify('던전에서 상단 바가 보인다', await 보임(공통HUD.상단바), true);
    const 던전메뉴 = await verify('던전에서 메뉴가 보인다', await 보임(공통HUD.메뉴), true);
    await verify('로비와 던전에서 공통 HUD 를 찾으면 로그인한 뒤 로비와 던전에서 상단 바와 메뉴가 늘 보인다', 로비바 && 로비메뉴 && 던전바 && 던전메뉴, true);
  });

  await test.step('일반 회원이 결과 화면에 있는 것을 확인한다', async () => {
    await GM기절(game);
    await verify('결과 화면이 열린다', await 결과화면.뜰때까지(game, 30_000), true, { blocker: true });
  });

  await test.step('「메인 메뉴로」를 누른다', async () => {
    await (await 결과화면.열림(game)).메인메뉴로();
    const 바사라짐 = await game.waitFor(공통HUD.상단바, { gone: true, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    const 바 = await verify('상단 바가 사라진다', 바사라짐, true);
    const 메뉴사라짐 = await game.waitFor(공통HUD.메뉴, { gone: true, timeoutMs: 15_000 }).then(
      () => true,
      () => false,
    );
    const 메뉴 = await verify('메뉴가 사라진다', 메뉴사라짐, true);
    await verify('메인 메뉴로 돌아간 뒤 상단 바와 메뉴가 사라진다', 바 && 메뉴, true);
  });
});
