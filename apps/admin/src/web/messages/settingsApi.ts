// 설정 > 애플리케이션의 API 칸(종류 · API 문서 · API 인증) 글자의 영어 (API-F1-08). settings.ts 가 300줄에 닿지 않게 뗐다

export const 설정API말: Record<string, string> = {
  // 기본 정보 「종류」
  웹: 'Web',
  게임: 'Game',

  // 「API 문서」 구획
  'API 문서': 'API document',
  'Swagger 문서를 받아 오는 곳입니다. 테스트 작성과 응답 형식 검사에 사용합니다':
    'Where the Swagger document is fetched from. Used for test authoring and response shape checks',
  '문서 경로': 'Document path',
  '대상 서버 주소 뒤에 붙여 받습니다': 'Appended to the target server address',
  '기준 서버': 'Reference server',
  '이 서버의 문서가 바뀔 때만 새 버전으로 저장합니다': 'A new version is saved only when this server’s document changes',
  '문서 경로는 / 로 시작하고 500자까지 적을 수 있습니다': 'The document path must start with / and be at most 500 characters',
  'API 문서의 기준 서버를 대상 서버 목록에서 고릅니다': 'Pick the API document reference server from the target servers',

  // 대상 서버 줄의 「API 인증」
  'API 인증': 'API auth',
  '토큰 주소': 'Token URL',
  '클라이언트 ID': 'Client ID',
  '비밀값': 'Secret',
  '대상 서버 {번호} API 인증 {순번} 이름': 'Target server {번호} API auth {순번} name',
  '대상 서버 {번호} API 인증 {순번} 토큰 주소': 'Target server {번호} API auth {순번} token URL',
  '대상 서버 {번호} API 인증 {순번} 클라이언트 ID': 'Target server {번호} API auth {순번} client ID',
  '대상 서버 {번호} API 인증 {순번} 비밀값': 'Target server {번호} API auth {순번} secret',
  '대상 서버 {번호} API 인증 {순번} 삭제': 'Delete target server {번호} API auth {순번}',
  '대상 서버 {번호} API 인증 추가': 'Add API auth to target server {번호}',
  '+ API 인증 추가': '+ Add API auth',
  '저장한 값은 보안상 다시 표시하지 않습니다 · 비밀값은 끝 4자리만 보입니다':
    'Saved values are not shown again for security · Only the last 4 characters of a secret are shown',
  '비밀값을 입력해 주세요. 새 인증이거나 이름 · 토큰 주소 · 서버 주소를 바꾸면 다시 넣어야 합니다':
    'Enter the secret. A new auth, or one with a changed name, token URL or server URL, needs it again',
  'API 인증에 비어 있는 칸이 있습니다. 입력하거나 그 인증을 삭제해 주세요':
    'An API auth has an empty field. Fill it in or delete that auth',
  'API 인증 비밀값을 입력해 주세요': 'Enter the API auth secret',
  'API 인증 이름은 20자까지이고 한 대상 서버 안에서 겹치지 않아야 합니다 (서버마다 10개까지)':
    'API auth names are up to 20 characters and unique per target server (up to 10 per server)',
  '토큰 주소는 / 나 http(s):// 로 시작해야 합니다': 'The token URL must start with / or http(s)://',
  '비밀값은 12자 이상 500자 이하로 입력해 주세요': 'Enter a client secret of 12 to 500 characters',

  // 대상 서버 줄 「어드민 키」 — 게임만 (GAME-F1-08)
  '어드민 키': 'Admin key',
  '키 값': 'Key value',
  '대상 서버 {번호} 어드민 키 머리 이름': 'Target server {번호} admin key header name',
  '대상 서버 {번호} 어드민 키 값': 'Target server {번호} admin key value',
  '어드민 키는 게임 서버 어드민 API 에 머리로 실어 보냅니다. 케이스가 재화 지급 같은 상태를 만들 때 씁니다. 값은 끝 4자리만 보이고, 두 칸을 비우고 저장하면 지워집니다':
    'The admin key is sent as a header to the game server admin API. Cases use it to set up state such as granting currency. Only the last 4 characters are shown; clear both fields and save to remove it',
  '이대로 저장하면 이 서버의 어드민 키가 지워집니다': 'Saving now removes the admin key for this server',
  '어드민 키 머리 이름을 입력해 주세요': 'Enter the admin key header name',
  '어드민 키 머리 이름은 영문 · 숫자 · - 로 100자까지입니다': 'The admin key header name uses letters, digits and - only, up to 100 characters',
  '어드민 키 값은 공백 없이 12자 이상 500자 이하로 입력해 주세요': 'Enter an admin key value of 12 to 500 characters with no spaces',
  '새 어드민 키는 값을 입력해 주세요. 머리 이름이나 대상 서버 이름 · 주소를 바꾸면 다시 넣어야 합니다':
    'Enter a value for the new admin key. Changing the header name or the target server name or URL needs it again',
};
