// 설정 > 대상 서버 줄의 「테스트 데이터 준비」 칸 글자의 영어 (SEED-F1-02 · 도메인/인증 §8.8). settingsApi.ts 와 같은 까닭으로 뗐다

export const 설정준비말: Record<string, string> = {
  '테스트 데이터 준비': 'Test data setup',
  '대상 서버 {번호} 테스트 데이터 준비 추가': 'Add test data setup for target server {번호}',
  '대상 서버 {번호} 테스트 데이터 준비 삭제': 'Remove test data setup for target server {번호}',
  '대상 서버 {번호} 준비 주소': 'Target server {번호} setup URL',
  '대상 서버 {번호} 준비 헤더 이름': 'Target server {번호} setup header name',
  '대상 서버 {번호} 준비 헤더 값': 'Target server {번호} setup header value',
  '대상 서버 {번호} 준비 헤더 값 변경': 'Change the setup header value for target server {번호}',
  '대상 서버 {번호} 준비 헤더 값 변경 취소': 'Cancel changing the setup header value for target server {번호}',
  '대상 서버 {번호} 준비 시간 한도(초)': 'Target server {번호} setup time limit (seconds)',
  '헤더 값': 'Header value',
  '이대로 저장하면 이 서버의 테스트 데이터 준비가 삭제됩니다': 'Saving now removes the test data setup for this server',
  '실서비스 서버에는 테스트 데이터 준비를 넣을 수 없습니다': 'Test data setup cannot be added to a production server',
  '테스트 데이터 준비 주소는 실행할 때마다 먼저 호출해 테스트 데이터를 처음 상태로 초기화합니다. 같은 주소를 넣은 애플리케이션은 한 번에 하나씩 실행합니다':
    'The test data setup URL is called before every run to reset test data to its initial state. Applications that share the same URL run one at a time',
  '준비 주소는 http(s) 주소로 1000자까지 입력해 주세요': 'Enter an http(s) setup URL of up to 1000 characters',
  '준비 헤더 이름은 영문 · 숫자 · - 로 100자까지입니다': 'The setup header name uses letters, digits and - only, up to 100 characters',
  '준비 헤더 값은 12자 이상 500자 이하로 입력해 주세요. 띄어쓰기는 가운데 한 칸만 넣을 수 있습니다':
    'Enter a setup header value of 12 to 500 characters. Only one space is allowed, in the middle',
  '준비 시간 한도를 10초에서 600초 사이의 정수로 입력해 주세요': 'Enter a setup time limit as a whole number from 10 to 600 seconds',
  '신규 준비 주소는 헤더 값을 입력해 주세요. 준비 주소 · 헤더 이름이나 대상 서버 이름을 변경하면 다시 넣어야 합니다':
    'Enter a header value for the new setup URL. Changing the setup URL, header name or target server name needs it again',
};
