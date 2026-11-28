import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 글카드 } from './components/status-card.component.js';
import {
  type 계정,
  계정꺼내기,
  글쓰기,
  내글지우기,
  목록홈숨김,
  부스트,
  부스트취소,
  좋아요,
  좋아요취소,
  필터만들기,
  필터지우기,
  사람글찾기,
} from './helpers/api.helper.js';
import {
  카드글자,
  프로필열고글찾기,
  홈새로고침해서글자보일때까지,
  화면글자포함누르기,
  친구목록에서글찾기,
} from './helpers/flow-status.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';

const 경고필터 = defineCase({
  tcId: 'MTA-FN-157',
  name: '「경고」 동작 필터에 걸린 글 카드를 열면 「“qa경고필터” 필터와 일치함」이 보인다',
  platforms: ['android'],
  precondition: ['내가 「경고」 동작 필터 「qa경고필터」를 만들었고 그 낱말이 든 글이 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
  }),
  expected: null,
});

const 링크카드 = defineCase({
  tcId: 'MTA-UI-137',
  name: '링크 카드에 제목 · 설명 · 이미지 · 「<작성자>에 의해」가 보인다',
  platforms: ['android'],
  held: '보류 — 「[새 글] 5.0 미리 보기 #마스토돈 https」 글 카드의 reply_btn 를 못 찾았다',
  precondition: ['news_bot 의 링크 카드 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 인용글카드 = defineCase({
  tcId: 'MTA-UI-138',
  name: '인용된 글이 글 카드 안에 작은 카드로 보인다',
  platforms: ['android'],
  precondition: ['jiho_cafe 가 내 글을 인용한 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 카드푸터 = defineCase({
  tcId: 'MTA-UI-140',
  name: '글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」와 숫자가 보인다',
  platforms: ['android'],
  precondition: ['두 번째 사용자의 글이 있다'],
  params: z.object({
    secondId: z.string().describe('두 번째 사용자 아이디').optional().meta({ secret: true, account: '두 번째 사용자' }),
    secondPassword: z.string().describe('두 번째 사용자 비밀번호').optional().meta({ secret: true, account: '두 번째 사용자' }),
    본문: z.string().min(1).max(500).describe('두 번째 사용자가 API 로 올릴 글 — 「QA TP014」로 시작하는 500자까지').default('QA TP014 푸터 글'),
  }),
  expected: z.object({ 푸터글: z.string().describe('푸터 버튼 글자들').default('답장 · 부스트 · 좋아요 · 공유') }),
});

const 방금글시간 = defineCase({
  tcId: 'MTA-UI-516',
  name: '방금 쓴 글 카드 시간이 「방금」 또는 「n초 전」으로 보인다',
  platforms: ['android'],
  precondition: ['방금 쓴 내 글이 홈에 있다'],
  params: z.object({
    본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP014」로 시작하는 500자까지').default('QA TP014 방금 글'),
  }),
  expected: null,
});

const 수정표시 = defineCase({
  tcId: 'MTA-UI-517',
  name: '수정된 글 카드에 「(<시간>전)에 수정함」이 보인다',
  platforms: ['android'],
  precondition: ['minjun_dev 의 수정된 글이 있다'],
  params: z.object({}),
  expected: null,
});

const 승인대기인용 = defineCase({
  tcId: 'MTA-FN-626',
  name: '승인 대기 인용은 「게시 대기중」으로 보이고 누르면 설명 창과 「알겠습니다」가 뜬다',
  platforms: ['android'],
  precondition: ['hana_photo 의 승인 대기 인용 글이 있다'],
  params: z.object({}),
  expected: z.object({ 확인글: z.string().describe('설명 창의 확인 버튼 글자').default('알겠습니다') }),
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-014',
  name: '글 카드 — 필터 · 시간 · 수정 표시',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [경고필터, 인용글카드, 카드푸터, 방금글시간, 수정표시, 승인대기인용, 링크카드],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 카드 = new 글카드(driver);
  let 나: 계정 | undefined;
  let 둘째: 계정 | undefined;
  let 부스트한글id: string | undefined;
  let 좋아요한글id: string | undefined;

  let 숨김끔 = false;

  await test.cleanup('이 흐름이 만든 필터 · 글 · 부스트 · 좋아요와 「친구」 목록 홈 숨김을 되돌린다', async () => {
    if (나 !== undefined) {
      if (숨김끔) await 목록홈숨김(나, '친구', true);
      if (부스트한글id !== undefined) await 부스트취소(나, 부스트한글id);
      if (좋아요한글id !== undefined) await 좋아요취소(나, 좋아요한글id);
      await 필터지우기(나, 'qa경고필터');
      await 내글지우기(나, 'QA TP014');
    }
    if (둘째 !== undefined) await 내글지우기(둘째, 'QA TP014');
  });

  await test.case(경고필터, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 필터지우기(나!, 'qa경고필터');
      await 내글지우기(나!, 'QA TP014');
      await 내글지우기(둘째!, 'QA TP014');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('API 로 경고 필터를 만들고 그 낱말이 든 글을 올린다', async () => {
      await 필터만들기(나!, 'qa경고필터', ['qa경고필터'], ['home'], 'warn');
      숨김끔 = true;
      await 목록홈숨김(나!, '친구', false);
      await 글쓰기(둘째!, 'QA TP014 qa경고필터 시험 글');
      await 목록홈숨김(나!, '친구', true);
      숨김끔 = false;
      await 홈에들어가기(driver);
    });
    await test.step('필터에 걸리는 글 카드를 연다', async () => {
      await verify(
        '「경고」 동작 필터에 걸린 글 카드를 열면 「“qa경고필터” 필터와 일치함」이 보인다',
        await 홈새로고침해서글자보일때까지(driver, '“qa경고필터” 필터와 일치함'),
        true,
      );
    });
  });

  await test.case(인용글카드, async () => {
    const 인용글 = await 사람글찾기(나!, 'jiho_cafe', (x) => x.reblog === null && x.quote?.quoted_status?.account.username === 'qa_user1', '내 글을 인용한');
    const 인용된글자 = 카드글자(인용글.quote!.quoted_status!);
    await test.step('jiho_cafe 프로필에서 내 글을 인용한 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'jiho_cafe', 카드글자(인용글));
    });
    await test.step('인용 글 카드를 확인한다', async () => {
      const 글들 = await 카드.카드안글들(카드글자(인용글), 'text');
      await verify('인용된 글이 글 카드 안에 작은 카드로 보인다', 글들.some((글) => 글.includes(인용된글자)), true);
    });
  });

  await test.case(카드푸터, async ({ params, expected }) => {
    둘째 = 계정꺼내기(params.secondId, params.secondPassword, '두 번째 사용자');
    await test.step('두 번째 사용자가 API 로 올린 글에 답글 · 좋아요 · 부스트를 단다', async () => {
      const 남의글 = await 글쓰기(둘째!, params.본문);
      await 글쓰기(둘째!, 'QA TP014 푸터 답글', { in_reply_to_id: 남의글.id });
      await 좋아요(나!, 남의글.id);
      좋아요한글id = 남의글.id;
      await 부스트(나!, 남의글.id);
      부스트한글id = 남의글.id;
      await 홈에들어가기(driver);
      await 친구목록에서글찾기(driver, params.본문);
    });
    await test.step('글 카드 푸터를 확인한다', async () => {
      const 버튼글 = await verify('글 카드 푸터에 버튼 넷이 보인다', (await 카드.푸터버튼글들(params.본문)).join(' · '), expected.푸터글);
      const 답장수 = await verify('글 카드 푸터에 「답장」 숫자가 보인다', (await 카드.푸터숫자(params.본문, '답장')) !== '', true);
      const 부스트수 = await verify('글 카드 푸터에 「부스트」 숫자가 보인다', (await 카드.푸터숫자(params.본문, '부스트')) !== '', true);
      const 좋아요수 = await verify('글 카드 푸터에 「좋아요」 숫자가 보인다', (await 카드.푸터숫자(params.본문, '좋아요')) !== '', true);
      await verify('글 카드 푸터에 「답장」 · 「부스트」 · 「좋아요」 · 「공유」와 숫자가 보인다', 버튼글 && 답장수 && 부스트수 && 좋아요수, true);
    });
  });

  await test.case(방금글시간, async ({ params }) => {
    await test.step('API 로 새 글을 올린다', async () => {
      await 글쓰기(나!, params.본문);
      await 홈에들어가기(driver);
      await verify('홈 맨 위에 방금 쓴 글이 보인다', await 홈.새로고침해맨위에올때까지(params.본문), true, { blocker: true });
    });
    await test.step('방금 쓴 글 카드 시간을 확인한다', async () => {
      const 시간 = await 카드.머리글(params.본문, 'time_and_username');
      await verify('방금 쓴 글 카드 시간이 「방금」 또는 「n초 전」으로 보인다', /^(방금|\d+\s*초 전)/.test(시간), true);
    });
  });

  await test.case(수정표시, async () => {
    const 수정글 = await 사람글찾기(나!, 'minjun_dev', (x) => x.reblog === null && Boolean(x.edited_at), '수정된');
    await test.step('minjun_dev 프로필에서 수정된 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'minjun_dev', 카드글자(수정글));
    });
    await test.step('수정된 글 카드를 확인한다', async () => {
      const 시간 = await 카드.머리글(카드글자(수정글), 'time_and_username');
      await verify('수정된 글 카드에 「(<시간>전)에 수정함」이 보인다', /\(.*전\)에 수정함/.test(시간), true);
    });
  });

  await test.case(승인대기인용, async ({ expected }) => {
    const 대기글 = await 사람글찾기(나!, 'hana_photo', (x) => x.reblog === null && x.quote?.state === 'pending', '승인 대기 인용');
    await test.step('hana_photo 프로필에서 승인 대기 인용 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'hana_photo', 카드글자(대기글));
    });
    await test.step('「게시 대기중」 인용 카드를 누른다', async () => {
      await 화면글자포함누르기(driver, '게시 대기중');
      const 창 = new 확인창(driver);
      const 떴다 = await verify('설명 창이 뜬다', await 창.떴나(), true);
      const 버튼 = await verify('「알겠습니다」가 보인다', await 창.확인버튼글(), expected.확인글);
      await verify('승인 대기 인용은 「게시 대기중」으로 보이고 누르면 설명 창과 「알겠습니다」가 뜬다', 떴다 && 버튼, true);
      await 창.확인누르기();
    });
  });

  await test.case(링크카드, async () => {
    const 링크글 = await 사람글찾기(나!, 'news_bot', (x) => x.reblog === null && x.card !== null, '링크 카드');
    await test.step('news_bot 프로필에서 링크 카드 글 카드를 연다', async () => {
      await 홈에들어가기(driver);
      await 프로필열고글찾기(driver, 'news_bot', 카드글자(링크글));
    });
    await test.step('링크 카드를 확인한다', async () => {
      const 제목들 = await 카드.링크카드글들(카드글자(링크글), 'title');
      const 설명들 = await 카드.링크카드글들(카드글자(링크글), 'description');
      const 도메인들 = await 카드.링크카드글들(카드글자(링크글), 'domain');
      const 제목 = await verify('링크 카드에 제목이 보인다', 제목들.some((글) => 글 !== ''), true);
      const 설명 = await verify('링크 카드에 설명이 보인다', 설명들.some((글) => 글 !== ''), true);
      const 이미지 = await verify('링크 카드에 이미지가 보인다', await 카드.링크카드그림있나(카드글자(링크글)), true);
      const 에의해 = [...제목들, ...설명들, ...도메인들].some((글) => 글.includes('에 의해'));
      const 작성자 = await verify('링크 카드에 「<작성자>에 의해」가 보인다', 에의해, true);
      await verify('링크 카드에 제목 · 설명 · 이미지 · 「<작성자>에 의해」가 보인다', 제목 && 설명 && 이미지 && 작성자, true);
    });
  });
});
