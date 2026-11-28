import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { type 계정, 계정꺼내기, 목록지우기 } from './helpers/api.helper.js';
import { QA목록만들기, 관계맞추기, 목록구성원사용자명들, 창에글있나, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 목록에추가화면 } from './pages/add-to-list.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록편집화면 } from './pages/list-edit.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';
import { 구성원화면 } from './pages/list-members.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 편집화면 = defineCase({
  tcId: 'MTA-UI-359',
  name: '목록 편집 화면에 이름 · 답장 정책 · 숨기기 스위치 · 「리스트 구성원」 · 「리스트 삭제」가 보인다',
  platforms: ['android'],
  precondition: ['「QA 목록」이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    목록이름: z.string().min(3).max(30).describe('API 로 만들 목록 이름 — 「QA」로 시작').default('QA 목록'),
  }),
  expected: null,
});

const 목록에추가 = defineCase({
  tcId: 'MTA-FN-429',
  name: '목록에 추가 화면에 「news_bot 가 표시되는 목록 관리하기」와 내 목록 체크가 보이고 체크를 켜면 켜진다',
  platforms: ['android'],
  precondition: ['news_bot 글 더보기에서 「목록에서 추가 또는 제거」를 열었다'],
  params: z.object({
    목록이름: z.string().min(3).max(30).describe('API 로 만들 목록 이름 — 「QA」로 시작').default('QA 목록'),
    사용자명: z.string().min(1).describe('목록에 넣을 계정 — 일반 회원이 팔로우하는 계정의 사용자명').default('news_bot'),
  }),
  expected: null,
});

const 구성원제거묻기 = defineCase({
  tcId: 'MTA-FN-428',
  name: '구성원 목록에서 고른 뒤 「제거」를 누르면 「구성원을 제거하시겠습니까?」를 묻는다',
  platforms: ['android'],
  precondition: ['「QA 목록」에 구성원 news_bot 이 있다'],
  params: z.object({
    목록이름: z.string().min(3).max(30).describe('API 로 만들 목록 이름 — 「QA」로 시작').default('QA 목록'),
    사용자명: z.string().min(1).describe('구성원으로 넣을 계정 — 일반 회원이 팔로우하는 계정의 사용자명').default('news_bot'),
  }),
  expected: null,
});

const 도구줄관리 = defineCase({
  tcId: 'MTA-FN-658',
  name: '목록 타임라인 도구 줄의 「목록 관리」를 누르면 「리스트 구성원」이 있는 「목록 관리」 화면이 열린다',
  platforms: ['android'],
  precondition: ['목록 「개발 소식」이 있다'],
  params: z.object({ 목록이름: z.string().min(1).describe('열어 볼 목록 — 일반 회원의 시드 목록 이름').default('개발 소식') }),
  expected: z.object({ 제목: z.string().describe('목록 편집 화면 제목').default('목록 관리') }),
});

const 삭제묻기 = defineCase({
  tcId: 'MTA-FN-662',
  name: '목록 삭제를 누르면 「“QA 목록” 삭제」 확인 창과 「삭제」 · 「취소」가 뜬다',
  platforms: ['android'],
  precondition: ['「QA 목록」이 있다'],
  params: z.object({ 목록이름: z.string().min(3).max(30).describe('API 로 만들 목록 이름 — 「QA」로 시작').default('QA 목록') }),
  expected: z.object({
    확인: z.string().describe('삭제 확인 버튼 글').default('삭제'),
    취소: z.string().describe('삭제 취소 버튼 글').default('취소'),
  }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-076',
  name: '목록 관리와 구성원',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [편집화면, 목록에추가, 구성원제거묻기, 도구줄관리, 삭제묻기],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 목록관리화면(driver);
  const 편집 = new 목록편집화면(driver);
  const 구성원 = new 구성원화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 만든 목록을 지운다', async () => {
    if (나 !== undefined) await 목록지우기(나, 'QA');
  });

  await test.case(편집화면, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('「QA 목록」을 API 로 만든다', async () => {
      await QA목록만들기(나!, params.목록이름);
    });
    await test.step('목록 줄 옵션에서 「목록 관리」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄옵션누르기(params.목록이름);
      await 메뉴.항목누르기('목록 관리');
      await verify('목록 편집 화면이 열린다', await 편집.떴나(15_000), true, { blocker: true });
      const 이름 = await verify('목록 이름 칸에 목록 이름이 보인다', await 편집.이름값(), params.목록이름);
      const 답장 = await verify('답장 정책이 보인다', (await 편집.답장정책글()) !== '', true);
      const 숨기기 = await verify('숨기기 스위치가 보인다', await 편집.숨기기스위치있나(), true);
      const 구성원줄 = await verify('「리스트 구성원」이 보인다', await 편집.구성원있나(), true);
      const 삭제 = await verify('「리스트 삭제」가 보인다', await 편집.삭제메뉴있나(), true);
      await verify('목록 편집 화면에 이름 · 답장 정책 · 숨기기 스위치 · 「리스트 구성원」 · 「리스트 삭제」가 보인다', 이름 && 답장 && 숨기기 && 구성원줄 && 삭제, true);
    });
  });

  await test.case(목록에추가, async ({ params }) => {
    let 목록id = '';
    await test.step('「QA 목록」을 만들고 news_bot 을 팔로우한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: true });
      목록id = await QA목록만들기(나!, params.목록이름);
    });
    await test.step('「QA 목록」 체크를 켠다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await new 프로필화면(driver).메뉴열기();
      await 메뉴.항목누르기('목록에서 추가 또는 제거');
      const 추가화면 = new 목록에추가화면(driver);
      const 떴다 = await verify('목록에 추가 화면이 열린다', await 추가화면.떴나(), true);
      const 안내 = await verify('「news_bot 가 표시되는 목록 관리하기」가 보인다', await 추가화면.안내글(), `${params.사용자명} 가 표시되는 목록 관리하기`);
      const 내목록 = await verify('내 목록 체크가 보인다', (await 추가화면.목록이름글들()).includes(params.목록이름), true);
      await 추가화면.목록누르기(params.목록이름);
      const 켜짐 = await verify('「QA 목록」 체크가 켜진다', await 될때까지(driver, async () => (await 목록구성원사용자명들(나!, 목록id)).includes(params.사용자명), 20_000), true);
      await verify('목록에 추가 화면에 「news_bot 가 표시되는 목록 관리하기」와 내 목록 체크가 보이고 체크를 켜면 켜진다', 떴다 && 안내 && 내목록 && 켜짐, true);
    });
  });

  await test.case(구성원제거묻기, async ({ params }) => {
    await test.step('「QA 목록」에 구성원 news_bot 을 넣어 둔다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: true });
      await QA목록만들기(나!, params.목록이름, [params.사용자명]);
    });
    await test.step('구성원 목록에서 선택 모드로 news_bot 을 골라 「제거」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄누르기(params.목록이름);
      await 관리.타임라인구성원누르기();
      await verify('구성원 목록이 열린다', await 구성원.떴나(15_000), true, { blocker: true });
      await 구성원.선택모드켜기();
      await 구성원.줄누르기(params.사용자명);
      await 구성원.제거누르기();
      await verify('구성원 목록에서 고른 뒤 「제거」를 누르면 「구성원을 제거하시겠습니까?」를 묻는다', await 창에글있나(창, '구성원을 제거하시겠습니까?'), true);
      await 창.취소누르기();
    });
  });

  await test.case(도구줄관리, async ({ params, expected }) => {
    await test.step('목록 타임라인 도구 줄의 「목록 관리」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄누르기(params.목록이름);
      await 관리.타임라인관리누르기();
      const 구성원줄 = await verify('「리스트 구성원」이 보인다', await 편집.떴나(15_000), true);
      const 제목 = await verify('화면 제목이 「목록 관리」다', await 관리.위막대제목글(), expected.제목);
      await verify('목록 타임라인 도구 줄의 「목록 관리」를 누르면 「리스트 구성원」이 있는 「목록 관리」 화면이 열린다', 구성원줄 && 제목, true);
    });
  });

  await test.case(삭제묻기, async ({ params, expected }) => {
    await test.step('삭제해 볼 「QA 목록」을 API 로 만든다', async () => {
      await QA목록만들기(나!, params.목록이름);
    });
    await test.step('「리스트 삭제」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.줄옵션누르기(params.목록이름);
      await 메뉴.항목누르기('리스트 삭제');
      const 떴다 = await verify('삭제 확인 창이 뜬다', await 창.떴나(), true);
      const 제목 = await verify('창에 「“QA 목록” 삭제」가 보인다', await 창에글있나(창, `“${params.목록이름}” 삭제`), true);
      const 확인 = await verify('창의 확인 버튼이 「삭제」다', await 창.확인버튼글(), expected.확인);
      const 취소 = await verify('창의 취소 버튼이 「취소」다', await 창.취소버튼글(), expected.취소);
      await verify('목록 삭제를 누르면 「“QA 목록” 삭제」 확인 창과 「삭제」 · 「취소」가 뜬다', 떴다 && 제목 && 확인 && 취소, true);
      await 창.취소누르기();
    });
  });
});
