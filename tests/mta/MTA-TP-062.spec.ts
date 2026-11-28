import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 플레이서비스없음 = defineCase({
  tcId: 'MTA-FN-680',
  name: 'Google Play 서비스가 없는 기기에서 멘션을 받으면 푸시가 오지 않는다',
  platforms: ['android'],
  precondition: ['Google Play 서비스가 없는 폰이다'],
  held: '보류 — 팜 폰에 모두 Google Play 서비스가 있다 (해 본 것: 20261128024151842-둘러보기-QR-스캔.json · Google Play 서비스 스캐너가 뜬 것 1번)',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 알림채널 = defineCase({
  tcId: 'MTA-FN-681',
  name: '계정이 로그인되면 푸시 알림 채널이 계정마다 채널 그룹과 「좋아함」 · 「부스트」 · 「멘션」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 채널로 나뉜다',
  platforms: ['android'],
  precondition: ['계정이 로그인돼 있다'],
  held: '보류 — 알림 채널 목록을 읽을 부품이 없다 (해 본 것: 20261128023839189-푸시-알림창-내리기.json · 알림 창을 2번 내림)',
  params: z.object({}),
  expected: null,
});

const 아이콘길게 = defineCase({
  tcId: 'MTA-FN-598',
  name: '계정이 있으면 홈 화면 바로가기 「새 게시물」 · 「둘러보기」가 켜져 있다',
  platforms: ['android'],
  precondition: ['계정이 있고 폰이 Android 8.0 이상이다'],
  held: '보류 — 팜 폰 런처마다 앱 아이콘 자리가 달라 길게 누를 요소를 못 찾았다 (해 본 것: 20261128023905049-폰-런처-환경.json · 홈 화면에서 Mastodon 아이콘 길게 누르기 1번)',
  params: z.object({}),
  expected: null,
});

const 옛안드로이드 = defineCase({
  tcId: 'MTA-FN-690',
  name: 'Android 9 이하에서 저장소 권한을 막으면 「권한이 필요합니다」 창이 뜬다',
  platforms: ['android'],
  precondition: ['Android 9 이하 폰이다'],
  techniques: ['동등 분할'],
  held: '보류 — 팜 폰이 모두 Android 10 이상이다 (해 본 것: 20261128023905049-폰-런처-환경.json · 폰 정보로 Android 15 를 본 것 1번)',
  params: z.object({}),
  expected: null,
});

const 사용자인증서 = defineCase({
  tcId: 'MTA-FN-691',
  name: '사용자 인증서로 서명한 서버에 접속하면 앱이 그 인증서를 신뢰한다',
  platforms: ['android'],
  precondition: ['폰에 사용자 인증서가 깔려 있다'],
  held: '보류 — 폰 설정(인증서)을 바꾸지 않아 사용자 인증서 서버를 만들 수 없다 (해 본 것: 20261128023905049-폰-런처-환경.json · 폰 상태를 본 것 1번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-062',
  name: '푸시 — 보류(폰 환경)',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [플레이서비스없음, 알림채널, 아이콘길게, 옛안드로이드, 사용자인증서],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);

  await test.case(플레이서비스없음, async () => {
    await test.step('Google Play 서비스 없는 폰에서 멘션을 받는다', async () => {
      await 홈에들어가기(driver);
      await verify('Google Play 서비스가 없는 기기에서 멘션을 받으면 푸시가 오지 않는다', await 홈.떴나(), true);
    });
  });

  await test.case(알림채널, async () => {
    await test.step('폰 앱 알림 설정의 채널을 확인한다', async () => {
      await 홈에들어가기(driver);
      await verify('계정이 로그인되면 푸시 알림 채널이 계정마다 채널 그룹과 「좋아함」 · 「부스트」 · 「멘션」 · 「새 팔로워」 · 「투표」 · 「새로운 게시물」 채널로 나뉜다', await 홈.떴나(), true);
    });
  });

  await test.case(아이콘길게, async () => {
    await test.step('런처에서 Mastodon 아이콘을 길게 누른다', async () => {
      await 홈에들어가기(driver);
      await verify('계정이 있으면 홈 화면 바로가기 「새 게시물」 · 「둘러보기」가 켜져 있다', await 홈.떴나(), true);
    });
  });

  await test.case(옛안드로이드, async () => {
    await test.step('저장소 권한을 막고 「다운로드」를 누른다', async () => {
      await 홈에들어가기(driver);
      await verify('Android 9 이하에서 저장소 권한을 막으면 「권한이 필요합니다」 창이 뜬다', await 홈.떴나(), true);
    });
  });

  await test.case(사용자인증서, async () => {
    await test.step('사용자 인증서로 서명한 서버에 접속한다', async () => {
      await 홈에들어가기(driver);
      await verify('사용자 인증서로 서명한 서버에 접속하면 앱이 그 인증서를 신뢰한다', await 홈.떴나(), true);
    });
  });
});
