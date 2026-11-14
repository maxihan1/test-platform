import { defineCase, test, verify } from '@platform/kit';
import { z } from 'zod';


export const spec = defineCase({
  tcId: 'MTW-FN-016',
  name: '인스턴스 설정 API 를 부르면 글 500자 · 첨부 4개 · 투표 항목 4개 · 항목 50자로 나온다',
  precondition: ['대상 서버에 접근할 수 있다'],
  params: null,
  expected: z.object({
    글자수: z.number().describe('글 글자 수 한도').default(500),
    첨부수: z.number().describe('첨부 개수 한도').default(4),
    투표항목수: z.number().describe('투표 항목 개수 한도').default(4),
    항목글자수: z.number().describe('투표 항목 글자 수 한도').default(50),
    표시이름: z.number().describe('표시 이름 글자 수 한도').default(40),
    자기소개: z.number().describe('자기소개 글자 수 한도').default(500),
    프로필항목수: z.number().describe('프로필 항목 개수 한도').default(4),
  }),
});
interface 설정 {
  statuses?: { max_characters?: number; max_media_attachments?: number };
  polls?: { max_options?: number; max_characters_per_option?: number };
  accounts?: { max_display_name_length?: number; max_note_length?: number; max_profile_fields?: number };
}

test(spec, async ({ request, expected }) => {
  let 값: 설정 = {};

  await test.step('인스턴스 설정 API 를 부른다', async () => {
    const 응답 = await request.get('/api/v2/instance');
    await verify('인스턴스 설정 API 가 200 으로 돌아온다', 응답.status(), 200, { blocker: true });
    값 = ((await 응답.json()) as { configuration?: 설정 }).configuration ?? {};
    const 글 = await verify('글 글자 수 한도가 기대값과 같다', 값.statuses?.max_characters, expected.글자수);
    const 첨부 = await verify('첨부 개수 한도가 기대값과 같다', 값.statuses?.max_media_attachments, expected.첨부수);
    const 항목 = await verify('투표 항목 개수 한도가 기대값과 같다', 값.polls?.max_options, expected.투표항목수);
    const 항목글 = await verify('투표 항목 글자 수 한도가 기대값과 같다', 값.polls?.max_characters_per_option, expected.항목글자수);
    await verify('인스턴스 설정 API 를 부르면 글 500자 · 첨부 4개 · 투표 항목 4개 · 항목 50자로 나온다', 글 && 첨부 && 항목 && 항목글, true);
    const 이름 = await verify('표시 이름 글자 수 한도가 기대값과 같다', 값.accounts?.max_display_name_length, expected.표시이름);
    const 소개 = await verify('자기소개 글자 수 한도가 기대값과 같다', 값.accounts?.max_note_length, expected.자기소개);
    const 필드 = await verify('프로필 항목 개수 한도가 기대값과 같다', 값.accounts?.max_profile_fields, expected.프로필항목수);
    await verify('표시 이름 40자 · 자기소개 500자 · 프로필 항목 4개로 나온다', 이름 && 소개 && 필드, true);
  });
});
