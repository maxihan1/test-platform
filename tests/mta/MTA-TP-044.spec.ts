import { defineCase, defineProcedure, test, verify } from '@platform/kit';
import { 될때까지, 사라질때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 확인창 } from './components/dialog.component.js';
import { 펼친메뉴 } from './components/popup-menu.component.js';
import { type 계정, 계정꺼내기 } from './helpers/api.helper.js';
import { type 프로필원본, 소개비우기, 창에글있나, 프로필되돌리기, 프로필원본읽기, 프로필편집으로, 프로필항목맞추기 } from './helpers/flow-profile.helper.js';
import { 로그인된채켜기 } from './helpers/login-inject.helper.js';
import { 홈에들어가기 } from './helpers/login.helper.js';
import { 길이글 } from './helpers/test-data.helper.js';
import { 자기소개편집화면 } from './pages/bio-edit.page.js';
import { 항목목록화면, 항목편집화면 } from './pages/field-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 이름편집화면 } from './pages/name-edit.page.js';

const 헤더이미지팝업 = defineCase({
  tcId: 'MTA-FN-402',
  name: '프로필 편집에서 헤더 이미지를 누르면 팝업 「Replace」 · 「제거」가 뜬다',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 프로필 편집을 열었다', '헤더 이미지 팝업이 떠 있다'],
  params: z.object({
    loginId: z.string().describe('프로필 고쳐도 되는 계정 아이디').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
    loginPassword: z.string().describe('프로필 고쳐도 되는 계정 비밀번호').optional().meta({ secret: true, account: '프로필 고쳐도 되는 계정' }),
  }),
  expected: null,
});

const 이름글자수 = defineCase({
  tcId: 'MTA-FN-404',
  name: '「Display name」 칸에 30자를 적으면 30자가 다 들어간다',
  platforms: ['android'],
  precondition: ['「Display name」 편집 화면이 열려 있다'],
  techniques: ['경계값 분석'],
  params: z.object({
    안글자수: z.number().int().min(1).max(30).describe('이름 칸에 적을 글자 수 — 한도 이하').default(30),
    밖글자수: z.number().int().min(31).max(60).describe('이름 칸에 적을 글자 수 — 한도 초과').default(31),
  }),
  expected: z.object({ 최대: z.number().describe('이름 칸에 들어가는 최대 글자 수').default(30) }),
});

const 이름비움 = defineCase({
  tcId: 'MTA-FN-654',
  name: '「Display name」이 비어 있으면 「저장」이 꺼진다',
  platforms: ['android'],
  precondition: ['「Display name」 편집 화면이 열려 있다'],
  params: z.object({}),
  expected: null,
});

const 소개501자 = defineCase({
  tcId: 'MTA-FN-406',
  name: '자기소개 칸에 501자를 적으면 501자가 다 들어간다',
  platforms: ['android'],
  precondition: ['자기소개 편집 화면이 열려 있다'],
  params: z.object({ 글자수: z.number().int().min(1).max(600).describe('자기소개 칸에 적을 글자 수').default(501) }),
  expected: null,
});

const 소개저장켜짐 = defineCase({
  tcId: 'MTA-FN-420',
  name: '자기소개 입력이 한 번 바뀌면 「저장」이 켜진다',
  platforms: ['android'],
  precondition: ['자기소개 편집 화면이 열려 있다'],
  params: z.object({ 글: z.string().min(1).max(10).describe('자기소개 칸에 더 적을 글').default('가') }),
  expected: null,
});

const 항목네개 = defineCase({
  tcId: 'MTA-FN-409',
  name: '「Custom fields」 항목이 4개가 되면 「Add field」가 숨겨진다',
  platforms: ['android'],
  precondition: ['「Custom fields」 항목이 3개다'],
  techniques: ['경계값 분석'],
  params: z.object({ 라벨: z.string().min(3).max(50).describe('더할 항목의 라벨 — 「QA」로 시작').default('QA항목넷') }),
  expected: null,
});

const 라벨만저장 = defineCase({
  tcId: 'MTA-FN-410',
  name: '「Add field」에서 「라벨」만 적으면 저장할 수 있다',
  platforms: ['android'],
  precondition: ['「Add field」 화면이 열려 있다'],
  params: z.object({ 라벨: z.string().min(1).max(50).describe('적을 라벨 — 항목 라벨로 쓸 글').default('라벨') }),
  expected: null,
});

const 항목삭제묻기 = defineCase({
  tcId: 'MTA-FN-411',
  name: '프로필 항목을 지우려 하면 「Delete field?」를 묻는다',
  platforms: ['android'],
  precondition: ['「QA항목」 프로필 항목이 있다'],
  params: z.object({}),
  expected: null,
});

export const procedure = defineProcedure({
  procId: 'MTA-TP-044',
  name: '프로필 편집 — 이름 · 자기소개 · 항목',
  platforms: ['android'],
  precondition: ['프로필 고쳐도 되는 계정으로 로그인해 있다'],
  launchIntent: 로그인된채켜기('loginId', 'loginPassword'),
  keepAppData: true,
  cases: [헤더이미지팝업, 이름글자수, 이름비움, 소개저장켜짐, 항목네개, 라벨만저장, 항목삭제묻기, 소개501자],
});

test(procedure, async ({ driver }) => {
  const 홈 = new 홈화면(driver);
  const 이름 = new 이름편집화면(driver);
  const 소개 = new 자기소개편집화면(driver);
  const 항목들 = new 항목목록화면(driver);
  const 항목 = new 항목편집화면(driver);
  const 메뉴 = new 펼친메뉴(driver);
  const 창 = new 확인창(driver);
  let 나: 계정 | undefined;
  let 원본: 프로필원본 | undefined;

  const 기존항목수 = (): number => (원본?.fields ?? []).filter((칸) => !칸.name.startsWith('QA')).length;

  await test.cleanup('바꾼 프로필을 처음 상태로 되돌린다', async () => {
    if (나 !== undefined && 원본 !== undefined) await 프로필되돌리기(나, 원본);
  });

  await test.case(헤더이미지팝업, async ({ params }) => {
    나 = 계정꺼내기(params.loginId, params.loginPassword, '프로필 고쳐도 되는 계정');
    await test.step('프로필 고쳐도 되는 계정으로 홈에 들어간다', async () => {
      원본 = await 프로필원본읽기(나!);
      await 홈에들어가기(driver);
      await verify('홈 상단 설정 아이콘이 보인다', await 홈.떴나(), true, { blocker: true });
    });
    await test.step('헤더 이미지를 누른다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.헤더이미지누르기();
      const 바꾸기 = await verify('팝업에 「Replace」가 보인다', await 메뉴.항목있나('Replace', 5_000), true);
      const 제거 = await verify('팝업에 「제거」가 보인다', await 메뉴.항목있나('제거', 5_000), true);
      await verify('프로필 편집에서 헤더 이미지를 누르면 팝업 「Replace」 · 「제거」가 뜬다', 바꾸기 && 제거, true);
    });
    await test.step('팝업에서 「제거」를 누른다', async () => {
      await 메뉴.항목누르기('제거');
      await verify('헤더 팝업 「제거」 뒤 「Remove header image?」를 묻는다', await 창에글있나(창, 'Remove header image?'), true);
      await 창.취소누르기();
    });
  });

  await test.case(이름글자수, async ({ params, expected }) => {
    await test.step('이름 칸에 30자를 적는다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.이름줄누르기();
      await verify('「Display name」 편집 화면이 보인다', await 이름.떴나(), true, { blocker: true });
      await 이름.적기(길이글(params.안글자수, '가'));
      await verify('「Display name」 칸에 30자를 적으면 30자가 다 들어간다', (await 이름.값()).length, params.안글자수);
    });
    await test.step('이름 칸에 31자를 적는다', async () => {
      await 이름.적기(길이글(params.밖글자수, '가'));
      await verify('「Display name」 칸에 31자를 적어도 30자까지만 들어간다', (await 이름.값()).length, expected.최대);
    });
  });

  await test.case(이름비움, async () => {
    await test.step('이름 칸을 비운다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.이름줄누르기();
      await 이름.비우기();
      await verify('「Display name」이 비어 있으면 「저장」이 꺼진다', await 될때까지(driver, async () => !(await 이름.저장켜져있나()), 10_000), true);
    });
  });

  await test.case(소개저장켜짐, async ({ params }) => {
    await test.step('자기소개를 비워 둔다', async () => {
      await 소개비우기(나!);
    });
    await test.step('자기소개 칸에 한 글자를 더 적는다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.소개추가줄누르기();
      await verify('자기소개 편집 화면이 보인다', await 소개.떴나(), true, { blocker: true });
      await 소개.적기(params.글);
      await verify('자기소개 입력이 한 번 바뀌면 「저장」이 켜진다', await 될때까지(driver, () => 소개.저장켜져있나(), 10_000), true);
    });
  });

  await test.case(항목네개, async ({ params }) => {
    await test.step('「Custom fields」 항목을 3개로 맞춘다', async () => {
      await 프로필항목맞추기(나!, 3, 'QA항목');
    });
    await test.step('항목이 3개일 때 「Add field」를 확인한다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await verify('「Custom fields」 화면이 보인다', await 항목들.떴나(), true, { blocker: true });
      await verify('「Custom fields」 항목이 3개일 때는 「Add field」가 보인다', await 항목들.항목추가있나(5_000), true);
    });
    await test.step('항목을 하나 더해 4개로 만든다', async () => {
      await 항목들.항목추가누르기();
      await verify('「Add field」 화면이 보인다', await 항목.추가화면떴나(), true, { blocker: true });
      await 항목.라벨적기(params.라벨);
      await 항목.저장누르기();
      const 넷 = await verify('프로필 항목이 4개가 된다', await 될때까지(driver, async () => (await 항목들.라벨글들()).length === 4, 20_000), true);
      const 숨김 = await verify('「Add field」가 보이지 않는다', await 사라질때까지(driver, 항목목록화면.항목추가, 5_000), true);
      await verify('「Custom fields」 항목이 4개가 되면 「Add field」가 숨겨진다', 넷 && 숨김, true);
    });
  });

  await test.case(라벨만저장, async ({ params }) => {
    await test.step('「Custom fields」 항목을 4개 미만으로 맞춘다', async () => {
      await 프로필항목맞추기(나!, 기존항목수(), 'QA항목');
    });
    await test.step('「라벨」만 적는다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await 항목들.항목추가누르기();
      await verify('「Add field」 화면이 보인다', await 항목.추가화면떴나(), true, { blocker: true });
      await 항목.라벨적기(params.라벨);
      await verify('「Add field」에서 「라벨」만 적으면 저장할 수 있다', await 될때까지(driver, () => 항목.저장켜져있나(), 10_000), true);
    });
  });

  await test.case(항목삭제묻기, async () => {
    await test.step('「QA항목」 프로필 항목을 만든다', async () => {
      await 프로필항목맞추기(나!, 기존항목수() + 1, 'QA항목');
    });
    await test.step('항목 삭제를 누른다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.항목줄누르기();
      await verify('「Custom fields」 화면이 보인다', await 항목들.떴나(), true, { blocker: true });
      await 항목들.편집누르기('QA항목');
      await verify('「Edit field」 화면이 보인다', await 항목.편집화면떴나(), true, { blocker: true });
      await 항목.삭제누르기();
      await verify('프로필 항목을 지우려 하면 「Delete field?」를 묻는다', await 창에글있나(창, 'Delete field?'), true);
      await 창.취소누르기();
    });
  });

  await test.case(소개501자, async ({ params }) => {
    await test.step('자기소개를 비운다', async () => {
      await 소개비우기(나!);
    });
    await test.step('자기소개 칸에 501자를 적는다', async () => {
      const 편집 = await 프로필편집으로(driver);
      await 편집.소개추가줄누르기();
      await verify('자기소개 편집 화면이 보인다', await 소개.떴나(), true, { blocker: true });
      await 소개.적기(길이글(params.글자수, '가'));
      await verify('자기소개 칸에 501자를 적으면 501자가 다 들어간다', (await 소개.값()).length, params.글자수);
    });
  });
});
