import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 권한상태에서, 권한창답하기, 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 내정보, 푸시구독읽기 } from './helpers/api.helper.js';
import {
  알림설정열기,
  알림일시중지끄기,
  창닫기,
  푸시알림종류들켜졌나,
  푸시알림종류켜기,
  화면글자포함누르기,
  화면글자포함있나,
  화면글자포함사라질때까지,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림설정화면 } from './pages/notification-settings.page.js';

const 일시중지부제 = defineCase({
  tcId: 'MTA-UI-428',
  name: '알림 설정 「모두 일시 중지」가 꺼져 있으면 부제가 「끄기」로 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 알림 설정을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({ 부제: z.string().describe('꺼진 일시 중지 부제').default('끄기') }),
});

const 알림받기선택지 = defineCase({
  tcId: 'MTA-UI-430',
  name: '「알림 받기」 선택지에 「누구나」 · 「나를 팔로우하는 사람들」 · 「내가 팔로우하는 사람들」 · 「알림 받지않기」가 보인다',
  platforms: ['android'],
  precondition: ['알림 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 알림종류체크 = defineCase({
  tcId: 'MTA-UI-431',
  name: '알림 종류 체크 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」이 모두 켜져 보인다',
  platforms: ['android'],
  precondition: ['알림 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 일시중지창 = defineCase({
  tcId: 'MTA-FN-498',
  name: '「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주가 보인다',
  platforms: ['android'],
  precondition: ['알림 설정이 열려 있다'],
  params: z.object({}),
  expected: z.object({ 창제목: z.string().describe('일시 중단 창 제목').default('모든 알림 일시 중단') }),
});

const 일시중지켜기 = defineCase({
  tcId: 'MTA-FN-499',
  name: '「모두 일시 중지」를 켜면 부제가 「<시각>에 종료」로 바뀐다',
  platforms: ['android'],
  precondition: ['「모든 알림 일시 중단」 창이 떠 있다'],
  params: z.object({}),
  expected: null,
});

const 지금재개 = defineCase({
  tcId: 'MTA-FN-505',
  name: '알림 일시 중지 중이면 배너에 「<시각>에 알림이 다시 시작됩니다.」와 「지금 재개」가 보이고 누르면 재개된다',
  platforms: ['android'],
  precondition: ['알림을 일시 중지했다'],
  params: z.object({}),
  expected: null,
});

const 푸시구독끄기 = defineCase({
  tcId: 'MTA-FN-503',
  name: '알림 종류 체크를 끄면 서버 푸시 구독의 그 종류가 꺼진다',
  platforms: ['android'],
  precondition: ['알림 설정이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 알림권한없음 = defineCase({
  tcId: 'MTA-FN-504',
  name: '기기 알림이 꺼져 있으면 알림 설정 위에 「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」와 「알림 설정으로 이동」 배너가 보인다',
  platforms: ['android'],
  precondition: ['앱의 알림 권한을 뺐다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-057',
  name: '알림 설정',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [일시중지부제, 알림받기선택지, 일시중지창, 일시중지켜기, 지금재개, 푸시구독끄기, 알림권한없음, 알림종류체크],
});

const 푸시종류 = ['mention', 'reblog', 'favourite', 'follow', 'poll', 'status'];

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 알림설정화면(driver);
  let 나: 계정 | undefined;
  let 나사용자명 = '';

  await test.cleanup('이 흐름이 바꾼 알림 설정을 되돌린다', async () => {
    if (나 === undefined) return;
    await 푸시알림종류켜기(나, 'reblog');
    await 알림일시중지끄기(driver, 나사용자명);
  });

  await test.case(일시중지부제, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      나사용자명 = (await 내정보(나!)).username;
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('일반 회원으로 알림 설정을 연다', async () => {
      await 알림일시중지끄기(driver, 나사용자명);
      await verify('알림 설정이 보인다', await 설정.떴나(), true, { blocker: true });
    });
    await test.step('「모두 일시 중지」 부제를 확인한다', async () => {
      await verify('알림 설정 「모두 일시 중지」가 꺼져 있으면 부제가 「끄기」로 보인다', await 설정.일시중지부제(), expected.부제);
    });
  });

  await test.case(알림받기선택지, async () => {
    await test.step('알림 설정이 열려 있는지 보고 닫혀 있으면 다시 연다', async () => {
      if (!(await 설정.떴나(2_000))) await 알림설정열기(driver, 나사용자명);
    });
    await test.step('「알림 받기」를 누른다', async () => {
      await 설정.알림받기누르기();
      await 설정.알림받기창떴나();
      const 선택지 = await 설정.알림받기선택지();
      const 누구나 = await verify('「누구나」가 보인다', 선택지.includes('누구나'), true);
      const 나를 = await verify('「나를 팔로우하는 사람들」이 보인다', 선택지.includes('나를 팔로우하는 사람들'), true);
      const 내가 = await verify('「내가 팔로우하는 사람들」이 보인다', 선택지.includes('내가 팔로우하는 사람들'), true);
      const 받지않기 = await verify('「알림 받지않기」가 보인다', 선택지.includes('알림 받지않기'), true);
      await verify(
        '「알림 받기」 선택지에 「누구나」 · 「나를 팔로우하는 사람들」 · 「내가 팔로우하는 사람들」 · 「알림 받지않기」가 보인다',
        누구나 && 나를 && 내가 && 받지않기,
        true,
      );
      await 창닫기(driver);
    });
  });

  await test.case(일시중지창, async ({ expected }) => {
    await test.step('알림 설정을 열고 일시 중지를 끈 채로 둔다', async () => {
      await 알림일시중지끄기(driver, 나사용자명);
    });
    await test.step('「모두 일시 중지」를 켠다', async () => {
      await 설정.일시중지스위치누르기();
      const 열림 = await verify('「모든 알림 일시 중단」 창이 뜬다', await 설정.일시중지창떴나(expected.창제목), true);
      const 선택지 = await 설정.일시중지창선택지();
      const 삼십분 = await verify('30분이 보인다', 선택지.includes('30분'), true);
      const 한시간 = await verify('1시간이 보인다', 선택지.includes('1시간'), true);
      const 열두시간 = await verify('12시간이 보인다', 선택지.includes('12시간'), true);
      const 하루 = await verify('1일이 보인다', 선택지.includes('1일'), true);
      const 사흘 = await verify('3일이 보인다', 선택지.includes('3일'), true);
      const 한주 = await verify('1 주가 보인다', 선택지.includes('1 주'), true);
      await verify(
        '「모두 일시 중지」를 켜면 「모든 알림 일시 중단」 창에 30분 · 1시간 · 12시간 · 1일 · 3일 · 1 주가 보인다',
        열림 && 삼십분 && 한시간 && 열두시간 && 하루 && 사흘 && 한주,
        true,
      );
    });
  });

  await test.case(일시중지켜기, async () => {
    await test.step('「모든 알림 일시 중단」 창이 떠 있는지 보고 닫혀 있으면 다시 띄운다', async () => {
      if (!(await 설정.일시중지창떴나('모든 알림 일시 중단', 2_000))) {
        await 알림일시중지끄기(driver, 나사용자명);
        await 설정.일시중지스위치누르기();
        if (!(await 설정.일시중지창떴나('모든 알림 일시 중단', 10_000))) throw new Error('모든 알림 일시 중단 창이 안 떴다');
      }
    });
    await test.step('창에서 30분을 고른다', async () => {
      await 설정.일시중지고르기('30분');
      await verify('「모두 일시 중지」를 켜면 부제가 「<시각>에 종료」로 바뀐다', await 될때까지(driver, async () => /에 종료$/.test(await 설정.일시중지부제()), 15_000), true);
    });
  });

  await test.case(지금재개, async () => {
    await test.step('알림을 일시 중지한 상태인지 보고 아니면 30분 일시 중지한다', async () => {
      if (!(await 설정.떴나(2_000))) await 알림설정열기(driver, 나사용자명);
      if (!(await 설정.일시중지켜졌나())) {
        await 설정.일시중지스위치누르기();
        await 설정.일시중지고르기('30분');
      }
    });
    await test.step('일시 중지 중 배너의 「지금 재개」를 누른다', async () => {
      const 안내 = await verify('배너에 「<시각>에 알림이 다시 시작됩니다.」가 보인다', await 화면글자포함있나(driver, '에 알림이 다시 시작됩니다.', 10_000), true);
      const 버튼 = await verify('배너에 「지금 재개」가 보인다', await 화면글자포함있나(driver, '지금 재개'), true);
      await 화면글자포함누르기(driver, '지금 재개');
      const 재개 = await verify('알림이 재개된다', await 화면글자포함사라질때까지(driver, '지금 재개', 15_000), true);
      await verify(
        '알림 일시 중지 중이면 배너에 「<시각>에 알림이 다시 시작됩니다.」와 「지금 재개」가 보이고 누르면 재개된다',
        안내 && 버튼 && 재개,
        true,
      );
    });
  });

  await test.case(푸시구독끄기, async () => {
    await test.step('알림 설정을 열고 서버 푸시 구독의 「부스트」를 켠 채로 맞춘다', async () => {
      await 푸시알림종류켜기(나!, 'reblog');
      await 알림설정열기(driver, 나사용자명);
    });
    await test.step('「부스트」 체크를 끄고 나간다', async () => {
      await 설정.종류줄누르기('부스트');
      await 설정.위로누르기();
      await verify('알림 종류 체크를 끄면 서버 푸시 구독의 그 종류가 꺼진다', await 될때까지(driver, async () => (await 푸시구독읽기(나!)).alerts.reblog === false, 30_000), true);
    });
    await test.step('꺼 둔 「부스트」 체크를 다시 켠다', async () => {
      await 알림설정열기(driver, 나사용자명);
      await 설정.종류줄누르기('부스트');
      await 설정.위로누르기();
    });
  });

  await test.case(알림권한없음, async () => {
    await test.step('알림 권한이 없는 채 알림 설정을 연다', async () => {
      await 권한상태에서(driver, { 뺀다: ['android.permission.POST_NOTIFICATIONS'] }, async () => {
        await 권한창답하기(driver, '거부');
        await 알림설정열기(driver, 나사용자명);
        const 안내 = await verify('「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」가 보인다', await 화면글자포함있나(driver, '어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기', 10_000), true);
        const 이동 = await verify('「알림 설정으로 이동」이 보인다', await 화면글자포함있나(driver, '알림 설정으로 이동'), true);
        await verify(
          '기기 알림이 꺼져 있으면 알림 설정 위에 「어디에서든 업데이트를 확인할 수 있도록 기기 설정에서 알림 켜기」와 「알림 설정으로 이동」 배너가 보인다',
          안내 && 이동,
          true,
        );
      });
    });
  });

  await test.case(알림종류체크, async () => {
    await test.step('알림 설정이 열려 있는지 다시 보고 닫혀 있으면 연다', async () => {
      if (!(await 설정.떴나(2_000))) await 알림설정열기(driver, 나사용자명);
    });
    await test.step('알림 종류 체크를 확인한다', async () => {
      const 언급 = await verify('「언급과 답장」이 보인다', await 설정.종류줄있나('언급과 답장'), true);
      const 부스트 = await verify('「부스트」가 보인다', await 설정.종류줄있나('부스트'), true);
      const 좋아함 = await verify('「좋아함」이 보인다', await 설정.종류줄있나('좋아함'), true);
      const 새팔로워 = await verify('「새 팔로워」가 보인다', await 설정.종류줄있나('새 팔로워'), true);
      const 투표 = await verify('「투표」가 보인다', await 설정.종류줄있나('투표'), true);
      const 새글 = await verify('「새로운 게시물」이 보인다', await 설정.종류줄있나('새로운 게시물'), true);
      const 인용 = await verify('「인용」이 보인다', await 설정.종류줄있나('인용'), true);
      const 구독켜짐 = await verify('서버 푸시 구독의 알림 종류가 모두 켜져 있다', await 푸시알림종류들켜졌나(나!, 푸시종류), true);
      await verify(
        '알림 종류 체크 「언급과 답장」 · 「부스트」 · 「좋아함」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 · 「인용」이 모두 켜져 보인다',
        언급 && 부스트 && 좋아함 && 새팔로워 && 투표 && 새글 && 인용 && 구독켜짐,
        true,
      );
    });
  });
});
