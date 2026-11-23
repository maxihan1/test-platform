import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기 } from './helpers/game-enter.helper.js';
import { 로비로되돌리기 } from './helpers/game-state.helper.js';
import { 던전화면 } from './pages/dungeon.page.js';

export const spec = defineCase({
  tcId: 'BRP-FN-607',
  name: '연결한 패드가 PS5 면 버튼 안내에 공격 □ · 스킬1 △ · 스킬2 ○ · 감정 ✕ · 물약 R1 그림이 뜬다',
  platforms: ['windows-ps5', 'windows-xbox'],
  precondition: ['일반 회원이 패드를 연결하고 도적으로 혼자 던전에 들어와 있다'],
  elements: ['state:직업=도적'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  await test.cleanup('방을 로비로 돌리기', () => 로비로되돌리기(admin));

  const { type } = await game.pad();
  await test.step('일반 회원이 패드를 연결하고 도적으로 던전에 들어온 것을 확인한다', async () => {
    await verify('PS5 나 Xbox 패드가 연결돼 있다', type === 'ps5' || type === 'xbox', true, { blocker: true });
    const 로비 = await 로그인하기(game, params.userId ?? '', params.userPassword ?? '');
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
    await 던전입장(game, '도적');
  });

  await test.step('행동 막대와 물약 버튼의 버튼 안내를 읽는다', async () => {
    const 던전 = await 던전화면.열림(game);
    await 던전.패드그림뜰때까지(0);
    if (type === 'ps5') {
      const 그림 = 던전화면.패드그림이름.ps5;
      const 공격 = await verify('공격 버튼 안내에 □ 그림이 뜬다', await 던전.패드그림읽기(0), 그림['□']);
      const 스킬1 = await verify('스킬1 버튼 안내에 △ 그림이 뜬다', await 던전.패드그림읽기(1), 그림['△']);
      const 스킬2 = await verify('스킬2 버튼 안내에 ○ 그림이 뜬다', await 던전.패드그림읽기(2), 그림['○']);
      const 감정 = await verify('감정 버튼 안내에 ✕ 그림이 뜬다', await 던전.패드그림읽기(3), 그림['✕']);
      const 물약 = await verify('물약 버튼 안내에 R1 그림이 뜬다', await 던전.패드그림읽기('물약'), 그림.R1);
      await verify('연결한 패드가 PS5 면 버튼 안내에 공격 □ · 스킬1 △ · 스킬2 ○ · 감정 ✕ · 물약 R1 그림이 뜬다', 공격 && 스킬1 && 스킬2 && 감정 && 물약, true);
    } else {
      const 그림 = 던전화면.패드그림이름.xbox;
      const 공격 = await verify('공격 버튼 안내에 X 그림이 뜬다', await 던전.패드그림읽기(0), 그림.X);
      const 스킬1 = await verify('스킬1 버튼 안내에 Y 그림이 뜬다', await 던전.패드그림읽기(1), 그림.Y);
      const 스킬2 = await verify('스킬2 버튼 안내에 B 그림이 뜬다', await 던전.패드그림읽기(2), 그림.B);
      const 감정 = await verify('감정 버튼 안내에 A 그림이 뜬다', await 던전.패드그림읽기(3), 그림.A);
      const 물약 = await verify('물약 버튼 안내에 RB 그림이 뜬다', await 던전.패드그림읽기('물약'), 그림.RB);
      await verify('Xbox 패드는 버튼 안내에 공격 X · 스킬1 Y · 스킬2 B · 감정 A · 물약 RB 그림이 뜬다', 공격 && 스킬1 && 스킬2 && 감정 && 물약, true);
    }

    const 키1 = await verify('공격 버튼의 키보드 숫자 안내가 숨어 있다', await 던전.버튼키글상태(0), '숨음');
    const 키2 = await verify('스킬1 버튼의 키보드 숫자 안내가 숨어 있다', await 던전.버튼키글상태(1), '숨음');
    const 키3 = await verify('스킬2 버튼의 키보드 숫자 안내가 숨어 있다', await 던전.버튼키글상태(2), '숨음');
    const 키4 = await verify('감정 버튼의 키보드 숫자 안내가 숨어 있다', await 던전.버튼키글상태(3), '숨음');
    await verify('행동 막대의 키보드 숫자 안내는 숨는다', 키1 && 키2 && 키3 && 키4, true);
  });
});
