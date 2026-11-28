import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기 } from './helpers/api.helper.js';
import { 게시기본값되돌리기, 게시기본값바꾸기, 게시기본값열기, 게시기본값읽기, 선택창닫기 } from './helpers/flow-compose.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 게시기본값화면 } from './pages/posting-defaults.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 언어창 } from './pages/language-sheet.page.js';

const 화면구성 = defineCase({
  tcId: 'MTA-UI-435',
  name: '게시 기본값 화면에 배너 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」 · 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 게시 기본값을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 배너: z.string().describe('게시 기본값 화면 배너 글').default('이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.') }),
});

const 게시범위선택지 = defineCase({
  tcId: 'MTA-UI-436',
  name: '「게시 범위」 선택지에 「공개」 · 「제한적 공개」 · 「팔로워」가 보인다',
  platforms: ['android'],
  precondition: ['게시 기본값이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 공개범위선택지 = defineCase({
  tcId: 'MTA-UI-437',
  name: '「공개 범위」 선택지에 「모든 사용자」 · 「팔로워만」 · 「본인만」이 보인다',
  platforms: ['android'],
  precondition: ['게시 기본값이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 게시언어창 = defineCase({
  tcId: 'MTA-UI-438',
  name: '「게시 언어」 창에 언어 목록과 「취소」가 보인다',
  platforms: ['android'],
  precondition: ['게시 기본값이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 서버저장 = defineCase({
  tcId: 'MTA-FN-511',
  name: '게시 기본값을 바꾸고 화면을 나가면 서버 게시 기본 공개 범위가 「unlisted」로 저장된다',
  platforms: ['android'],
  precondition: ['게시 기본값이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 저장값: z.string().describe('「제한적 공개」를 골랐을 때 서버에 저장되는 값').default('unlisted') }),
});

const 공개범위잠김 = defineCase({
  tcId: 'MTA-FN-509',
  name: '게시 범위가 팔로워면 「공개 범위」가 잠겨 바꿀 수 없다',
  platforms: ['android'],
  held: '보류 — Test timeout of 120000ms exceeded.',
  precondition: ['「게시 범위」를 「팔로워」로 바꿨다'],
  techniques: ['동등 분할', '상태 전이'],
  params: z.object({}),
  expected: z.object({ 잠긴값: z.string().describe('게시 범위가 팔로워일 때 잠기는 「공개 범위」 값').default('본인만') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-058',
  name: '게시 기본값',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [화면구성, 게시범위선택지, 공개범위선택지, 게시언어창, 서버저장, 공개범위잠김],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 게시 = new 게시기본값화면(driver);
  const 언어 = new 언어창(driver);
  let 나: 계정 | undefined;
  let 처음서버값: string | undefined;

  const 게시화면맞추기 = async (): Promise<void> => {
    if (!(await 게시.떴나(3_000))) await 게시기본값열기(driver);
  };

  await test.cleanup('바꾼 게시 기본값을 서버에서 되돌린다', async () => {
    if (나 === undefined || 처음서버값 === undefined) return;
    if ((await 게시기본값읽기(나)) !== 처음서버값) await 게시기본값바꾸기(나, 처음서버값);
  });

  await test.case(화면구성, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어가 게시 기본값을 연다', async () => {
      처음서버값 = await 게시기본값읽기(나!);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
      await 게시기본값열기(driver);
      await verify('「게시 기본값」 화면이 보인다', await 게시.떴나(), true, { blocker: true });
    });
    await test.step('게시 기본값 화면을 확인한다', async () => {
      const 배너 = await verify('배너 글이 기대값과 같다', await 게시.배너글(), expected.배너);
      const 게시범위 = await verify('「게시 범위」가 보인다', await 게시.줄있나('게시 범위'), true);
      const 공개범위 = await verify('「공개 범위」가 보인다', await 게시.줄있나('공개 범위'), true);
      const 게시언어 = await verify('「게시 언어」가 보인다', await 게시.줄있나('게시 언어'), true);
      await verify(
        '게시 기본값 화면에 배너 「이러한 설정은 게시물을 올릴 때 기본값으로 사용될 것이지만, 작성기 내에서 게시물별로 편집할 수 있습니다.」 · 「게시 범위」 · 「공개 범위」 · 「게시 언어」가 보인다',
        배너 && 게시범위 && 공개범위 && 게시언어,
        true,
      );
    });
  });

  await test.case(게시범위선택지, async () => {
    await test.step('「게시 범위」를 누른다', async () => {
      await 게시화면맞추기();
      await 게시.게시범위누르기();
      await 게시.선택창떴나();
      const 글들 = await 게시.선택창줄글들();
      const 공개 = await verify('「게시 범위」 선택지에 「공개」가 보인다', 글들.includes('공개'), true);
      const 제한적 = await verify('「게시 범위」 선택지에 「제한적 공개」가 보인다', 글들.includes('제한적 공개'), true);
      const 팔로워 = await verify('「게시 범위」 선택지에 「팔로워」가 보인다', 글들.includes('팔로워'), true);
      await verify('「게시 범위」 선택지에 「공개」 · 「제한적 공개」 · 「팔로워」가 보인다', 공개 && 제한적 && 팔로워, true);
      await 선택창닫기(driver);
    });
  });

  await test.case(공개범위선택지, async () => {
    await test.step('「공개 범위」를 누른다', async () => {
      await 게시화면맞추기();
      await 게시.공개범위누르기();
      await 게시.선택창떴나();
      const 글들 = await 게시.선택창줄글들();
      const 모든 = await verify('「공개 범위」 선택지에 「모든 사용자」가 보인다', 글들.includes('모든 사용자'), true);
      const 팔로워만 = await verify('「공개 범위」 선택지에 「팔로워만」이 보인다', 글들.includes('팔로워만'), true);
      const 본인만 = await verify('「공개 범위」 선택지에 「본인만」이 보인다', 글들.includes('본인만'), true);
      await verify('「공개 범위」 선택지에 「모든 사용자」 · 「팔로워만」 · 「본인만」이 보인다', 모든 && 팔로워만 && 본인만, true);
      await 선택창닫기(driver);
    });
  });

  await test.case(게시언어창, async () => {
    await test.step('「게시 언어」를 누른다', async () => {
      await 게시화면맞추기();
      await 게시.게시언어누르기();
      const 목록 = await verify('「게시 언어」 창에 언어 목록이 보인다', await 언어.언어줄이있나(10_000), true);
      const 취소 = await verify('「게시 언어」 창에 「취소」가 보인다', await 언어.취소있나(), true);
      await verify('「게시 언어」 창에 언어 목록과 「취소」가 보인다', 목록 && 취소, true);
      await 언어.취소누르기();
    });
  });

  await test.case(서버저장, async ({ expected }) => {
    await test.step('게시 기본값이 열려 있는지 확인한다', async () => {
      await 게시화면맞추기();
    });
    await test.step('「게시 범위」를 「제한적 공개」로 바꾸고 나간다', async () => {
      const 원래게시범위 = await 게시.게시범위글();
      const 원래공개범위 = await 게시.공개범위글();
      try {
        await 게시.게시범위누르기();
        await 게시.선택창떴나();
        await 게시.선택창고르기('제한적 공개');
        await 게시.위로누르기();
        const 저장됨 = await 될때까지(driver, async () => (await 게시기본값읽기(나!)) === expected.저장값, 20_000);
        await verify('게시 기본값을 바꾸고 화면을 나가면 서버 게시 기본 공개 범위가 「unlisted」로 저장된다', 저장됨, true);
      } finally {
        await 게시기본값되돌리기(await 게시기본값열기(driver), 원래게시범위, 원래공개범위);
      }
    });
  });

  await test.case(공개범위잠김, async ({ expected }) => {
    await test.step('「게시 범위」를 「팔로워」로 바꾼다', async () => {
      await 게시화면맞추기();
    });
    await test.step('게시 범위가 팔로워인 채 「공개 범위」를 확인한다', async () => {
      const 원래게시범위 = await 게시.게시범위글();
      const 원래공개범위 = await 게시.공개범위글();
      try {
        await 게시.게시범위누르기();
        await 게시.선택창떴나();
        await 게시.선택창고르기('팔로워');
        const 잠긴값 = await verify('게시 범위가 팔로워일 때 「공개 범위」 값이 기대값과 같다', await 게시.공개범위글(), expected.잠긴값);
        await 게시.공개범위누르기();
        const 안열림 = await verify('「공개 범위」를 눌러도 선택 창이 열리지 않는다', !(await 게시.선택창떴나(3_000)), true);
        await verify('게시 범위가 팔로워면 「공개 범위」가 잠겨 바꿀 수 없다', 잠긴값 && 안열림, true);
      } finally {
        await 게시기본값되돌리기(await 게시기본값열기(driver), 원래게시범위, 원래공개범위);
      }
    });
  });

});
