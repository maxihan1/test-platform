import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아이템표읽기, 표값 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-445',
  name: '/gm data item 으로 장신구 · 물약 · 전리품 줄을 읽으면 장신구 · 물약 · 전리품 5종의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서 아이템 표와 같다',
  platforms: ['windows'],
  precondition: ['아이템 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['item:행운의 반지', 'item:현자의 목걸이', 'item:체력 물약', 'item:임프의 뿔', 'item:보스의 왕관 조각'],
  params: z.object({
    userId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true, account: '일반 회원' }),
    userPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true, account: '일반 회원' }),
  }),
  expected: null,
});

test(spec, async ({ game, admin, params }) => {
  const 아이디 = params.userId ?? '';
  const 비밀번호 = params.userPassword ?? '';
  await test.cleanup('일반 회원을 기준 상태로 되돌리기', () => 계정되돌리기(admin, 아이디, 비밀번호, 'base'));

  await test.step('일반 회원으로 로그인해 로비가 뜬 것을 확인한다', async () => {
    const 로비 = await 로그인하기(game, 아이디, 비밀번호);
    await verify('로비 화면이 열린다', 로비 !== null, true, { blocker: true });
  });

  await test.step('/gm data item 으로 장신구 · 물약 · 전리품 줄을 읽는다', async () => {
    const 표 = await 아이템표읽기(game);
    await verify('아이템 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 반지 = await verify.element(
      '행운의 반지의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:행운의 반지',
      표값(표['행운의 반지'], true),
      { 분류: '장신구', 등급: '희귀', 상점가: 300, 판매가: 75, 효과: '골드 획득 +20%', 설명: '골드 획득 +20%' },
    );
    const 목걸이 = await verify.element(
      '현자의 목걸이의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:현자의 목걸이',
      표값(표['현자의 목걸이'], true),
      { 분류: '장신구', 등급: '희귀', 상점가: 300, 판매가: 75, 효과: '경험치 획득 +20%', 설명: '경험치 획득 +20%' },
    );
    const 물약 = await verify.element(
      '체력 물약의 분류 · 등급 · 상점가 · 판매가 · 설명이 기획서와 같다',
      'item:체력 물약',
      표값(표['체력 물약'], false),
      { 분류: '물약', 등급: '일반', 상점가: 30, 판매가: 7, 설명: '체력 50% 회복 · 던전에서 사용' },
    );
    const 뿔 = await verify.element(
      '임프의 뿔의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:임프의 뿔',
      표값(표['임프의 뿔'], true),
      { 분류: '전리품', 등급: '일반', 상점가: '없음', 판매가: 10, 효과: '없음', 설명: '상점에 팔 수 있는 전리품' },
    );
    const 왕관 = await verify.element(
      '보스의 왕관 조각의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:보스의 왕관 조각',
      표값(표['보스의 왕관 조각'], true),
      { 분류: '전리품', 등급: '영웅', 상점가: '없음', 판매가: 200, 효과: '없음', 설명: '상점에 비싸게 팔 수 있는 전리품' },
    );
    await verify('/gm data item 으로 장신구 · 물약 · 전리품 줄을 읽으면 장신구 · 물약 · 전리품 5종의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서 아이템 표와 같다', 반지 && 목걸이 && 물약 && 뿔 && 왕관, true);
  });
});
