import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 던전입장, 로그인하기, 방로비로 } from './helpers/game-enter.helper.js';
import { 계정되돌리기, 로비로되돌리기 } from './helpers/game-state.helper.js';
import { GM스탯 } from './helpers/gm.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-096',
  name: '네 직업으로 차례로 던전에 들어가 /gm stat 으로 행동 버튼 스킬을 읽으면 직업별 행동 버튼 스킬이 탱커 「전투 망치」 · 「방패 오라」, 궁수 「화살 쏘기」 · 「강화 사격」 · 「일제 사격」, 마법사 「마력탄」 · 「치유의 손길」, 도적 「급소 찌르기」 · 「질주 공격」 · 「은신」이다',
  platforms: ['windows'],
  precondition: ['일반 회원으로 로그인해 로비에 있다'],
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
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('네 직업으로 차례로 던전에 들어가 /gm stat 으로 행동 버튼 스킬을 읽는다', async () => {
    const 읽은: Record<string, string> = {};
    for (const 직업 of ['탱커', '궁수', '마법사', '도적'] as const) {
      if (직업 !== '탱커') await 방로비로(admin, game);
      await 던전입장(game, 직업);
      읽은[직업] = ((await GM스탯(game))['스킬'] ?? '')
        .split(',')
        .filter((스킬) => 스킬 !== '-')
        .join(' · ');
    }
    const 탱커 = await verify('탱커 행동 버튼 스킬이 「전투 망치」 · 「방패 오라」다', 읽은['탱커'], '전투 망치 · 방패 오라');
    const 궁수 = await verify('궁수 행동 버튼 스킬이 「화살 쏘기」 · 「강화 사격」 · 「일제 사격」이다', 읽은['궁수'], '화살 쏘기 · 강화 사격 · 일제 사격');
    const 마법사 = await verify('마법사 행동 버튼 스킬이 「마력탄」 · 「치유의 손길」이다', 읽은['마법사'], '마력탄 · 치유의 손길');
    const 도적 = await verify('도적 행동 버튼 스킬이 「급소 찌르기」 · 「질주 공격」 · 「은신」이다', 읽은['도적'], '급소 찌르기 · 질주 공격 · 은신');
    await verify(
      '네 직업으로 차례로 던전에 들어가 /gm stat 으로 행동 버튼 스킬을 읽으면 직업별 행동 버튼 스킬이 탱커 「전투 망치」 · 「방패 오라」, 궁수 「화살 쏘기」 · 「강화 사격」 · 「일제 사격」, 마법사 「마력탄」 · 「치유의 손길」, 도적 「급소 찌르기」 · 「질주 공격」 · 「은신」이다',
      탱커 && 궁수 && 마법사 && 도적,
      true,
    );
  });
});
