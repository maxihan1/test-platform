// 킷·리포터·러너가 결과를 주고받는 약속. 세 곳이 같은 문자열을 봐야 해서 한 자리에 모은다 (SPEC §5.2)

// 절차 결과 한 건을 리포터에 넘길 때 쓰는 첨부 이름
export const STEP_ATTACHMENT = 'platform-step';

// 러너가 stdout에서 결과 줄을 찾을 때 쓰는 표시자
export const RESULT_MARKER = '@@RESULT@@';
