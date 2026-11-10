// Scout 창 글자의 영어 (도메인/챗봇 §8.18). 키는 한국어 원문이다. 「Scout」 는 옮기지 않는 이름이다 (docs/WORDS.md)

export const Scout말: Record<string, string> = {
  // 레이더 버튼 — 읽어 주는 이름과 닫힌 동안 답이 끝났을 때의 안내
  'Scout 열기': 'Open Scout',
  'Scout 닫기': 'Close Scout',
  'Scout 열기 · 답 만드는 중': 'Open Scout · answering',
  'Scout 열기 · 답 도착': 'Open Scout · answer ready',
  '답이 도착했어요': 'Your answer is ready',
  // 창 머리 · 바닥
  '대화 초기화': 'Reset chat',
  '{프로젝트} 프로젝트의 데이터로만 답해요': 'Answers use only {프로젝트} project data',
  // ① 처음 열기
  '{프로젝트} 프로젝트에 대해 물어보세요': 'Ask about the {프로젝트} project',
  '실행 결과 · 이슈 · PRD 를 확인해서 답해요. 아래 예시를 눌러도 돼요.': 'Scout checks run results, issues and the PRD. You can also tap an example below.',
  '오늘 실행 결과 요약': "Summarize today's runs",
  '최근 등록된 이슈': 'Recently filed issues',
  '회귀 실패만 보기': 'Show regressions only',
  '어제 성능 테스트 결과': "Yesterday's performance test results",
  // 입력
  질문: 'Question',
  '질문을 입력하세요': 'Ask a question',
  보내기: 'Send',
  '중단§Scout': 'Stop',
  // 🎤 — 들은 말은 칸을 채우기만 한다
  '음성으로 입력': 'Voice input',
  '음성 입력 종료': 'Stop voice input',
  '듣는 중 · 말을 마치면 확인 후 보내세요': 'Listening · check the text before you send it',
  // ③ 대기 · 진행 줄
  '앞에 {수}건 대기 중': '{수} ahead in line',
  '작성 서버가 꺼져 있어요. 켜지면 바로 답해요': "The authoring server is off. Scout will answer as soon as it's back",
  '확인한 것 {수}건': '{수} checks',
  '실행 #{번호} 결과 확인': 'Checked run #{번호}',
  '실행 #{번호} 결과 확인하는 중': 'Checking run #{번호}',
  '성능 실행 #{번호} 결과 확인': 'Checked performance run #{번호}',
  '성능 실행 #{번호} 결과 확인하는 중': 'Checking performance run #{번호}',
  '최근 실행 검색': 'Searched recent runs',
  '최근 실행 검색하는 중': 'Searching recent runs',
  '이슈 검색': 'Searched issues',
  '이슈 검색하는 중': 'Searching issues',
  'PRD 검색': 'Searched the PRD',
  'PRD 검색하는 중': 'Searching the PRD',
  '케이스 검색§Scout': 'Searched cases',
  '케이스 검색하는 중': 'Searching cases',
  '프로젝트 노트 확인': 'Read the project notes',
  '프로젝트 노트 확인하는 중': 'Reading the project notes',
  '데이터 확인': 'Checked data',
  '데이터 확인하는 중': 'Checking data',
  // 목록 답이 열 줄을 넘을 때
  '나머지 {수}건 보기': 'Show {수} more',
  // ④ 끝 상태
  '질문을 중단했습니다': 'The question was stopped',
  '답이 2분을 넘어 중단했습니다': 'Stopped because the answer took over 2 minutes',
  '답을 만들지 못했습니다': 'Scout could not answer',
  '다시 질문': 'Ask again',
};
