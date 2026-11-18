import { defineCase, gameLog, repeatUntil, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로비로 } from './helpers/game-enter.helper.js';
import { 봇과같이던전으로, 임프하나만두고레벨맞추기, 장비받아끼기 } from './helpers/battle.helper.js';
import { 로그읽기, type 로그줄, 받은피해, 설명안되는줄, type 시작조건, 임프에게맞기 } from './helpers/game-log.helper.js';
import { 계정되돌리기, 봇끄기, 봇켜기, 접속자 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'ARG-GS-004',
  name: '던전에 셋일 때 레벨 5 탱커가 「사슬 갑옷」을 입고 임프에게 받은 피해가 기획서 값이다',
  platforms: ['android'],
  precondition: ['일반 회원과 두 번째 · 세 번째 플레이어 봇이 던전에 있고 일반 회원은 레벨 5 탱커 · 「사슬 갑옷」이다', '곁에 임프 하나만 있다'],
  elements: ['item:chain_armor', 'monster:imp'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 플레이어 아이디').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    secondPassword: z.string().describe('두 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '두 번째 플레이어' }),
    thirdId: z.string().describe('세 번째 플레이어 아이디').optional().meta({ secret: true, account: '세 번째 플레이어' }),
    thirdPassword: z.string().describe('세 번째 플레이어 비밀번호').optional().meta({ secret: true, account: '세 번째 플레이어' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.loginId ?? '';
  const 비밀번호 = params.loginPassword ?? '';
  const 둘째아이디 = params.secondId ?? '';
  const 둘째비밀번호 = params.secondPassword ?? '';
  const 셋째아이디 = params.thirdId ?? '';
  const 셋째비밀번호 = params.thirdPassword ?? '';
  const 조건: 시작조건 = { level: 5, job: '탱커', armor: '사슬 갑옷', players: 3 };
  await test.cleanup('봇 끄고 세 계정 되돌리기', async () => {
    await 봇끄기(admin);
    await 계정되돌리기(admin, 아이디, 비밀번호, 'base');
    await 계정되돌리기(admin, 둘째아이디, 둘째비밀번호, 'base');
    await 계정되돌리기(admin, 셋째아이디, 셋째비밀번호, 'base');
  });
  await test.step('로비에서 「사슬 갑옷」을 받아 입고 두 번째 · 세 번째 플레이어 봇과 셋이 던전에 들어가 임프 하나만 두고 레벨을 5 로 맞춘다', async () => {
    await 로비로(game, 아이디, 비밀번호);
    await 장비받아끼기(game, admin, 아이디, '사슬 갑옷', '갑옷');
    await 봇과같이던전으로(game, admin, { 아이디, 비밀번호 }, { 아이디: 둘째아이디, 비밀번호: 둘째비밀번호 });
    await 봇켜기(admin, { user: 셋째아이디, pass: 셋째비밀번호 });
    await 임프하나만두고레벨맞추기(game, 5);
  });
  await test.step('던전에 3명이 있는지 확인한다', async () => {
    const 접속 = (await 접속자(admin)).players.map((사람) => 사람.user);
    await verify('접속해 있는 플레이어가 3명이다', 접속.filter((이름) => [아이디, 둘째아이디, 셋째아이디].includes(이름)).length, 3, { blocker: true });
  });
  const 로그 = await gameLog((since) => 로그읽기(admin, 아이디, since));
  await test.step('임프에게 맞는 동안 쌓인 로그를 기획서 값과 견준다', async () => {
    let 줄들: 로그줄[] = [];
    let 멈춤: unknown;
    try {
      await repeatUntil(() => 임프에게맞기(game), {
        progress: async () => 받은피해((줄들 = await 로그.lines()), 아이디, 조건).length,
        goal: 1,
        stallMs: 60_000,
      });
    } catch (e) {
      멈춤 = e;
    }
    const 맞음 = 받은피해(줄들, 아이디, 조건);
    await verify.log('ARG-REQ-084 던전에 3명일 때 레벨 5 탱커가 「사슬 갑옷」을 입고 임프에게 받은 피해는 12 이다', 맞음.map((줄) => 줄.value), 12);
    for (const 줄 of 설명안되는줄(줄들, [...맞음])) await verify.note('설명 안 되는 줄', 줄);
    if (멈춤 !== undefined) throw 멈춤;
  });
});
