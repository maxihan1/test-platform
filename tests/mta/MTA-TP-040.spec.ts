import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { z } from 'zod';

import { type 계정, 계정꺼내기, 계정찾기, 관계보기 } from './helpers/api.helper.js';
import { 관계맞추기, 프로필라벨있나, 프로필열어보기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 프로필화면 } from './pages/profile.page.js';

const 헤더 = defineCase({
  tcId: 'MTA-UI-303',
  name: '프로필 헤더에 헤더 이미지 · 아바타 · 표시 이름 · 「@hana_photo」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있고 hana_photo 프로필을 열었다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
    사용자명: z.string().min(1).describe('열어 볼 계정 — 헤더 이미지가 있는 시드 계정의 사용자명').default('hana_photo'),
  }),
  expected: null,
});

const 본문 = defineCase({
  tcId: 'MTA-UI-310',
  name: '프로필 본문에 자기소개 · 프로필 항목 · 「Followers」 · 「Following」 · 「게시물」 · 「가입」이 보인다',
  platforms: ['android'],
  precondition: ['hana_photo 프로필이 열려 있다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 자기소개와 프로필 항목이 있는 시드 계정의 사용자명').default('hana_photo') }),
  expected: null,
});

const 나를팔로우배지 = defineCase({
  tcId: 'MTA-UI-304',
  name: '나를 팔로우하는 사람 프로필에 「Follows you」 배지가 보인다',
  platforms: ['android'],
  precondition: ['fan_ryu 가 나를 팔로우한다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원을 팔로우하는 계정의 사용자명').default('fan_ryu') }),
  expected: null,
});

const 차단됨배지 = defineCase({
  tcId: 'MTA-UI-305',
  name: '내가 차단한 사람 프로필에 「차단됨」 배지가 보인다',
  platforms: ['android'],
  precondition: ['troll_kim 을 차단했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 차단한 계정의 사용자명').default('troll_kim') }),
  expected: null,
});

const 뮤트배지 = defineCase({
  tcId: 'MTA-UI-306',
  name: '내가 뮤트한 사람 프로필에 「Muted」 배지가 보인다',
  platforms: ['android'],
  precondition: ['noisy_cho 를 뮤트했다'],
  params: z.object({ 사용자명: z.string().min(1).describe('열어 볼 계정 — 일반 회원이 뮤트한 계정의 사용자명').default('noisy_cho') }),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-040',
  name: '남의 프로필 — 머리와 관계 배지',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [헤더, 본문, 나를팔로우배지, 차단됨배지, 뮤트배지],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 프로필 = new 프로필화면(driver);
  let 나: 계정 | undefined;

  await test.case(헤더, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword);
    await test.step('일반 회원으로 홈에 들어간다', async () => {
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('hana_photo 프로필 머리를 확인한다', async () => {
      const 서버이름 = (await 계정찾기(나!, params.사용자명)).display_name;
      await 프로필열어보기(driver, params.사용자명);
      const 헤더그림 = await verify('프로필 헤더 이미지가 보인다', await 프로필.헤더이미지있나(), true);
      const 아바타 = await verify('프로필 아바타가 보인다', await 프로필.아바타있나(), true);
      const 이름 = await verify('프로필 표시 이름이 서버의 표시 이름과 같다', await 프로필.이름글(), 서버이름 === '' ? params.사용자명 : 서버이름);
      const 계정 = await verify('프로필에 「@hana_photo」가 보인다', (await 프로필.계정글()).includes(`@${params.사용자명}`), true);
      await verify('프로필 헤더에 헤더 이미지 · 아바타 · 표시 이름 · 「@hana_photo」가 보인다', 헤더그림 && 아바타 && 이름 && 계정, true);
    });
  });

  await test.case(본문, async ({ params }) => {
    await test.step('프로필 본문을 확인한다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      const 소개 = await verify('프로필 자기소개가 보인다', await 프로필.소개있나(), true);
      const 항목 = await verify('프로필 항목이 보인다', await 프로필.항목있나(), true);
      const 팔로워 = await verify('프로필에 「Followers」가 보인다', await 프로필라벨있나(driver, 'Followers'), true);
      const 팔로잉 = await verify('프로필에 「Following」이 보인다', await 프로필라벨있나(driver, 'Following'), true);
      const 게시물 = await verify('프로필에 「게시물」이 보인다', await 프로필라벨있나(driver, '게시물'), true);
      const 가입 = await verify('프로필에 「가입」이 보인다', await 프로필라벨있나(driver, '가입'), true);
      await verify('프로필 본문에 자기소개 · 프로필 항목 · 「Followers」 · 「Following」 · 「게시물」 · 「가입」이 보인다', 소개 && 항목 && 팔로워 && 팔로잉 && 게시물 && 가입, true);
    });
  });

  await test.case(나를팔로우배지, async ({ params }) => {
    await test.step('fan_ryu 가 나를 팔로우하는지 API 로 확인한다', async () => {
      await verify('상대가 나를 팔로우한다', (await 관계보기(나!, params.사용자명)).followed_by, true, { blocker: true });
    });
    await test.step('fan_ryu 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('나를 팔로우하는 사람 프로필에 「Follows you」 배지가 보인다', await 프로필.나를팔로우배지있나(), true);
    });
  });

  await test.case(차단됨배지, async ({ params }) => {
    await test.step('troll_kim 을 차단한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 차단: true });
    });
    await test.step('troll_kim 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('내가 차단한 사람 프로필에 「차단됨」 배지가 보인다', await 프로필.배지있나('차단됨'), true);
    });
  });

  await test.case(뮤트배지, async ({ params }) => {
    await test.step('noisy_cho 를 뮤트한 상태로 맞춘다', async () => {
      await 관계맞추기(나!, params.사용자명, { 뮤트: true });
    });
    await test.step('noisy_cho 프로필을 연다', async () => {
      await 프로필열어보기(driver, params.사용자명);
      await verify('내가 뮤트한 사람 프로필에 「Muted」 배지가 보인다', await 프로필.배지있나('Muted'), true);
    });
  });
});
