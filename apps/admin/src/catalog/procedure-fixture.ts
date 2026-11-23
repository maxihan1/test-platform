// 프로시저 파일 검사들이 같이 쓰는 본보기 글 — 글쓰기 흐름 하나에 케이스 셋(본문없음 → 글자수초과 → 게시확인)

export const 선언 = (이름: string, tcId: string, 더 = ''): string =>
  `const ${이름} = defineCase({
  tcId: '${tcId}',
  name: '${이름}',
  platforms: ['android'],
  precondition: [],
  params: null,
  expected: null,${더}
});
`;

export const 기본선언 = 선언('본문없음', 'XQ-FN-101') + 선언('글자수초과', 'XQ-FN-102') + 선언('게시확인', 'XQ-FN-103');

export function 프로시저글(본문: string, 고침: { 가져오기?: string; 선언들?: string; cases?: string; procId?: string; 이름?: string } = {}): string {
  return `import { defineCase, defineProcedure, test, verify } from '@platform/kit';
${고침.가져오기 ?? ''}
${고침.선언들 ?? 기본선언}
export const procedure = defineProcedure({
  procId: '${고침.procId ?? 'XQ-TP-001'}',
  name: '${고침.이름 ?? '글쓰기 — 입력 제한부터 게시까지'}',
  platforms: ['android'],
  precondition: ['일반 회원으로 로그인해 있다'],
  cases: ${고침.cases ?? '[본문없음, 글자수초과, 게시확인]'},
});

test(procedure, async ({ driver }) => {
${본문}});
`;
}

export const 절차 = (제목: string, 안 = ''): string => `  await test.step('${제목}', async () => {${안}});\n`;

export const 구간 = (이름: string, 제목: string, 안 = ` await verify('맞다', true, true); `): string =>
  `  await test.case(${이름}, async () => {\n  ${절차(제목, 안)}  });\n`;

export const 정상본문 =
  절차('글쓰기 화면을 연다') + 구간('본문없음', '본문을 비운다') + 구간('글자수초과', '본문에 501자를 넣는다') + 절차('게시를 누른다') + 구간('게시확인', '타임라인을 연다');
