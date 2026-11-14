// QA 리포트 화면 글자의 영어. 키는 한국어 원문이다 (도메인/리포팅 §8.21). 「전체」 · 「대상 서버」 · 「진행 중」 · 「이전」 · 「다음」 · 「버전 {버전}」 · 종류 이름은 다른 표에 있다

export const QA리포트말: Record<string, string> = {
  'QA 리포트': 'QA reports',
  '리포트 종류': 'Report type',
  '프로젝트§탭': 'Project',
  '승인 상태': 'Approval',
  '승인 전': 'Not approved',
  승인됨: 'Approved',
  '승인됨 · {승인자}': 'Approved · {승인자}',
  '빌드 {빌드}': 'Build {빌드}',
  '마지막 실행 {시각}': 'Last run {시각}',
  '리포트 {수}건': '{수} reports',
  '조건에 맞는 리포트가 없습니다': 'No reports match these filters',
  '아직 QA 리포트가 없습니다': 'No QA reports yet',
  '실행이 완료되면 빌드마다 리포트를 만듭니다': 'A report is created for each build when its runs finish',
  '프로젝트 리포트가 없습니다': 'No project reports',
  '{프로젝트} 프로젝트의 모든 애플리케이션을 기간 단위로 묶어 보여 줍니다': 'Covers every application in the {프로젝트} project for a chosen period',
};
