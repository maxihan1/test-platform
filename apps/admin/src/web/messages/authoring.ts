// 테스트 작성 화면 글자의 영어 (SPEC §8 · 도메인/작성 §3.6). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 작성말: Record<string, string> = {
  // 줄의 종류와 상태
  작성: 'Author',
  재실행: 'Rerun',
  머지: 'Merge',
  대기: 'Queued',
  '도는 중': 'Running',
  // 「멈춘 듯」은 서버가 주는 상태가 아니다. 단계가 오래 안 바뀐 것을 화면이 판정한 것이라
  // 단정하지 않는 말을 쓴다 — 맥이 느린 것일 수도 있다
  '멈춘 듯': 'Stalled?',
  끝남: 'Done',
  '기록 없음': 'No record',
  실패: 'Failed',

  // 빈 목록
  '아직 작성을 요청한 기록이 없습니다': 'No authoring requests yet',
  '기획서를 넣으면 여기에 줄이 생깁니다': 'Paste a spec and a row appears here',

  // 새 요청 폼
  '기획서 본문을 붙여 넣으세요': 'Paste the spec text here',
  보내기: 'Send',
  '보내는 중': 'Sending',

  // 상세
  '작업 단계': 'Stage',
  '요청한 사람': 'Requested by',
  '집어 간 계정': 'Claimed by',
  '요청한 시각': 'Requested at',
  '초안 PR 열기': 'Open draft PR',
};
