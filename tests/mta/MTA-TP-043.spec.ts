import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 펼친메뉴 } from './components/popup-menu.component.js';
import { 하단탭 } from './components/tabbar.component.js';
import { type 계정, 계정꺼내기, 관계보기, 글쓰기, 내글지우기, 메모쓰기 } from './helpers/api.helper.js';
import { 관계맞추기, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { QR화면 } from './pages/qr.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 남의메뉴 = defineCase({
  tcId: 'MTA-UI-331',
  name: '남의 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「Add a personal note」 · 「Mute account」 · 「Block account」 · 「Report account」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 cafe_moon 프로필을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원과 관계가 없고 메모도 없는 계정의 사용자명').default('cafe_moon'),
  }),
  expected: null,
});

const 내메뉴에없는것 = defineCase({
  tcId: 'MTA-FN-395',
  name: '내 프로필 상단 메뉴를 열면 「Mute account」 · 「Block account」 · 「Report account」가 보이지 않는다',
  platforms: ['android'],
  precondition: ['내 프로필을 열었다'],
  techniques: ['동등 분할'],
  params: z.object({}),
  expected: null,
});

const 팔로우중메뉴 = defineCase({
  tcId: 'MTA-UI-332',
  name: '내가 팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 더 보인다',
  platforms: ['android'],
  precondition: ['내가 news_bot 을 팔로우 중이다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 팔로우하는 계정의 사용자명').default('news_bot') }),
  expected: null,
});

const 팔로워메뉴 = defineCase({
  tcId: 'MTA-UI-333',
  name: '상대가 나를 팔로우 중이면 프로필 메뉴에 「Remove follower」가 보인다',
  platforms: ['android'],
  precondition: ['fan_ryu 가 나를 팔로우한다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원을 팔로우하는 계정의 사용자명').default('fan_ryu') }),
  expected: null,
});

const 메모메뉴 = defineCase({
  tcId: 'MTA-UI-335',
  name: '개인 메모를 써 둔 사람 프로필 메뉴에 「Edit personal note」가 보인다',
  platforms: ['android'],
  precondition: ['cafe_moon 에 개인 메모를 써 두었다'],
  params: z.object({
    사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원과 관계가 없는 계정의 사용자명').default('cafe_moon'),
    메모: z.string().min(1).max(200).describe('API 로 써 둘 개인 메모 — 「QA TP043」으로 시작').default('QA TP043 메모'),
  }),
  expected: null,
});

const 내메뉴 = defineCase({
  tcId: 'MTA-UI-336',
  name: '내 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다',
  platforms: ['android'],
  precondition: ['내 프로필을 열었다'],
  params: z.object({}),
  expected: null,
});

const QR저장 = defineCase({
  tcId: 'MTA-FN-401',
  name: 'QR 화면에서 「저장」을 누르면 버튼이 「저장됨」으로 바뀐다',
  platforms: ['android'],
  precondition: ['내 프로필 메뉴가 열려 있다'],
  params: z.object({}),
  expected: z.object({ 저장됨: z.string().describe('저장 뒤 버튼 글').default('저장됨') }),
});

const 게시물수새로고침 = defineCase({
  tcId: 'MTA-FN-696',
  name: '글을 올리면 내 프로필 「게시물」 수는 바로 안 바뀌고 당겨서 새로고침해야 바뀐다',
  platforms: ['android'],
  precondition: ['내 프로필을 열어 두었다'],
  params: z.object({ 본문: z.string().min(1).max(500).describe('API 로 올릴 글 — 「QA TP043」으로 시작').default('QA TP043 게시물 수') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-043',
  name: '프로필 메뉴',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [남의메뉴, 내메뉴에없는것, 팔로우중메뉴, 팔로워메뉴, 메모메뉴, 내메뉴, QR저장, 게시물수새로고침],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  let 나: 계정 | undefined;
  let 메모대상 = '';

  const 항목있나 = (글자: string): Promise<boolean> => 메뉴.항목있나(글자, 5_000);
  const 내프로필메뉴열기 = async (): Promise<void> => {
    await 홈에들어가기(driver);
    await new 하단탭(driver).누르기('프로필');
    await 프로필.떴나();
    await 프로필.메뉴열기();
    await 메뉴.떴나();
  };

  await test.cleanup('이 흐름이 남긴 메모와 글을 지운다', async () => {
    if (나 === undefined) return;
    if (메모대상 !== '') await 메모쓰기(나, 메모대상, '');
    await 내글지우기(나, 'QA TP043');
  });

  await test.case(남의메뉴, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: false, 뮤트: false, 차단: false });
      await 메모쓰기(나!, params.사용자명, '');
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('cafe_moon 프로필 상단 메뉴를 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기();
      const 공유 = await verify('프로필 메뉴에 「공유」가 보인다', await 항목있나('공유'), true);
      const 링크 = await verify('프로필 메뉴에 「링크 복사」가 보인다', await 항목있나('링크 복사'), true);
      const QR = await verify('프로필 메뉴에 「View QR code」가 보인다', await 항목있나('View QR code'), true);
      const 브라우저 = await verify('프로필 메뉴에 「브라우저에서 열기」가 보인다', await 항목있나('브라우저에서 열기'), true);
      const 메모 = await verify('프로필 메뉴에 「Add a personal note」가 보인다', await 항목있나('Add a personal note'), true);
      const 뮤트 = await verify('프로필 메뉴에 「Mute account」가 보인다', await 항목있나('Mute account'), true);
      const 차단 = await verify('프로필 메뉴에 「Block account」가 보인다', await 항목있나('Block account'), true);
      const 신고 = await verify('프로필 메뉴에 「Report account」가 보인다', await 항목있나('Report account'), true);
      await verify(
        '남의 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「Add a personal note」 · 「Mute account」 · 「Block account」 · 「Report account」가 보인다',
        공유 && 링크 && QR && 브라우저 && 메모 && 뮤트 && 차단 && 신고,
        true,
      );
      await 메뉴.닫기();
    });
  });

  await test.case(내메뉴에없는것, async () => {
    await test.step('내 프로필 상단 메뉴에서 남의 계정 항목 자리를 확인한다', async () => {
      await 내프로필메뉴열기();
      const 열림 = await verify('내 프로필 상단 메뉴가 열린다', await 메뉴.항목있나('공유', 10_000), true);
      const 뮤트 = await verify('「Mute account」가 보이지 않는다', !(await 메뉴.항목있나('Mute account', 1_000)), true);
      const 차단 = await verify('「Block account」가 보이지 않는다', !(await 메뉴.항목있나('Block account', 1_000)), true);
      const 신고 = await verify('「Report account」가 보이지 않는다', !(await 메뉴.항목있나('Report account', 1_000)), true);
      await verify('내 프로필 상단 메뉴를 열면 「Mute account」 · 「Block account」 · 「Report account」가 보이지 않는다', 열림 && 뮤트 && 차단 && 신고, true);
      await 메뉴.닫기();
    });
  });

  await test.case(팔로우중메뉴, async ({ params }) => {
    await test.step('news_bot 을 팔로우 중인 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 팔로우: true });
    });
    await test.step('news_bot 프로필 메뉴를 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기();
      const 목록 = await verify('프로필 메뉴에 「목록에서 추가 또는 제거」가 보인다', await 항목있나('목록에서 추가 또는 제거'), true);
      const 추천 = await verify('프로필 메뉴에 「Feature on my profile」가 보인다', await 항목있나('Feature on my profile'), true);
      const 부스트 = await verify('프로필 메뉴에 「부스트 숨기기」가 보인다', await 항목있나('부스트 숨기기'), true);
      await verify('내가 팔로우 중인 사람 프로필 메뉴에 「목록에서 추가 또는 제거」 · 「Feature on my profile」 · 「부스트 숨기기」가 더 보인다', 목록 && 추천 && 부스트, true);
      await 메뉴.닫기();
    });
  });

  await test.case(팔로워메뉴, async ({ params }) => {
    await test.step('fan_ryu 가 나를 팔로우하는지 API 로 확인한다', async () => {
      await verify('상대가 나를 팔로우한다', (await 관계보기(나!, params.사용자명)).followed_by, true, { blocker: true });
    });
    await test.step('fan_ryu 프로필 메뉴를 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기();
      await verify('상대가 나를 팔로우 중이면 프로필 메뉴에 「Remove follower」가 보인다', await 메뉴.항목있나('Remove follower', 5_000), true);
      await 메뉴.닫기();
    });
  });

  await test.case(메모메뉴, async ({ params }) => {
    await test.step('cafe_moon 에 개인 메모를 써 둔다', async () => {
      메모대상 = params.사용자명;
      await 메모쓰기(나!, params.사용자명, params.메모);
    });
    await test.step('메모를 쓴 cafe_moon 프로필 메뉴를 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await 프로필.메뉴열기();
      await verify('개인 메모를 써 둔 사람 프로필 메뉴에 「Edit personal note」가 보인다', await 메뉴.항목있나('Edit personal note', 5_000), true);
      await 메뉴.닫기();
    });
  });

  await test.case(내메뉴, async () => {
    await test.step('내 프로필 상단 메뉴를 연다', async () => {
      await 내프로필메뉴열기();
      const 공유 = await verify('프로필 메뉴에 「공유」가 보인다', await 항목있나('공유'), true);
      const 링크 = await verify('프로필 메뉴에 「링크 복사」가 보인다', await 항목있나('링크 복사'), true);
      const QR = await verify('프로필 메뉴에 「View QR code」가 보인다', await 항목있나('View QR code'), true);
      const 브라우저 = await verify('프로필 메뉴에 「브라우저에서 열기」가 보인다', await 항목있나('브라우저에서 열기'), true);
      const 즐겨찾기 = await verify('프로필 메뉴에 「즐겨찾기」가 보인다', await 항목있나('즐겨찾기'), true);
      const 보관함 = await verify('프로필 메뉴에 「보관함」가 보인다', await 항목있나('보관함'), true);
      const 해시태그 = await verify('프로필 메뉴에 「팔로우 중인 해시태그」가 보인다', await 항목있나('팔로우 중인 해시태그'), true);
      const 설정 = await verify('프로필 메뉴에 「계정 설정」가 보인다', await 항목있나('계정 설정'), true);
      await verify(
        '내 프로필 상단 메뉴에 「공유」 · 링크 복사 · 「View QR code」 · 「브라우저에서 열기」 · 「즐겨찾기」 · 「보관함」 · 「팔로우 중인 해시태그」 · 「계정 설정」이 보인다',
        공유 && 링크 && QR && 브라우저 && 즐겨찾기 && 보관함 && 해시태그 && 설정,
        true,
      );
      await 메뉴.닫기();
    });
  });

  await test.case(QR저장, async ({ expected }) => {
    await test.step('「View QR code」를 누르고 「저장」을 누른다', async () => {
      await 내프로필메뉴열기();
      await 메뉴.항목누르기('View QR code');
      const QR = new QR화면(driver);
      await verify('QR 화면이 보인다', await QR.떴나(15_000), true, { blocker: true });
      await QR.저장누르기();
      await verify('QR 화면에서 「저장」을 누르면 버튼이 「저장됨」으로 바뀐다', await QR.저장글될때까지(expected.저장됨, 15_000), true);
    });
  });

  await test.case(게시물수새로고침, async ({ params }) => {
    await test.step('내 프로필을 열어 둔다', async () => {
      await 내글지우기(나!, 'QA TP043');
      await 홈에들어가기(driver);
      await new 하단탭(driver).누르기('프로필');
      await verify('내 프로필이 보인다', await 프로필.떴나(), true, { blocker: true });
    });
    await test.step('내가 글을 올린 뒤 「게시물」 수를 확인한다', async () => {
      const 처음 = await 프로필.수글('게시물');
      await 글쓰기(나!, params.본문);
      const 안바뀜 = await verify('글을 올린 직후 「게시물」 수가 그대로다', await 프로필.수글('게시물'), 처음);
      await 프로필.당겨서새로고침();
      const 바뀜 = await verify('당겨서 새로고침한 뒤 「게시물」 수가 바뀐다', await 프로필.수글될때까지('게시물', String(Number(처음) + 1), 20_000), true);
      await verify('글을 올리면 내 프로필 「게시물」 수는 바로 안 바뀌고 당겨서 새로고침해야 바뀐다', 안바뀜 && 바뀜, true);
    });
  });
});
