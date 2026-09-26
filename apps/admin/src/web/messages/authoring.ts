// 테스트 작성 화면 글자의 영어 (SPEC §8 · 도메인/작성 §3.6). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const 작성말: Record<string, string> = {
  // 줄의 종류와 상태
  작성: 'Author',
  재실행: 'Rerun',
  머지: 'Merge',
  '준비 중': 'Preparing',
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
  '빈 파일은 올릴 수 없습니다': 'Empty files cannot be uploaded',
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

  // 역방향 — 기획서와 실제 화면을 대조한다 (도메인/작성 §3.6 「★ 역방향」)
  '실제 화면과 대조': 'Compare with the live screen',
  '화면과 대조': 'Screen compare',
  '시작 주소': 'Start URL',
  '비우면 기획서가 말하는 화면에서 시작합니다. 기획서 없이 시작 주소만 넣으면 그 화면을 훑어 역기획서를 만듭니다':
    'Leave empty to start from the screen the spec describes. With only a start URL and no spec, that screen is explored and a reverse spec is written',
  '이 서비스에는 대상 서버가 없습니다. 설정 > 서비스에서 먼저 넣으세요':
    'This service has no target servers. Add one in Settings > Services first',
  '이 대상 서버에는 테스트 계정이 없습니다. 설정 > 서비스에서 테스트 계정을 넣으세요':
    'This target server has no test account. Add one in Settings > Services',
  '시작 주소는 고른 대상 서버와 같은 주소(도메인 · 포트)여야 합니다':
    'The start URL must be on the same address (domain · port) as the chosen target server',
  '기획서가 말하는 화면에서 시작': 'Starts from the screen the spec describes',
  '화면만 — 기획서 없이 이 화면을 훑습니다': 'Screen only — explores this screen without a spec',
  '입력 자료': 'Inputs',
  산출물: 'Outputs',
  '표시 사본': 'Marked copy',
  역기획서: 'Reverse spec',
  '기획서와 화면의 차이': 'Differences between spec and screen',
  종류: 'Kind',
  자리: 'Where',
  기획서: 'Spec',
  화면: 'Screen',
  케이스: 'Case',
  표시함: 'Marked',
  '표시 못 함': 'Not marked',
  '이유 기록 없음': 'No reason recorded',
  '기획서와 다름': 'Differs from spec',
  '화면에만 있음': 'Only on screen',
  '문서에만 있음': 'Only in spec',
  '알 수 없는 종류': 'Unknown kind',
};
