import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/game-enter.helper.js';
import { 데이터표스킬찾기, 표읽기 } from './helpers/dungeon.helper.js';

export const spec = defineCase({
  tcId: 'BRP-FN-457',
  name: '/gm data skill 로 도적 스킬과 공통 행동 값을 읽으면 도적 스킬과 공통 행동의 기본 수치 · 사거리 · 재사용 대기가 기획서 스킬 표와 같다',
  platforms: ['windows'],
  precondition: ['스킬 표를 게임 데이터 명령으로 읽을 수 있다'],
  elements: ['skill:급소 찌르기', 'skill:질주 공격', 'skill:은신', 'skill:부활', 'skill:들기', 'skill:내려놓기'],
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

  await test.step('/gm data skill 로 도적 스킬과 공통 행동 값을 읽는다', async () => {
    const 표 = await 표읽기(game, 'skill');
    await verify('스킬 표 줄을 읽는다', Object.keys(표).length > 0, true, { blocker: true });
    const 급소찌르기줄 = 데이터표스킬찾기(표, '급소 찌르기');
    const 급소찌르기값 = await verify.element('급소 찌르기의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:급소 찌르기', { 값: 급소찌르기줄.값, 사거리: 급소찌르기줄.사거리, 재사용: 급소찌르기줄.재사용 }, { 값: 15, 사거리: 2, 재사용: 0 });
    const 질주공격줄 = 데이터표스킬찾기(표, '질주 공격');
    const 질주공격값 = await verify.element('질주 공격의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:질주 공격', { 값: 질주공격줄.값, 사거리: 질주공격줄.사거리, 재사용: 질주공격줄.재사용 }, { 값: 30, 사거리: 20, 재사용: 2 });
    const 은신줄 = 데이터표스킬찾기(표, '은신');
    const 은신값 = await verify.element('은신의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:은신', { 값: 은신줄.값, 재사용: 은신줄.재사용 }, { 값: 0, 재사용: 0 });
    const 부활줄 = 데이터표스킬찾기(표, '부활');
    const 부활값 = await verify.element('부활의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:부활', { 값: 부활줄.값, 사거리: 부활줄.사거리, 재사용: 부활줄.재사용 }, { 값: 400, 사거리: 2, 재사용: 0 });
    const 들기줄 = 데이터표스킬찾기(표, '들기');
    const 들기값 = await verify.element('들기의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:들기', { 값: 들기줄.값, 사거리: 들기줄.사거리, 재사용: 들기줄.재사용 }, { 값: 0, 사거리: 2, 재사용: 1.5 });
    const 내려놓기줄 = 데이터표스킬찾기(표, '내려놓기');
    const 내려놓기값 = await verify.element('내려놓기의 기본 수치 · 사거리 · 재사용 대기가 기획서와 같다', 'skill:내려놓기', { 값: 내려놓기줄.값, 사거리: 내려놓기줄.사거리, 재사용: 내려놓기줄.재사용 }, { 값: 0, 사거리: 2, 재사용: 1.5 });
    await verify('/gm data skill 로 도적 스킬과 공통 행동 값을 읽으면 도적 스킬과 공통 행동의 기본 수치 · 사거리 · 재사용 대기가 기획서 스킬 표와 같다', 급소찌르기값 && 질주공격값 && 은신값 && 부활값 && 들기값 && 내려놓기값, true);
  });
});
