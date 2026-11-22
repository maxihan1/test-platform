import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 아이템표읽기, 표값 } from './helpers/items.helper.js';
import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 계정되돌리기 } from './helpers/game-state.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-444',
  name: '/gm data item 으로 무기 · 갑옷 줄을 읽으면 무기 · 갑옷 7종의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서 아이템 표와 같다',
  platforms: ['windows'],
  precondition: ['아이템 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['item:녹슨 단검', 'item:강철 롱소드', 'item:룬 새김 도끼', 'item:불꽃의 검', 'item:가죽 갑옷', 'item:사슬 갑옷', 'item:용비늘 갑옷'],
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

  await test.step('/gm data item 으로 무기 · 갑옷 줄을 읽는다', async () => {
    const 표 = await 아이템표읽기(game);
    await verify('아이템 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 녹슨 = await verify.element(
      '녹슨 단검의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:녹슨 단검',
      표값(표['녹슨 단검'], true),
      { 분류: '무기', 등급: '일반', 상점가: 80, 판매가: 20, 효과: '공격 +5%', 설명: '공격력 +5%' },
    );
    const 롱소드 = await verify.element(
      '강철 롱소드의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:강철 롱소드',
      표값(표['강철 롱소드'], true),
      { 분류: '무기', 등급: '희귀', 상점가: 350, 판매가: 87, 효과: '공격 +12%', 설명: '공격력 +12%' },
    );
    const 도끼 = await verify.element(
      '룬 새김 도끼의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:룬 새김 도끼',
      표값(표['룬 새김 도끼'], true),
      { 분류: '무기', 등급: '영웅', 상점가: 900, 판매가: 225, 효과: '공격 +20%', 설명: '공격력 +20%' },
    );
    const 불꽃 = await verify.element(
      '불꽃의 검의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:불꽃의 검',
      표값(표['불꽃의 검'], true),
      { 분류: '무기', 등급: '전설', 상점가: '없음', 판매가: 500, 효과: '공격 +30%', 설명: '공격력 +30% · 보스 처치 보상' },
    );
    const 가죽 = await verify.element(
      '가죽 갑옷의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:가죽 갑옷',
      표값(표['가죽 갑옷'], true),
      { 분류: '갑옷', 등급: '일반', 상점가: 100, 판매가: 25, 효과: '받는 피해 −8%', 설명: '받는 피해 -8%' },
    );
    const 사슬 = await verify.element(
      '사슬 갑옷의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:사슬 갑옷',
      표값(표['사슬 갑옷'], true),
      { 분류: '갑옷', 등급: '희귀', 상점가: 400, 판매가: 100, 효과: '받는 피해 −15%', 설명: '받는 피해 -15%' },
    );
    const 용비늘 = await verify.element(
      '용비늘 갑옷의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서와 같다',
      'item:용비늘 갑옷',
      표값(표['용비늘 갑옷'], true),
      { 분류: '갑옷', 등급: '전설', 상점가: '없음', 판매가: 500, 효과: '받는 피해 −25%', 설명: '받는 피해 -25% · 보스 처치 보상' },
    );
    await verify('/gm data item 으로 무기 · 갑옷 줄을 읽으면 무기 · 갑옷 7종의 분류 · 등급 · 상점가 · 판매가 · 효과 · 설명이 기획서 아이템 표와 같다', 녹슨 && 롱소드 && 도끼 && 불꽃 && 가죽 && 사슬 && 용비늘, true);
  });
});
