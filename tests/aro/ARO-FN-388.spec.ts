import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';

import { 고유글, 고유접두, 내것지급치우기, 로그인돼있는가 } from './helpers/grant.helper.js';
import { 운영자쿠키받기 } from './helpers/login.helper.js';
import { 지급화면 } from './pages/grants.page.js';

export const spec = defineCase({
  tcId: 'ARO-FN-388',
  name: '지급을 보내면 폼이 비워지고 아이템 줄이 한 줄만 남는다',
  precondition: ['운영자 계정으로 로그인해 있다'],
  params: z.object({
    loginId: z.string().describe('운영자 아이디').optional().meta({ secret: true }),
    loginPassword: z.string().describe('운영자 비밀번호').optional().meta({ secret: true }),
  }),
  expected: null,
});

test(spec, async ({ page, params }) => {
  const 화면 = new 지급화면(page);
  const 접두 = 고유접두('ARO-FN-388');
  const 제목 = 고유글('ARO-FN-388');

  try {
    await test.step('운영자 계정으로 로그인한다', async () => {
      await 운영자쿠키받기(page, params.loginId, params.loginPassword);
      await verify('운영자 계정으로 로그인해 있다', await 로그인돼있는가(page), true, { blocker: true });
      await 내것지급치우기(page, 접두);
    });

    await test.step('「지급 · 회수」 화면을 연다', async () => {
      await 화면.열기();
      await verify('「우편으로 보내기」 폼이 보인다', await 화면.폼제목.isVisible(), true, { blocker: true });
    });

    await test.step('qa_player2 에게 아이템 두 줄을 적어 보낸다', async () => {
      await 화면.채워서보내기({
        캐릭터: 'qa_player2',
        아이템: [
          { 이름: '체력 물약', 수량: 1 },
          { 이름: '녹슨 단검', 수량: 1 },
        ],
        골드: 50,
        제목,
        사유: 제목,
        본문: '폼 비움 시험',
      });
      const 보냄 = await 화면.알림.뜰때까지(/^지급 #\d+ 우편을 1명에게 보냈습니다$/);
      await verify('지급이 나갔다', 보냄, true, { blocker: true });
      const 고른 = await verify('고른 캐릭터가 없다', (await 화면.고른것들.allInnerTexts()).join(', '), '');
      const 제목칸 = await verify('우편 제목 칸이 비어 있다', await 화면.제목칸.inputValue(), '');
      const 사유칸 = await verify('지급 사유 칸이 비어 있다', await 화면.사유칸.inputValue(), '');
      const 본문칸 = await verify('우편 본문 칸이 비어 있다', await 화면.본문칸.inputValue(), '');
      const 골드칸 = await verify('「골드」 칸이 「0」이다', await 화면.골드칸.inputValue(), '0');
      const 이름칸 = await verify('남은 아이템 줄의 이름 칸이 비어 있다', (await 화면.아이템이름값들()).join(', '), '');
      const 줄수 = await verify('아이템 줄이 한 줄이다', await 화면.아이템이름칸들.count(), 1);
      await verify('지급을 보내면 폼이 비워지고 아이템 줄이 한 줄만 남는다', 고른 && 제목칸 && 사유칸 && 본문칸 && 골드칸 && 이름칸 && 줄수, true);
    });
  } finally {
    await 내것지급치우기(page, 접두);
  }
});
