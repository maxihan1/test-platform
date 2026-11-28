import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 뒤로보냈다오기, 뜰때까지, 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 글카드 } from './components/status-card.component.js';
import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 글고치기, 글쓰기, 내글지우기, 내정보, 멘션보내기, 부스트, 부스트취소, 언팔로우, 좋아요, 팔로우 } from './helpers/api.helper.js';
import { 알림에서줄찾을때까지, 알림탭열기, 이름 } from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 알림화면 } from './pages/notifications.page.js';
import { 프로필화면 } from './pages/profile.page.js';
import { 글상세화면 } from './pages/thread.page.js';

const 알림탭모양 = defineCase({
  tcId: 'MTA-UI-246',
  name: '알림 화면에 탭 「모든 것」 · 「멘션」이 보이고 「모든 것」이 선택돼 있다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 알림 탭을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    모든것: z.string().describe('첫 탭 글자').default('모든 것'),
    멘션: z.string().describe('둘째 탭 글자').default('멘션'),
  }),
});

const 팔로우알림 = defineCase({
  tcId: 'MTA-FN-307',
  name: '팔로우 알림 「<이름> 님이 나를 팔로우했습니다」를 누르면 그 사람 프로필이 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 나를 팔로우했다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

const 부스트와좋아요알림 = defineCase({
  tcId: 'MTA-FN-310',
  name: '부스트 알림 「<이름> 님이 부스트했습니다:」를 누르면 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 내 글을 부스트했다', '두 번째 사용자가 내 글을 좋아요했다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP030」으로 시작하는 500자까지').default('QA TP030 부스트와 좋아요를 받을 글'),
  }),
  expected: null,
});

const 멘션알림 = defineCase({
  tcId: 'MTA-FN-312',
  name: '멘션 알림은 글 카드 위 줄이 「멘션」이고 누르면 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 나를 멘션했다'],
  params: z.object({
    본문: z.string().min(1).max(450).describe('두 번째 사용자가 API 로 멘션할 글 — 「QA TP030」으로 시작하는 450자까지').default('QA TP030 멘션'),
  }),
  expected: z.object({ 위줄: z.string().describe('멘션 알림 글 카드 위 줄').default('멘션') }),
});

const 인용알림 = defineCase({
  tcId: 'MTA-FN-313',
  name: '인용 알림 「<이름>가 당신의 게시물을 인용했습니다:」를 누르면 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 내 글을 인용했다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 내 글 — 「QA TP030」으로 시작하는 500자까지').default('QA TP030 인용될 글'),
  }),
  expected: null,
});

const 수정알림 = defineCase({
  tcId: 'MTA-FN-316',
  name: '글 수정 알림 「<이름> 님이 당신이 참여한 게시글을 편집했습니다.」를 누르면 글 상세가 열린다',
  platforms: ['android'],
  precondition: ['내가 부스트한 두 번째 사용자 글을 그 사람이 고쳤다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP030」으로 시작하는 500자까지').default('QA TP030 고쳐질 글'),
  }),
  expected: null,
});

const 멘션탭 = defineCase({
  tcId: 'MTA-FN-302',
  name: '알림 「멘션」 탭을 누르면 멘션 종류 알림만 보인다',
  platforms: ['android'],
  precondition: ['알림에 멘션과 멘션 아닌 알림이 섞여 있다'],
  params: z.object({
    본문: z.string().min(1).max(450).describe('두 번째 사용자가 API 로 멘션할 글 — 「QA TP030」으로 시작하는 450자까지').default('QA TP030 멘션 탭 글'),
  }),
  expected: null,
});

const 모두읽음 = defineCase({
  tcId: 'MTA-FN-305',
  name: '「모두 읽은 상태로 표시」를 누르면 「알림」 탭 배지가 사라진다',
  platforms: ['android'],
  precondition: ['안 읽은 알림이 있다'],
  params: z.object({
    본문: z.string().min(1).max(450).describe('두 번째 사용자가 API 로 멘션할 글 — 「QA TP030」으로 시작하는 450자까지').default('QA TP030 안 읽은 알림 글'),
  }),
  expected: null,
});

const 알림메뉴 = defineCase({
  tcId: 'MTA-UI-518',
  name: '알림 화면 메뉴에 「알림 제외 조건…」이 보인다',
  platforms: ['android'],
  precondition: ['알림 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-030',
  name: '알림 — 탭과 종류',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [알림탭모양, 팔로우알림, 부스트와좋아요알림, 멘션알림, 인용알림, 수정알림, 멘션탭, 모두읽음, 알림메뉴],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 상세 = new 글상세화면(driver);
  const 프로필 = new 프로필화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 부스트한글id: string | undefined;

  await test.cleanup('이 흐름이 올린 글 · 부스트 · 팔로우를 되돌린다', async () => {
    if (나 !== undefined) {
      if (부스트한글id !== undefined) await 부스트취소(나, 부스트한글id);
      await 내글지우기(나, 'QA TP030');
    }
    if (둘째 !== undefined) {
      await 팔로우(둘째, 'qa_user1');
      await 내글지우기(둘째, 'QA TP030');
      await 내글지우기(둘째, '@qa_user1 QA TP030');
    }
  });

  await test.case(알림탭모양, async ({ params, expected }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('일반 회원으로 알림 탭을 연다', async () => {
      await 알림탭열기(driver);
    });
    await test.step('알림 화면 탭을 확인한다', async () => {
      const 알림 = new 알림화면(driver);
      const 첫탭 = await verify('알림 화면에 탭 「모든 것」이 보인다', await 알림.탭글('모든 것'), expected.모든것);
      const 둘째탭 = await verify('알림 화면에 탭 「멘션」이 보인다', await 알림.탭글('멘션'), expected.멘션);
      const 선택 = await verify('「모든 것」이 선택돼 있다', await 알림.탭골라졌나('모든 것'), true);
      await verify('알림 화면에 탭 「모든 것」 · 「멘션」이 보이고 「모든 것」이 선택돼 있다', 첫탭 && 둘째탭 && 선택, true);
    });
  });

  await test.case(팔로우알림, async ({ params }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    const 둘째정보 = await 내정보(둘째);
    const 줄글자 = `${이름(둘째정보)} 님이 나를 팔로우했습니다`;
    await test.step('두 번째 사용자가 API 로 나를 다시 팔로우한다', async () => {
      await 언팔로우(둘째!, 'qa_user1');
      await 팔로우(둘째!, 'qa_user1');
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 팔로우 알림이 보인다', await 알림에서줄찾을때까지(driver, 줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('팔로우 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(줄글자);
      const 열림 = await verify('프로필이 열린다', await 프로필.떴나(), true);
      const 계정 = await verify('열린 프로필이 두 번째 사용자의 것이다', (await 프로필.계정글()).includes(둘째정보.username), true);
      await verify('팔로우 알림 「<이름> 님이 나를 팔로우했습니다」를 누르면 그 사람 프로필이 열린다', 열림 && 계정, true);
    });
  });

  await test.case(부스트와좋아요알림, async ({ params }) => {
    const 둘째정보 = await 내정보(둘째!);
    const 부스트줄 = `${이름(둘째정보)} 님이 부스트했습니다:`;
    const 좋아요줄 = `${이름(둘째정보)} 개의 즐겨찾기:`;
    await test.step('두 번째 사용자가 API 로 내 글을 부스트하고 좋아요한다', async () => {
      await 내글지우기(나!, 'QA TP030');
      const 올린글 = await 글쓰기(나!, params.본문);
      await 부스트(둘째!, 올린글.id);
      await 좋아요(둘째!, 올린글.id);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 부스트 알림이 보인다', await 알림에서줄찾을때까지(driver, 부스트줄), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('부스트 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(부스트줄);
      await verify('부스트 알림 「<이름> 님이 부스트했습니다:」를 누르면 글 상세가 열린다', await 상세.떴나(), true);
      await 상세.뒤로();
    });
    await test.step('좋아요 알림을 확인한다', async () => {
      const 알림 = await 알림탭열기(driver);
      await verify('좋아요 알림에 「<이름> 개의 즐겨찾기:」가 보인다', await 알림.줄있나(좋아요줄, 15_000), true);
    });
  });

  await test.case(멘션알림, async ({ params, expected }) => {
    await test.step('두 번째 사용자가 API 로 나를 멘션한다', async () => {
      await 멘션보내기(둘째!, 'qa_user1', params.본문);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 멘션 알림이 보인다', await 알림에서줄찾을때까지(driver, params.본문), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('멘션 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄있나(params.본문, 10_000);
      const 위줄 = await verify('멘션 알림 글 카드 위 줄이 「멘션」이다', await 카드.위줄글(params.본문), expected.위줄);
      await 알림.줄누르기(params.본문);
      const 열림 = await verify('글 상세가 열린다', await 상세.떴나(), true);
      await verify('멘션 알림은 글 카드 위 줄이 「멘션」이고 누르면 글 상세가 열린다', 위줄 && 열림, true);
      await 상세.뒤로();
    });
  });

  await test.case(인용알림, async ({ params }) => {
    const 둘째정보 = await 내정보(둘째!);
    const 줄글자 = `${이름(둘째정보)}가 당신의 게시물을 인용했습니다:`;
    await test.step('두 번째 사용자가 API 로 내 글을 인용한다', async () => {
      const 올린글 = await 글쓰기(나!, params.본문);
      await 글쓰기(둘째!, 'QA TP030 인용 글', { quoted_status_id: 올린글.id });
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 인용 알림이 보인다', await 알림에서줄찾을때까지(driver, 줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('인용 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(줄글자);
      await verify('인용 알림 「<이름>가 당신의 게시물을 인용했습니다:」를 누르면 글 상세가 열린다', await 상세.떴나(), true);
      await 상세.뒤로();
    });
  });

  await test.case(수정알림, async ({ params }) => {
    const 둘째정보 = await 내정보(둘째!);
    const 줄글자 = `${이름(둘째정보)} 님이 당신이 참여한 게시글을 편집했습니다.`;
    await test.step('내가 부스트한 두 번째 사용자 글을 그 사람이 API 로 고친다', async () => {
      const 올린글 = await 글쓰기(둘째!, params.본문);
      await 부스트(나!, 올린글.id);
      부스트한글id = 올린글.id;
      await 글고치기(둘째!, 올린글.id, `${params.본문} 고침`);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 글 수정 알림이 보인다', await 알림에서줄찾을때까지(driver, 줄글자), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('글 수정 알림을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.줄누르기(줄글자);
      await verify('글 수정 알림 「<이름> 님이 당신이 참여한 게시글을 편집했습니다.」를 누르면 글 상세가 열린다', await 상세.떴나(), true);
      await 상세.뒤로();
    });
  });

  await test.case(멘션탭, async ({ params }) => {
    await test.step('두 번째 사용자가 API 로 나를 멘션하고 내 글을 좋아요한다', async () => {
      await 멘션보내기(둘째!, 'qa_user1', params.본문);
      const 올린글 = await 글쓰기(나!, 'QA TP030 좋아요 받을 글');
      await 좋아요(둘째!, 올린글.id);
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 멘션 알림이 보인다', await 알림에서줄찾을때까지(driver, params.본문), true, { blocker: true });
      await verify('알림 화면이 열려 있다', await 알림.떴나(), true, { blocker: true });
    });
    await test.step('「멘션」 탭을 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.탭누르기('멘션');
      await 알림.탭골라질때까지('멘션');
      const 멘션있음 = await verify('멘션 알림이 보인다', await 알림.줄있나(params.본문, 15_000), true);
      const 글들 = await 알림.줄글읽기();
      const 다른종류 = 글들.some((글) => /즐겨찾기|부스트했습니다|팔로우했습니다|편집했습니다|인용했습니다/.test(글));
      const 다른종류없음 = await verify('멘션이 아닌 알림은 보이지 않는다', 다른종류, false);
      await verify('알림 「멘션」 탭을 누르면 멘션 종류 알림만 보인다', 멘션있음 && 다른종류없음, true);
      await 알림.탭누르기('모든 것');
    });
  });

  await test.case(모두읽음, async ({ params }) => {
    const 탭 = new 하단탭(driver);
    await test.step('두 번째 사용자가 API 로 나를 멘션해 안 읽은 알림을 만든다', async () => {
      await 멘션보내기(둘째!, 'qa_user1', params.본문);
      await 홈에들어가기(driver);
      const 떴다 = await 될때까지(
        driver,
        async () => {
          await 뒤로보냈다오기(driver, 3);
          return 뜰때까지(driver, 하단탭.알림배지, 8_000);
        },
        60_000,
      );
      await verify('「알림」 탭 배지가 보인다', 떴다, true, { blocker: true });
    });
    await test.step('「모두 읽은 상태로 표시」를 누른다', async () => {
      const 알림 = await 알림탭열기(driver);
      await 알림.모두읽음누르기();
      await 탭.누르기('홈');
      await verify('「모두 읽은 상태로 표시」를 누르면 「알림」 탭 배지가 사라진다', await 사라질때까지(driver, 하단탭.알림배지, 20_000), true);
    });
  });

  await test.case(알림메뉴, async () => {
    await test.step('알림 화면을 연다', async () => {
      await 알림탭열기(driver);
    });
    await test.step('알림 화면 메뉴를 연다', async () => {
      const 알림 = new 알림화면(driver);
      await verify('알림 화면 메뉴에 「알림 제외 조건…」이 보인다', await 알림.제외조건버튼보이나(), true);
    });
  });
});
