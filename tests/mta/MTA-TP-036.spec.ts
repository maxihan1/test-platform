import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 둘러보기게시물내리기, 둘러보기맨위글 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 둘러보기화면 } from './pages/explore.page.js';
import { 홈화면 } from './pages/home.page.js';

const QR스캔열기 = defineCase({
  tcId: 'MTA-FN-643',
  name: 'QR 결과가 https 주소면 앱 안에서 연다',
  platforms: ['android'],
  precondition: ['폰 카메라로 비출 QR 코드가 있다'],
  held: '보류 — QR 스캔은 카메라로 실제 코드를 비춰야 한다',
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

const 같은탭다시누르기 = defineCase({
  tcId: 'MTA-FN-644',
  name: '둘러보기에서 같은 탭을 다시 누르면 맨 위로 올라간다',
  platforms: ['android'],
  precondition: ['둘러보기 「게시물」 탭이 한 화면 넘게 차 있다'],
  held: '보류 — 둘러보기 게시물이 적어 목록이 내려가지 않는다',
  params: z.object({}),
  expected: null,
});

const 소식탭 = defineCase({
  tcId: 'MTA-UI-520',
  name: '둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 유행 링크 카드가 보인다',
  platforms: ['android'],
  precondition: ['서버에 유행 링크가 있다'],
  held: '보류 — 대상 서버에 유행 링크 자료가 없다 (해 본 것: 20261128024058935-둘러보기-탭-QR.json · 「소식」 탭 1번)',
  params: z.object({}),
  expected: null,
});

const 추천탭 = defineCase({
  tcId: 'MTA-UI-521',
  name: '둘러보기 「추천」 탭에 안내 「다른 사용자가 팔로우하는 계정을 기준으로, 이런 계정들도 좋아할 수 있습니다.」와 추천 계정이 보인다',
  platforms: ['android'],
  precondition: ['서버에 추천 계정이 있다'],
  held: '보류 — 대상 서버에 추천 계정 자료가 없다 (해 본 것: 20261128024058935-둘러보기-탭-QR.json · 「추천」 탭 1번)',
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-036',
  name: '둘러보기 — 보류 항목',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [QR스캔열기, 소식탭, 추천탭, 같은탭다시누르기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 둘러보기 = new 둘러보기화면(driver);

  await test.case(QR스캔열기, async () => {
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('QR 코드를 스캔한다', async () => {
      await 둘러보기.열기();
      await 둘러보기.QR스캔누르기();
      await verify('QR 결과가 https 주소면 앱 안에서 연다', await 사라질때까지(driver, 둘러보기화면.검색창, 60_000), true);
    });
  });

  await test.case(소식탭, async () => {
    await test.step('「소식」 탭을 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('소식');
      await verify('둘러보기 「소식」 탭에 안내 「당신이 속한 마스토돈 서버에서 관심을 끌고 있는 뉴스 스토리들입니다.」와 유행 링크 카드가 보인다', await 둘러보기.탭선택됐나('소식'), true);
    });
  });

  await test.case(추천탭, async () => {
    await test.step('「추천」 탭을 확인한다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('추천');
      await verify('둘러보기 「추천」 탭에 안내 「다른 사용자가 팔로우하는 계정을 기준으로, 이런 계정들도 좋아할 수 있습니다.」와 추천 계정이 보인다', await 둘러보기.탭선택됐나('추천'), true);
    });
  });

  await test.case(같은탭다시누르기, async () => {
    let 처음글 = '';
    await test.step('둘러보기 「게시물」 탭을 아래로 내린다', async () => {
      await 홈에들어가기(driver);
      await 둘러보기.열기();
      await 둘러보기.탭누르기('게시물');
      await 둘러보기.유행글있나(15_000);
      처음글 = await 둘러보기맨위글(driver);
      await 둘러보기게시물내리기(driver, 3);
      await verify('둘러보기 목록이 내려가 맨 위 글이 바뀌었다', await 될때까지(driver, async () => (await 둘러보기맨위글(driver)) !== 처음글, 10_000), true, { blocker: true });
    });
    await test.step('내린 뒤 같은 탭을 다시 누른다', async () => {
      await 둘러보기.탭누르기('게시물');
      await verify('둘러보기에서 같은 탭을 다시 누르면 맨 위로 올라간다', await 될때까지(driver, async () => (await 둘러보기맨위글(driver)) === 처음글, 15_000), true);
    });
  });
});
