// 「API › API 문서」 화면 글자의 영어 (도메인/API §8.13). 키는 한국어 원문이다
// 여기에 넣은 키는 화면 어딘가가 실제로 써야 한다 — messages.test.ts 가 양방향으로 센다

export const API문서말: Record<string, string> = {
  // 메뉴와 머리
  'API 애플리케이션을 고르면 API 문서가 보입니다': 'Pick an API application to see its API docs',
  '설정에서 종류 보기': 'Check the type in settings',
  '아직 API 문서가 없습니다': 'No API docs yet',
  '버전 {버전}': 'Version {버전}',
  'API {건수}개': '{건수} APIs',
  '문서 새로 받기': 'Fetch docs again',
  '받는 중…': 'Fetching…',
  '올리는 중…': 'Uploading…',
  'API 문서 파일': 'API doc file',
  '현재 버전과 같아 새 버전을 만들지 않았습니다 (버전 {버전})': 'Same as version {버전}, so no new version was made',
  '문서 새로 받기로 기준 서버에서 받거나, 파일 첨부로 OpenAPI 3 JSON 파일을 올립니다':
    'Fetch the docs from the reference server, or attach an OpenAPI 3 JSON file',
  파일: 'File',
  '파일 {이름}': 'File {이름}',
  '{서버} 서버': '{서버} server',

  // 할 일 카드
  '버전 {버전}에서 바뀐 API 가 아직 테스트에 없습니다': 'APIs changed in version {버전} are not in the tests yet',
  '앞 버전({버전})에서 바뀐 API 가 없습니다': 'No API changed since version {버전}',
  '기존 테스트가 실패할 수 있음': 'Existing tests may fail',
  '지운 API 를 쓰던 케이스는 지우지 않고 PR 에 삭제 제안으로 적습니다':
    'Cases that used a removed API are not deleted. The PR lists them as deletion suggestions',
  '테스트를 돌려 볼 대상 서버가 없습니다. 설정에서 먼저 넣습니다': 'No target server to try the tests on. Add one in settings first',
  '바뀐 API {건수}건 테스트에 반영': 'Apply {건수} changed APIs to tests',
  '케이스가 안 거친 응답 {건수}개': '{건수} responses no case has hit',
  '응답 코드 {전체}개 중 아직 통과한 케이스가 받지 못한 응답입니다': 'Responses, out of {전체} codes, that no passing case has received yet',
  '모든 응답을 케이스가 거칩니다': 'Cases hit every response',

  // 버전 기록
  '바뀐 API 없음': 'No API changed',
  '버전 {버전}에서 바뀐 API': 'APIs changed in version {버전}',
  '버전 {버전} 원문': 'Version {버전} source',
  '받은 곳': 'Source',

  // 전체 API
  '전체 API': 'All APIs',
  '확인한 응답 {덮음}/{전체}': 'Responses checked {덮음}/{전체}',
  'API 경로 · 이름 검색': 'Search API path or name',
  '문서에 API 가 없습니다': 'The doc has no APIs',
  '찾는 API 가 없습니다': 'No matching API',
  '태그 없음': 'No tag',
  '{건수}개': '{건수}',
  '안 거친 응답 {건수}개': '{건수} responses not hit',
  '{코드} 확인함': '{코드} checked',
  '{코드} 아직 안 받음': '{코드} not received yet',
  '응답 형식 없음': 'No response format',
  '● 통과한 케이스가 받은 응답 · ○ 아직 안 받은 응답 · 「응답 형식 없음」 문서에 응답 형식이 적혀 있지 않은 코드':
    '● received by a passing case · ○ not received yet · "No response format": the doc gives no format for that code',
  '테스트 작성 목록 보기': 'Open authoring list',
};
