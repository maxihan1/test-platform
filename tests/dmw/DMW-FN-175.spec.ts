import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 머리글 } from './components/header.component.js';
import { 창기록하기 } from './helpers/board-tools.helper.js';
import { 계정으로로그인 } from './helpers/login.helper.js';
import { 안내창막기 } from './helpers/page-setup.helper.js';
import { 글쓰기화면 } from './pages/board-write.page.js';

export const spec = defineCase({
  tcId: 'DMW-FN-175',
  name: '임시 저장한 뒤 글쓰기에 다시 들어오면 「임시 저장된 글이 있습니다. 불러올까요?」 확인 창이 뜬다',
  platforms: ['desktop', 'mobile'],
  precondition: ['회원으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('회원 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('회원 비밀번호').optional().meta({ secret: true }),
    임시제목: z.string().min(2).describe('임시 저장할 제목 — 2자 이상 50자 이하').default('임시 저장해 둔 제목'),
    임시본문: z.string().min(10).describe('임시 저장할 본문 — 10자 이상 2000자 이하').default('임시 저장해 둔 본문입니다 열 글자가 넘습니다'),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 쓰기 = new 글쓰기화면(page);
  const 머리 = new 머리글(page);
  let 확인할까 = false;
  const 받은창 = 창기록하기(page, () => 확인할까);

  await test.step('회원으로 로그인해 글쓰기 화면을 연다', async () => {
    await 계정으로로그인(page, params.loginId, params.loginPassword);
    await 안내창막기(page);
    await 쓰기.열기();
    await 머리.그려질때까지();
    await verify('회원으로 로그인해 있다', await 머리.로그아웃.isVisible(), true, { blocker: true });
    await verify('글쓰기 화면 제목 「글쓰기」가 보인다', await 쓰기.큰제목.isVisible(), true, { blocker: true });
  });

  await test.step('제목과 본문을 적고 「임시 저장」을 누른 뒤 글쓰기에 다시 들어온다', async () => {
    await 쓰기.채우기({ 제목: params.임시제목, 본문: params.임시본문 });
    await 쓰기.임시저장.click();
    받은창.length = 0;
    await 쓰기.열기();
    await verify(
      '임시 저장한 뒤 글쓰기에 다시 들어오면 「임시 저장된 글이 있습니다. 불러올까요?」 확인 창이 뜬다',
      받은창.filter((창) => 창.종류 === 'confirm').map((창) => 창.글),
      ['임시 저장된 글이 있습니다. 불러올까요?'],
    );
  });

  await test.step('불러오기 확인 창에서 「확인」을 누른다', async () => {
    확인할까 = true;
    await 쓰기.열기();
    const 제목 = await verify('임시 저장한 제목이 채워진다', await 쓰기.제목칸.inputValue(), params.임시제목);
    const 본문 = await verify('임시 저장한 본문이 채워진다', await 쓰기.본문칸.inputValue(), params.임시본문);
    await verify('불러오기 확인 창에서 「확인」을 누르면 임시 저장한 제목과 본문이 채워진다', 제목 && 본문, true);
  });
});
