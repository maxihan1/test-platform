import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 데이터표줄찾기, 표읽기 } from './helpers/dungeon.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-453',
  name: '/gm data monster 로 몬스터마다 값을 읽으면 몬스터 표의 체력 · 공격 피해 · 사거리 · 재사용 대기가 기획서 몬스터 표와 같다',
  platforms: ['windows'],
  precondition: ['몬스터 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['monster:임프', 'monster:던지는 임프', 'monster:보스 임프'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm data monster 로 몬스터마다 값을 읽는다', async () => {
    const 표 = await 표읽기(game, 'monster');
    await verify('몬스터 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 임프 = 데이터표줄찾기(표, '임프');
    const 던지는 = 데이터표줄찾기(표, '던지는 임프');
    const 보스 = 데이터표줄찾기(표, '보스 임프');
    const 임프값 = await verify.element(
      '임프의 체력 · 피해 · 사거리 · 재사용 대기가 기획서와 같다',
      'monster:임프',
      { 체력: 임프.체력, 피해: 임프.스킬[0]?.값, 사거리: 임프.스킬[0]?.사거리, 재사용: 임프.스킬[0]?.재사용 },
      { 체력: 15, 피해: 15, 사거리: 2, 재사용: 0 },
    );
    const 던지는값 = await verify.element(
      '던지는 임프의 체력 · 피해 · 사거리 · 재사용 대기가 기획서와 같다',
      'monster:던지는 임프',
      { 체력: 던지는.체력, 피해: 던지는.스킬[0]?.값, 사거리: 던지는.스킬[0]?.사거리, 재사용: 던지는.스킬[0]?.재사용 },
      { 체력: 100, 피해: 15, 사거리: 8, 재사용: 4 },
    );
    const 보스값 = await verify.element(
      '보스 임프의 체력 · 공격 둘의 피해 · 사거리 · 재사용 대기가 기획서와 같다',
      'monster:보스 임프',
      { 체력: 보스.체력, 공격: 보스.스킬.map((스킬) => ({ 피해: 스킬.값, 사거리: 스킬.사거리, 재사용: 스킬.재사용 })) },
      {
        체력: 500,
        공격: [
          { 피해: 30, 사거리: 4.5, 재사용: 0 },
          { 피해: 30, 사거리: 15, 재사용: 7.5 },
        ],
      },
    );
    await verify('/gm data monster 로 몬스터마다 값을 읽으면 몬스터 표의 체력 · 공격 피해 · 사거리 · 재사용 대기가 기획서 몬스터 표와 같다', 임프값 && 던지는값 && 보스값, true);
  });
});
