import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 봇GM값, 스킬목록, 함께던전으로 } from './helpers/dungeon-tools.helper.js';
import { 지금화면 } from './helpers/game-enter.helper.js';
import { GM상태, 계정꺼내기, 계정되돌리기, 봇모두끄기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRM-FN-102',
  name: '직업마다 던전에 들어오면 행동 버튼의 스킬이 직업별 스킬 표와 같다',
  platforms: ['android'],
  precondition: ['일반 회원이 직업마다 혼자 던전에 들어와 있다'],
  elements: ['class:탱커', 'class:궁수', 'class:마법사', 'class:도적', 'skill:전투 망치', 'skill:방패 오라', 'skill:화살 쏘기', 'skill:강화 사격', 'skill:일제 사격', 'skill:마력탄', 'skill:치유의 손길', 'skill:급소 찌르기', 'skill:질주 공격', 'skill:은신'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    p2Id: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p2Password: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    p3Id: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p3Password: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    p4Id: z.string().describe('네 번째 플레이어 아이디').optional().meta({ secret: true, account: '네 번째 플레이어' }),
    p4Password: z.string().describe('네 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '네 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, driver, admin, params }) => {
  const 나 = 계정꺼내기(params.loginId, params.loginPassword);
  const 두번째 = 계정꺼내기(params.p2Id, params.p2Password, '두 번째 플레이어');
  const 세번째 = 계정꺼내기(params.p3Id, params.p3Password, '세 번째 플레이어');
  const 네번째 = 계정꺼내기(params.p4Id, params.p4Password, '네 번째 플레이어');
  await test.cleanup('켜 둔 봇 끄기 · 일반 회원 · 두 번째 플레이어 · 세 번째 플레이어 · 네 번째 플레이어 기준 상태로 되돌리기', async () => {
    await 봇모두끄기(admin);
    await 계정되돌리기(admin, 나);
    await 계정되돌리기(admin, 두번째);
    await 계정되돌리기(admin, 세번째);
    await 계정되돌리기(admin, 네번째);
  });
  let 궁수봇 = '';
  let 마법사봇 = '';
  let 도적봇 = '';
  await test.step('일반 회원이 탱커로 두 번째 · 세 번째 · 네 번째 플레이어 봇과 함께 던전에 들어간다', async () => {
    const 이름들 = await 함께던전으로(game, driver, admin, 나, [{ 계정: 두번째, 자리: 2 }, { 계정: 세번째, 자리: 4 }, { 계정: 네번째, 자리: 6 }], 0);
    궁수봇 = 이름들[0] ?? '';
    마법사봇 = 이름들[1] ?? '';
    도적봇 = 이름들[2] ?? '';
    await verify('던전 화면이 보인다', await 지금화면(game), '던전', { blocker: true });
  });
  await test.step('직업마다 「/gm stat」 셋째 줄의 스킬을 읽는다', async () => {
    const 탱커스킬 = 스킬목록(await GM상태(game)).join(',');
    const 궁수스킬 = (await 봇GM값(admin, 궁수봇, 'stat', '직업'))['스킬'] ?? '';
    const 마법사스킬 = (await 봇GM값(admin, 마법사봇, 'stat', '직업'))['스킬'] ?? '';
    const 도적스킬 = (await 봇GM값(admin, 도적봇, 'stat', '직업'))['스킬'] ?? '';
    const 탱커 = await verify('탱커 행동 버튼의 스킬이 「전투 망치 · 방패 오라」다', 탱커스킬, '전투 망치,방패 오라,-');
    const 궁수 = await verify('궁수 행동 버튼의 스킬이 「화살 쏘기 · 강화 사격 · 일제 사격」이다', 궁수스킬, '화살 쏘기,강화 사격,일제 사격');
    const 마법사 = await verify('마법사 행동 버튼의 스킬이 「마력탄 · 치유의 손길」이다', 마법사스킬, '마력탄,치유의 손길,-');
    const 도적 = await verify('도적 행동 버튼의 스킬이 「급소 찌르기 · 질주 공격 · 은신」이다', 도적스킬, '급소 찌르기,질주 공격,은신');
    await verify('직업마다 던전에 들어오면 행동 버튼의 스킬이 직업별 스킬 표와 같다', 탱커 && 궁수 && 마법사 && 도적, true);
  });
});
