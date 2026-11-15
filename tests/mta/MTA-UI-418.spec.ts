import { defineCase, test, verify } from '@platform/kit';
import { 뜰때까지 } from '@platform/kit/parts';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 계정줄 } from './helpers/app.helper.js';
import { 설정줄열기, 계정설정열기 } from './helpers/settings-flow.helper.js';
import { 홈화면 } from './pages/home.page.js';
import { 필터화면 } from './pages/filter-edit.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-418',
  name: '필터 추가 화면에 「제목」 · 「기간」 · 「뮤트된 단어」 · 「내용 경고 표시」와 「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」이 보인다',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: z.object({
    제목글: z.string().describe('필터 추가 화면 글').default('제목'),
    기간글: z.string().describe('필터 추가 화면 글').default('기간'),
    단어글: z.string().describe('필터 추가 화면 글').default('뮤트된 단어'),
    경고글: z.string().describe('필터 추가 화면 글').default('내용 경고 표시'),
    경고설명: z.string().describe('내용 경고 표시 설명').default('이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌'),
  }),
});

test(spec, async ({ driver, params, expected }) => {
  const 홈 = new 홈화면(driver);
  const 필터 = new 필터화면(driver);
  await test.step('일반 회원으로 로그인해 홈 화면을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈 화면 글쓰기 버튼이 보인다', await 홈.그려질때까지(), true, { blocker: true });
  });
  await test.step('계정 설정을 연다', async () => {
    await verify('계정 설정이 열린다', await 계정설정열기(driver, 계정줄(params.loginId ?? '')), true, { blocker: true });
  });
  await test.step('계정 설정에서 「필터」를 연다', async () => {
    await verify('필터 목록이 열린다', await 설정줄열기(driver, '필터'), true, { blocker: true });
  });
  await test.step('필터 목록에서 「필터 추가」를 누른다', async () => {
    await driver.$(필터.추가버튼).click();
    await verify('필터 추가 화면이 열린다', await 필터.편집그려질때까지(), true, { blocker: true });
    const 제목 = await verify('필터 추가 화면에 「제목」이 보인다', await 뜰때까지(driver, 필터.화면글(expected.제목글), 10_000), true);
    const 기간 = await verify('필터 추가 화면에 「기간」이 보인다', await 뜰때까지(driver, 필터.줄(expected.기간글), 10_000), true);
    const 단어 = await verify('필터 추가 화면에 「뮤트된 단어」가 보인다', await 뜰때까지(driver, 필터.줄(expected.단어글), 10_000), true);
    const 경고 = await verify('필터 추가 화면에 「내용 경고 표시」가 보인다', await 뜰때까지(driver, 필터.줄(expected.경고글), 10_000), true);
    const 설명 = await verify('필터 추가 화면에 「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」이 보인다', await 뜰때까지(driver, 필터.줄(expected.경고설명), 10_000), true);
    await verify('필터 추가 화면에 「제목」 · 「기간」 · 「뮤트된 단어」 · 「내용 경고 표시」와 「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」이 보인다', 제목 && 기간 && 단어 && 경고 && 설명, true);
  });
});
