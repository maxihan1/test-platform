import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 데이터표스킬찾기, 표읽기 } from './helpers/dungeon.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-456',
  name: '/gm data skill 로 탱커 · 궁수 · 마법사 스킬 값을 읽으면 탱커 · 궁수 · 마법사 스킬의 기본 수치 · 사거리 · 재사용 대기가 기획서 스킬 표와 같다',
  platforms: ['windows'],
  precondition: ['스킬 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['skill:전투 망치', 'skill:방패 오라', 'skill:화살 쏘기', 'skill:강화 사격', 'skill:일제 사격', 'skill:마력탄', 'skill:치유의 손길'],
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

  await test.step('/gm data skill 로 탱커 · 궁수 · 마법사 스킬 값을 읽는다', async () => {
    const 표 = await 표읽기(game, 'skill');
    await verify('스킬 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 전투망치줄 = 데이터표스킬찾기(표, '전투 망치');
    const 전투망치값 = await verify.element('전투 망치의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:전투 망치', { 값: 전투망치줄.값, 사거리: 전투망치줄.사거리, 재사용: 전투망치줄.재사용 }, { 값: 10, 사거리: 2, 재사용: 0 });
    const 방패오라줄 = 데이터표스킬찾기(표, '방패 오라');
    const 방패오라값 = await verify.element('방패 오라의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:방패 오라', { 값: 방패오라줄.값, 재사용: 방패오라줄.재사용 }, { 값: 30, 재사용: 1.2 });
    const 화살쏘기줄 = 데이터표스킬찾기(표, '화살 쏘기');
    const 화살쏘기값 = await verify.element('화살 쏘기의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:화살 쏘기', { 값: 화살쏘기줄.값, 사거리: 화살쏘기줄.사거리, 재사용: 화살쏘기줄.재사용 }, { 값: 5, 사거리: 20, 재사용: 0.25 });
    const 강화사격줄 = 데이터표스킬찾기(표, '강화 사격');
    const 강화사격값 = await verify.element('강화 사격의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:강화 사격', { 재사용: 강화사격줄.재사용 }, { 재사용: 0.7 });
    const 일제사격줄 = 데이터표스킬찾기(표, '일제 사격');
    const 일제사격값 = await verify.element('일제 사격의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:일제 사격', { 값: 일제사격줄.값, 사거리: 일제사격줄.사거리, 재사용: 일제사격줄.재사용 }, { 값: 7, 사거리: 20, 재사용: 0 });
    const 마력탄줄 = 데이터표스킬찾기(표, '마력탄');
    const 마력탄값 = await verify.element('마력탄의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:마력탄', { 값: 마력탄줄.값, 사거리: 마력탄줄.사거리, 재사용: 마력탄줄.재사용 }, { 값: 5, 사거리: 20, 재사용: 0.5 });
    const 치유의손길줄 = 데이터표스킬찾기(표, '치유의 손길');
    const 치유의손길값 = await verify.element('치유의 손길의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:치유의 손길', { 값: Math.abs(치유의손길줄.값), 사거리: 치유의손길줄.사거리, 재사용: 치유의손길줄.재사용 }, { 값: 250, 사거리: 10, 재사용: 0 });
    await verify('/gm data skill 로 탱커 · 궁수 · 마법사 스킬 값을 읽으면 탱커 · 궁수 · 마법사 스킬의 기본 수치 · 사거리 · 재사용 대기가 기획서 스킬 표와 같다', 전투망치값 && 방패오라값 && 화살쏘기값 && 강화사격값 && 일제사격값 && 마력탄값 && 치유의손길값, true);
  });
});
