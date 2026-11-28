import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 부스트시트 } from './components/boost-sheet.component.js';
import { 글카드 } from './components/status-card.component.js';
import { type 계정, 계정꺼내기, 글쓰기, 내글지우기, 부스트, 부스트취소, 사람글찾기, 좋아요취소 } from './helpers/api.helper.js';
import {
  알림에서줄찾을때까지,
  알림탭열기,
  이름,
  카드글자,
  프로필열고글찾기,
  친구목록에서글찾기,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 공유시트닫기, 공유시트떴나 } from './helpers/system-ui.helper.js';
import { 글쓰기화면 } from './pages/compose.page.js';
import { 홈화면 } from './pages/home.page.js';

const 답장열기 = defineCase({
  tcId: 'MTA-FN-167',
  name: '글 카드 「답장」을 누르면 답장 글쓰기가 열린다',
  platforms: ['android'],
  precondition: ['두 번째 사용자의 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP016」으로 시작하는 500자까지').default('QA TP016 남의 글'),
  }),
  expected: null,
});

const 답장머리 = defineCase({
  tcId: 'MTA-UI-171',
  name: '답장 글쓰기에 「<이름> 님에게 답장」과 원문 요약이 보인다',
  platforms: ['android'],
  precondition: ['남의 글 답장 글쓰기가 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 부스트시트열기 = defineCase({
  tcId: 'MTA-FN-171',
  name: '글 카드 「부스트」를 누르면 하단 시트에 「부스트」 · 「인용하기」가 보인다',
  platforms: ['android'],
  precondition: ['홈에 아직 부스트하지 않은 남의 공개 글이 있다', '내가 이미 부스트한 글이 있다'],
  params: z.object({
    부스트본문: z.string().min(1).max(500).describe('내가 부스트할 글 — 「QA TP016」으로 시작하는 500자까지').default('QA TP016 부스트한 글'),
  }),
  expected: null,
});

const 길게부스트 = defineCase({
  tcId: 'MTA-FN-177',
  name: '「부스트」를 길게 누르면 「부스트」 · 「부스터 보기」가 보인다',
  platforms: ['android'],
  precondition: ['홈에 남의 공개 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 좋아요켜기 = defineCase({
  tcId: 'MTA-FN-178',
  name: '「좋아요」를 누르면 좋아요가 켜진다',
  platforms: ['android'],
  precondition: ['홈에 좋아요하지 않은 남의 글이 있다', '그 글에 좋아요가 켜져 있다'],
  params: z.object({}),
  expected: null,
});

const 길게좋아요 = defineCase({
  tcId: 'MTA-FN-179',
  name: '「좋아요」를 길게 누르면 「좋아요」 · 「보관」 · 「즐겨찾기 보기」가 보인다',
  platforms: ['android'],
  precondition: ['홈에 남의 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 공유시트 = defineCase({
  tcId: 'MTA-FN-180',
  name: '글 카드 「공유」를 누르면 기기 공유 시트가 뜬다',
  platforms: ['android'],
  precondition: ['홈에 남의 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 인용불가부스트 = defineCase({
  tcId: 'MTA-FN-173',
  name: '인용할 수 없는 글의 「부스트」를 누르면 시트에 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다',
  platforms: ['android'],
  precondition: ['seoyeon_books 의 인용 불가 글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 부스트꺼짐 = defineCase({
  tcId: 'MTA-FN-176',
  name: '남의 개인 멘션 글이면 「부스트」 버튼이 꺼져 있다',
  platforms: ['android'],
  precondition: ['두 번째 사용자가 나를 멘션한 개인 멘션 글이 있다', '두 번째 사용자가 나를 멘션한 팔로워 공개 글이 있다'],
  techniques: ['동등 분할'],
  params: z.object({
    개인멘션본문: z.string().min(1).max(400).describe('개인 멘션 글 — 「QA TP016」으로 시작하는 400자까지').default('QA TP016 개인 멘션'),
    팔로워공개본문: z.string().min(1).max(400).describe('팔로워 공개 멘션 글 — 「QA TP016」으로 시작하는 400자까지').default('QA TP016 팔로워 공개 멘션'),
  }),
  expected: null,
});

const 인용승인부스트 = defineCase({
  tcId: 'MTA-FN-627',
  name: '인용 승인제 글의 「부스트」를 누르면 시트에 「인용 요청」 / 「작성자가 수동으로 검토할 것입니다.」가 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 인용 「승인 필요」 글이 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-016',
  name: '글 카드 — 버튼 동작',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [답장열기, 답장머리, 부스트시트열기, 길게부스트, 좋아요켜기, 길게좋아요, 공유시트, 인용불가부스트, 부스트꺼짐, 인용승인부스트],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  const 시트 = new 부스트시트(driver);
  const 글쓰기창 = new 글쓰기화면(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 남의글자 = '';
  let 남의글이름 = '';
  let 남의글id = '';
  let 부스트한글id: string | undefined;
  let 좋아요한글id: string | undefined;

  const 남의글카드로 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await 친구목록에서글찾기(driver, 남의글자);
  };

  await test.cleanup('이 흐름이 올리고 누른 것을 되돌린다', async () => {
    if (나 !== undefined) {
      if (부스트한글id !== undefined) await 부스트취소(나, 부스트한글id);
      if (좋아요한글id !== undefined) await 좋아요취소(나, 좋아요한글id);
    }
    if (둘째 !== undefined) {
      await 내글지우기(둘째, 'QA TP016');
      await 내글지우기(둘째, '@qa_user1 QA TP016');
    }
  });

  await test.case(답장열기, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    남의글자 = params.본문;
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 내글지우기(둘째!, 'QA TP016');
      await 내글지우기(둘째!, '@qa_user1 QA TP016');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('두 번째 사용자가 API 로 새 글을 올린다', async () => {
      const 올린글 = await 글쓰기(둘째!, params.본문);
      남의글이름 = 이름(올린글.account);
      남의글id = 올린글.id;
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.본문);
    });
    await test.step('글 카드 「답장」을 누른다', async () => {
      await 카드.버튼누르기(params.본문, '답장');
      await verify('글 카드 「답장」을 누르면 답장 글쓰기가 열린다', await 글쓰기창.새게시물떴나(), true);
    });
  });

  await test.case(답장머리, async () => {
    await test.step('남의 글 답장 글쓰기를 다시 연다', async () => {
      await 남의글카드로();
      await 카드.버튼누르기(남의글자, '답장');
      await verify('답장 글쓰기 화면이 보인다', await 글쓰기창.새게시물떴나(), true, { blocker: true });
    });
    await test.step('답장 글쓰기 머리를 확인한다', async () => {
      const 머리 = await verify('답장 글쓰기에 「<이름> 님에게 답장」이 보인다', (await 글쓰기창.답장머리글()).includes(`${남의글이름} 님에게 답장`), true);
      const 원문 = await verify('답장 글쓰기에 원문 요약이 보인다', (await 글쓰기창.답장원문글()).includes(남의글자), true);
      await verify('답장 글쓰기에 「<이름> 님에게 답장」과 원문 요약이 보인다', 머리 && 원문, true);
    });
  });

  await test.case(부스트시트열기, async ({ params }) => {
    await test.step('두 번째 사용자가 API 로 올린 글을 내가 부스트한다', async () => {
      const 올린글 = await 글쓰기(둘째!, params.부스트본문);
      await 부스트(나!, 올린글.id);
      부스트한글id = 올린글.id;
    });
    await test.step('글 카드 「부스트」를 누른다', async () => {
      await 남의글카드로();
      await 카드.버튼누르기(남의글자, '부스트');
      const 떴다 = await verify('하단 시트가 뜬다', await 시트.떴나(), true);
      const 부스트항목 = await verify('하단 시트에 「부스트」가 보인다', await 시트.항목있나('부스트'), true);
      const 인용항목 = await verify('하단 시트에 「인용하기」가 보인다', await 시트.항목있나('인용하기'), true);
      await verify('글 카드 「부스트」를 누르면 하단 시트에 「부스트」 · 「인용하기」가 보인다', 떴다 && 부스트항목 && 인용항목, true);
      await 시트.닫기();
    });
    await test.step('이미 부스트한 글의 「부스트」를 누른다', async () => {
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.부스트본문);
      await 카드.버튼누르기(params.부스트본문, '부스트');
      await verify('이미 부스트한 글의 부스트 시트에는 「부스트 실행 취소」가 보인다', await 시트.항목있나('부스트 실행 취소', 10_000), true);
      await 시트.닫기();
    });
  });

  await test.case(길게부스트, async () => {
    await test.step('홈에서 남의 공개 글 카드를 찾는다', async () => {
      await 남의글카드로();
    });
    await test.step('글 카드 「부스트」를 길게 누른다', async () => {
      await 카드.버튼길게누르기(남의글자, '부스트');
      const 글들 = await 시트.길게메뉴글들();
      const 부스트항목 = await verify('길게 누른 메뉴에 「부스트」가 보인다', 글들.includes('부스트'), true);
      const 부스터항목 = await verify('길게 누른 메뉴에 「부스터 보기」가 보인다', 글들.includes('부스터 보기'), true);
      await verify('「부스트」를 길게 누르면 「부스트」 · 「부스터 보기」가 보인다', 부스트항목 && 부스터항목, true);
      await 시트.길게메뉴.닫기();
    });
  });

  await test.case(좋아요켜기, async () => {
    await test.step('홈에서 좋아요하지 않은 남의 글 카드를 찾는다', async () => {
      await 남의글카드로();
    });
    await test.step('글 카드 「좋아요」를 누른다', async () => {
      await 카드.버튼누르기(남의글자, '좋아요');
      좋아요한글id = 남의글id;
      await verify('「좋아요」를 누르면 좋아요가 켜진다', await 될때까지(driver, () => 카드.버튼골라져있나(남의글자, '좋아요'), 10_000), true);
    });
    await test.step('켜진 「좋아요」를 다시 누른다', async () => {
      await 카드.버튼누르기(남의글자, '좋아요');
      await verify('다시 누른 「좋아요」는 꺼진다', await 될때까지(driver, async () => !(await 카드.버튼골라져있나(남의글자, '좋아요')), 10_000), true);
    });
  });

  await test.case(길게좋아요, async () => {
    await test.step('홈에서 남의 글 카드를 찾는다', async () => {
      await 남의글카드로();
    });
    await test.step('글 카드 「좋아요」를 길게 누른다', async () => {
      await 카드.버튼길게누르기(남의글자, '좋아요');
      const 글들 = await 시트.길게메뉴글들();
      const 좋아요항목 = await verify('길게 누른 메뉴에 「좋아요」가 보인다', 글들.includes('좋아요'), true);
      const 보관항목 = await verify('길게 누른 메뉴에 「보관」이 보인다', 글들.includes('보관'), true);
      const 즐겨찾기항목 = await verify('길게 누른 메뉴에 「즐겨찾기 보기」가 보인다', 글들.includes('즐겨찾기 보기'), true);
      await verify('「좋아요」를 길게 누르면 「좋아요」 · 「보관」 · 「즐겨찾기 보기」가 보인다', 좋아요항목 && 보관항목 && 즐겨찾기항목, true);
      await 시트.길게메뉴.닫기();
    });
  });

  await test.case(공유시트, async () => {
    await test.step('홈에서 남의 글 카드를 찾아 공유를 준비한다', async () => {
      await 남의글카드로();
    });
    await test.step('글 카드 「공유」를 누른다', async () => {
      await 카드.버튼누르기(남의글자, '공유');
      await verify('글 카드 「공유」를 누르면 기기 공유 시트가 뜬다', await 공유시트떴나(driver), true);
      await 공유시트닫기(driver);
    });
  });

  await test.case(인용불가부스트, async () => {
    const 인용불가글 = await 사람글찾기(나!, 'seoyeon_books', (x) => x.reblog === null && x.quote_approval?.current_user === 'denied', '인용 불가');
    await test.step('seoyeon_books 프로필에서 인용 불가 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'seoyeon_books', 카드글자(인용불가글));
    });
    await test.step('인용 불가 글의 「부스트」를 누른다', async () => {
      await 카드.버튼누르기(카드글자(인용불가글), '부스트');
      await 시트.떴나();
      const 글들 = await 시트.시트글들();
      await verify(
        '인용할 수 없는 글의 「부스트」를 누르면 시트에 「오직 팔로워만 이 게시물을 인용할 수 있습니다.」 또는 「You are not allowed to quote this post」가 보인다',
        글들.some((글) => 글.includes('오직 팔로워만 이 게시물을 인용할 수 있습니다.') || 글.includes('You are not allowed to quote this post')),
        true,
      );
      await 시트.닫기();
    });
  });

  await test.case(부스트꺼짐, async ({ params }) => {
    await test.step('두 번째 사용자가 API 로 나를 멘션하는 글 둘을 올린다', async () => {
      await 글쓰기(둘째!, `@qa_user1 ${params.개인멘션본문}`, { visibility: 'direct' });
      await 글쓰기(둘째!, `@qa_user1 ${params.팔로워공개본문}`, { visibility: 'private' });
      const 알림 = await 알림탭열기(driver);
      await verify('알림에 팔로워 공개 멘션 글이 보인다', await 알림에서줄찾을때까지(driver, params.팔로워공개본문), true, { blocker: true });
      await verify('알림에 개인 멘션 글이 보인다', await 알림.줄있나(params.개인멘션본문, 10_000), true, { blocker: true });
    });
    await test.step('개인 멘션 글의 「부스트」를 확인한다', async () => {
      await verify('남의 개인 멘션 글이면 「부스트」 버튼이 꺼져 있다', await 카드.버튼켜져있나(params.개인멘션본문, '부스트'), false);
    });
    await test.step('팔로워 공개 글의 「부스트」를 확인한다', async () => {
      await verify('남의 팔로워 공개 글의 「부스트」 버튼도 꺼져 있다', await 카드.버튼켜져있나(params.팔로워공개본문, '부스트'), false);
    });
  });

  await test.case(인용승인부스트, async () => {
    const 승인글 = await 사람글찾기(나!, 'minjun_dev', (x) => x.reblog === null && x.quote_approval?.current_user === 'manual', '인용 승인 필요');
    await test.step('minjun_dev 프로필에서 인용 승인제 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(승인글));
    });
    await test.step('인용 승인제 글의 「부스트」를 누른다', async () => {
      await 카드.버튼누르기(카드글자(승인글), '부스트');
      await 시트.떴나();
      const 글들 = await 시트.시트글들();
      const 요청 = await verify('시트에 「인용 요청」이 보인다', 글들.includes('인용 요청'), true);
      const 안내 = await verify('시트에 「작성자가 수동으로 검토할 것입니다.」가 보인다', 글들.some((글) => 글.includes('작성자가 수동으로 검토할 것입니다.')), true);
      await verify(
        '인용 승인제 글의 「부스트」를 누르면 시트에 「인용 요청」 / 「작성자가 수동으로 검토할 것입니다.」가 보인다',
        요청 && 안내,
        true,
      );
      await 시트.닫기();
    });
  });
});
