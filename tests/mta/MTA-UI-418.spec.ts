import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 로그인하기 } from './helpers/login.helper.js';
import { 필터편집화면 } from './pages/filter-edit.page.js';
import { 홈화면 } from './pages/home.page.js';
import { 계정설정화면 } from './pages/set-account.page.js';
import { 필터목록화면 } from './pages/set-filters.page.js';
import { 설정화면 } from './pages/settings.page.js';

export const spec = defineCase({
  tcId: 'MTA-UI-418',
  name: '필터 편집 화면(「필터 추가」/「필터 편집」, 메뉴 「저장」)에 「제목」 · 「기간」 · 「뮤트된 단어」(「n 뮤트된 단어 또는 문구」) · 「<범위>를 뮤트」 · 스위치 「내용 경고 표시」(「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」)가 보이고 편집이면 「필터 삭제」가 보인다',
  platforms: ['android'],
  precondition: ['일반 회원(qa_user1)으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('일반 회원 이메일').optional().meta({ secret: true }),
    loginPassword: z.string().describe('일반 회원 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ driver, params }) => {
  const 홈 = new 홈화면(driver);
  const 설정 = new 설정화면(driver);
  const 계정설정 = new 계정설정화면(driver);
  const 필터목록 = new 필터목록화면(driver);
  const 편집 = new 필터편집화면(driver);

  await test.step('일반 회원으로 로그인해 홈을 연다', async () => {
    await 로그인하기(driver, params.loginId, params.loginPassword);
    await verify('홈에 글쓰기 버튼이 보인다', await 홈.떴나(), true, { blocker: true });
  });
  await test.step('설정에서 필터 목록을 연다', async () => {
    await 설정.열기();
    await 설정.계정줄누르기();
    await 계정설정.줄누르기('필터');
    await verify('필터 목록에 「필터 추가」 단추가 보인다', await 필터목록.떴나(), true, { blocker: true });
  });
  await test.step('필터 목록에서 「필터 추가」를 누른다', async () => {
    await 필터목록.추가누르기();
    await verify('필터 편집 화면에 「기간」 줄이 보인다', await 편집.떴나(), true);
    const 제목 = await verify('화면 제목 「필터 추가」가 보인다', await 편집.글자보이나('필터 추가'), true);
    const 저장 = await verify('메뉴 「저장」이 보인다', await 편집.글자보이나('저장'), true);
    const 제목칸 = await verify('「제목」이 보인다', await 편집.글자보이나('제목'), true);
    const 기간 = await verify('「기간」이 보인다', await 편집.글자보이나('기간'), true);
    const 단어 = await verify('「뮤트된 단어」가 보인다', await 편집.글자보이나('뮤트된 단어'), true);
    const 단어수 = await verify('「n 뮤트된 단어 또는 문구」가 보인다', await 편집.글보이나('n 뮤트된 단어 또는 문구'), true);
    const 범위 = await verify('「<범위>를 뮤트」가 보인다', await 편집.글보이나('<범위>를 뮤트'), true);
    const 경고 = await verify('스위치 「내용 경고 표시」가 보인다', await 편집.글자보이나('내용 경고 표시'), true);
    const 경고설명 = await verify('「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」이 보인다', await 편집.글자보이나('이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌'), true);
    await 편집.나가기시도();
    await verify('필터 목록으로 돌아온다', await 필터목록.떴나(), true);
    await 필터목록.줄누르기('스포일러');
    await verify('필터 편집 화면이 다시 열린다', await 편집.떴나(), true);
    const 편집제목 = await verify('화면 제목 「필터 편집」이 보인다', await 편집.글자보이나('필터 편집'), true);
    const 삭제 = await verify('편집 화면에 「필터 삭제」가 보인다', await 편집.글자보이나('필터 삭제'), true);
    await verify('필터 편집 화면(「필터 추가」/「필터 편집」, 메뉴 「저장」)에 「제목」 · 「기간」 · 「뮤트된 단어」(「n 뮤트된 단어 또는 문구」) · 「<범위>를 뮤트」 · 스위치 「내용 경고 표시」(「이 필터에 해당하는 게시물은 계속 표시하지만, 내용 경고 뒤에 숨겨서 보여줌」)가 보이고 편집이면 「필터 삭제」가 보인다', 제목 && 저장 && 제목칸 && 기간 && 단어 && 단어수 && 범위 && 경고 && 경고설명 && 편집제목 && 삭제, true);
  }, { capture: true });
});
