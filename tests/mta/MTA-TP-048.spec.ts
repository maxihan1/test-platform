import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { type 계정, 계정꺼내기, 목록지우기 } from './helpers/api.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 목록만들기화면 } from './pages/list-create.page.js';
import { 목록관리화면 } from './pages/list-manage.page.js';

const 관리화면 = defineCase({
  tcId: 'MTA-UI-353',
  name: '목록 관리 화면에 목록 줄과 「목록 만들기」가 보이고 줄 옵션 메뉴에 「목록 관리」 · 「리스트 삭제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 목록 관리 화면을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    목록이름: z.string().min(1).describe('옵션 메뉴를 열어 볼 목록 — 일반 회원의 시드 목록 이름').default('개발 소식'),
  }),
  expected: null,
});

const 만들기1단계 = defineCase({
  tcId: 'MTA-UI-355',
  name: '목록 만들기 1단계(「2개 중 1번째 단계」)에 「목록 이름」 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「만들기」가 보인다',
  platforms: ['android'],
  precondition: ['목록 관리 화면이 열려 있다'],
  params: z.object({}),
  expected: z.object({
    단계: z.string().describe('1단계 머리 글').default('2개 중 1번째 단계'),
    이름칸: z.string().describe('목록 이름 칸 힌트').default('목록 이름'),
    버튼: z.string().describe('1단계 버튼 글').default('만들기'),
  }),
});

const 이름비움 = defineCase({
  tcId: 'MTA-FN-661',
  name: '목록 이름이 비어 있으면 「비워둘 수 없습니다」가 보인다',
  platforms: ['android'],
  precondition: ['목록 만들기 1단계가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 만들기2단계 = defineCase({
  tcId: 'MTA-UI-357',
  name: '목록 만들기 2단계(「2개 중 2번째 단계」)에 「추가할 사용자 검색」 · 「아직 구성원이 없습니다」 · 「완료」가 보인다',
  platforms: ['android'],
  precondition: ['목록 이름 「QA 목록」을 적고 「만들기」를 눌렀다'],
  params: z.object({ 목록이름: z.string().min(3).max(30).describe('만들 목록 이름 — 「QA」로 시작').default('QA 목록') }),
  expected: z.object({
    단계: z.string().describe('2단계 머리 글').default('2개 중 2번째 단계'),
    검색: z.string().describe('2단계 검색 안내').default('추가할 사용자 검색'),
    비었음: z.string().describe('2단계 빈 목록 안내').default('아직 구성원이 없습니다'),
    버튼: z.string().describe('2단계 버튼 글').default('완료'),
  }),
});

const 팔로우안한사람검색 = defineCase({
  tcId: 'MTA-FN-426',
  name: '목록 구성원 검색에 팔로우하지 않는 「cafe_moon」을 적으면 찾아지지 않는다',
  platforms: ['android'],
  precondition: ['목록 만들기 2단계가 열려 있다'],
  params: z.object({
    목록이름: z.string().min(3).max(30).describe('만들 목록 이름 — 「QA」로 시작').default('QA 검색 목록'),
    사용자명: z.string().min(1).describe('찾을 계정 — 일반 회원이 팔로우하지 않는 시드 계정의 사용자명').default('cafe_moon'),
  }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-048',
  name: '목록 만들기',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [관리화면, 만들기1단계, 이름비움, 만들기2단계, 팔로우안한사람검색],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 관리 = new 목록관리화면(driver);
  const 만들기 = new 목록만들기화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  let 나: 계정 | undefined;

  await test.cleanup('이 흐름이 만든 목록을 지운다', async () => {
    if (나 !== undefined) await 목록지우기(나, 'QA');
  });

  await test.case(관리화면, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('목록 관리 화면을 확인한다', async () => {
      await 관리.열기();
      const 줄 = await verify('목록 줄이 보인다', await 관리.줄있나(params.목록이름, 10_000), true);
      const 만들기버튼 = await verify('「목록 만들기」가 보인다', await 관리.만들기있나(), true);
      await 관리.줄옵션누르기(params.목록이름);
      const 관리항목 = await verify('줄 옵션 메뉴에 「목록 관리」가 보인다', await 메뉴.항목있나('목록 관리', 5_000), true);
      const 삭제항목 = await verify('줄 옵션 메뉴에 「리스트 삭제」가 보인다', await 메뉴.항목있나('리스트 삭제', 5_000), true);
      await verify('목록 관리 화면에 목록 줄과 「목록 만들기」가 보이고 줄 옵션 메뉴에 「목록 관리」 · 「리스트 삭제」가 보인다', 줄 && 만들기버튼 && 관리항목 && 삭제항목, true);
      await 메뉴.닫기();
    });
  });

  await test.case(만들기1단계, async ({ expected }) => {
    await test.step('「목록 만들기」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.만들기누르기();
      const 단계 = await verify('1단계 머리에 「2개 중 1번째 단계」가 보인다', await 만들기.단계글될때까지(expected.단계), true);
      const 이름칸 = await verify('「목록 이름」 칸이 보인다', await 만들기.이름값(), expected.이름칸);
      const 답장 = await verify('「답장을 표시할 대상:」이 보인다', await 만들기.글있나('답장을 표시할 대상:'), true);
      const 숨기기 = await verify('「팔로우 중인 구성원 숨기기」가 보인다', await 만들기.글있나('팔로우 중인 구성원 숨기기'), true);
      const 버튼 = await verify('「만들기」 버튼이 보인다', await 만들기.단계버튼글(), expected.버튼);
      await verify(
        '목록 만들기 1단계(「2개 중 1번째 단계」)에 「목록 이름」 · 「답장을 표시할 대상:」 · 「팔로우 중인 구성원 숨기기」 · 「만들기」가 보인다',
        단계 && 이름칸 && 답장 && 숨기기 && 버튼,
        true,
      );
    });
  });

  await test.case(이름비움, async () => {
    await test.step('목록 이름을 비운 채 「만들기」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.만들기누르기();
      await 만들기.이름비우기();
      await 만들기.단계버튼누르기();
      await verify('목록 이름이 비어 있으면 「비워둘 수 없습니다」가 보인다', await 만들기.글있나('비워둘 수 없습니다', 10_000), true);
    });
  });

  await test.case(만들기2단계, async ({ params, expected }) => {
    await test.step('목록 이름을 적고 「만들기」를 눌러 2단계로 간다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.만들기누르기();
      await 만들기.이름적기(params.목록이름);
      await 만들기.단계버튼누르기();
      await verify('목록 만들기 2단계가 열린다', await 만들기.두번째단계떴나(), true, { blocker: true });
    });
    await test.step('목록 만들기 2단계를 확인한다', async () => {
      const 단계 = await verify('2단계 머리에 「2개 중 2번째 단계」가 보인다', (await 만들기.위막대글읽기()).includes(expected.단계), true);
      const 검색 = await verify('「추가할 사용자 검색」이 보인다', (await 만들기.구성원검색안내글()).includes(expected.검색), true);
      const 비었음 = await verify('「아직 구성원이 없습니다」가 보인다', await 만들기.구성원없음글(), expected.비었음);
      const 버튼 = await verify('「완료」 버튼이 보인다', await 만들기.단계버튼글(), expected.버튼);
      await verify('목록 만들기 2단계(「2개 중 2번째 단계」)에 「추가할 사용자 검색」 · 「아직 구성원이 없습니다」 · 「완료」가 보인다', 단계 && 검색 && 비었음 && 버튼, true);
      await 만들기.단계버튼누르기();
    });
  });

  await test.case(팔로우안한사람검색, async ({ params }) => {
    await test.step('목록 만들기 2단계를 연다', async () => {
      await 목록지우기(나!, 'QA');
      await 홈에들어가기(driver);
      await 관리.열기();
      await 관리.만들기누르기();
      await 만들기.이름적기(params.목록이름);
      await 만들기.단계버튼누르기();
      if (!(await 만들기.두번째단계떴나())) throw new Error('목록 만들기 2단계가 안 열렸다');
    });
    await test.step('구성원 검색에 팔로우하지 않는 「cafe_moon」을 적는다', async () => {
      await 만들기.구성원검색열기();
      await 만들기.구성원검색적기(params.사용자명);
      await 만들기.구성원검색끝날때까지(params.사용자명);
      await verify('목록 구성원 검색에 팔로우하지 않는 「cafe_moon」을 적으면 찾아지지 않는다', await 만들기.검색결과사용자있나(params.사용자명), false);
    });
  });
});
