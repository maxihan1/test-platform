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
  '기획서를 넣으면 여기에 줄이 생깁니다': 'Add a spec and a row appears here',

  // 새 요청 폼 — 파일과 피그마 주소를 한 세트로 (도메인/작성 §7 「자료」)
  '기획서 파일': 'Spec files',
  '피그마 주소': 'Figma links',
  '한 줄에 하나씩': 'One per line',
  보내기: 'Send',
  '보내는 중': 'Sending',
  '받지 않는 파일입니다. PDF · 워드 · md · txt 만 받습니다': 'File type not accepted. Only PDF · Word · md · txt',
  '이 요청은 줄에 서지 않았습니다. 새 요청으로 다시 넣으세요': 'This request was not queued. Submit a new request',
  '파일이 한 파일 상한보다 큽니다': 'The file is larger than the per-file limit',
  '피그마 주소 모양이 다릅니다. 피그마 디자인 파일의 링크를 넣으세요 (FigJam 은 받지 않습니다)':
    'Not a Figma link we accept. Paste a Figma design file link (FigJam is not accepted)',
  '파일 이름에 쓸 수 없는 글자(따옴표 · 빗금 · ..)가 있습니다': 'The file name has characters that are not allowed (quotes · slashes · ..)',
  '자료가 한 요청에 넣을 수 있는 개수를 넘었습니다': 'Too many attachments for one request',
  '자료가 하나도 없습니다. 파일이나 피그마 주소를 넣으세요': 'No attachments. Add a file or a Figma link',
  '요청한 사람만 자료를 올릴 수 있습니다': 'Only the requester can upload attachments',

  // 상세
  '작업 단계': 'Stage',
  '요청한 사람': 'Requested by',
  '집어 간 계정': 'Claimed by',
  '요청한 시각': 'Requested at',
  '초안 PR 열기': 'Open draft PR',
  번호: 'No.',
  '맥이 멈춘 것 같습니다. 새 요청으로 다시 넣으세요': 'The Mac looks stalled. Submit a new request',
};
