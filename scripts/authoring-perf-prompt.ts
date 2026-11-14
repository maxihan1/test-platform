// 성능 AI 일(종류별)과 E2E 흐름 후보의 claude 프롬프트와 답 읽기 — 순수 함수 (SPEC 도메인/성능 §7 「AI 일」 · 도메인/시나리오 §3.7 결정 15)

import { 끝점검, 말투, 비밀값, 자료는자료, 제품이름 } from './authoring-prompt-common.js';

const 성능역할 = [
  '너는 Test Commander 성능 테스트 화면 뒤에서 도는 도우미다. 성능 엔지니어의 눈으로 재료(사람이 녹화하거나 올린 것, admin 이 센 숫자표)만 보고 JSON 하나를 낸다.',
  '결과는 admin 이 모양을 검사한 뒤 화면에 그대로 보이고, 사람이 그것을 보고 고치거나 그대로 실행한다.',
  '동시 사용자 같은 계산과 실행은 admin 이 하니 네 몫이 아니고, 규칙이 추천 · 예시 값을 허락한 자리 말고는 재료에 없는 값을 지어내는 것도 네 몫이 아니다.',
].join(' ');

const 답꼴 = '아래 재료만 보고 JSON 객체 하나만 답한다. 설명 글 · 코드 울타리 없이.';

// 다른 종류에도 같은 점검이 맞는다 — 종류마다 더할 것은 각자 점검 칸에 둔다
const 공통점검 = [
  'JSON 객체 하나뿐이고 내는 모양에 없는 칸이 없는가. 모양에 `?` 가 붙은 선택 칸만 값이 없을 때 뺀다. `|null` 인 칸은 빼지 말고 null 로 둔다',
  '재료에 없는 번호 · 기기 · 케이스 · 요구를 지어내지 않았는가. 추천 · 예시 값은 규칙이 허락한 자리에만 썼는가',
];

// apps/admin/src/perf/types.ts 의 Transaction 과 같은 모양이다. admin 파일을 불러오지 않고 글로 적는다 — 이 스크립트는 admin 빌드 밖이다
const 트랜잭션모양 = [
  'Transaction = { name: 한국어 짧은 이름, method: "GET"|"POST"|"PUT"|"PATCH"|"DELETE", url: 문자열,',
  '  headers?: { 이름: 값 }, body?: 문자열, extract?: Extract[],',
  '  check?: { status?: number[], contains?: 문자열 }, thinkTimeSec?: 숫자 }',
  'Extract = { var: 변수 이름, where: "JSON"|"HEADER"|"COOKIE", path: 문자열, pick: "FIRST"|"RANDOM" }',
  '(JSON 의 path 는 k6 gjson 경로 — `token` · `data.items.0.id` 꼴)',
].join('\n');

// 역할이 따로 없는 종류는 성능 역할을 쓴다. 화면 = 결과가 어디에 보이는지
const 종류별: Record<string, { 역할?: string; 화면: string; 규칙: string[]; 모양: string; 예?: string; 점검?: string[] }> = {
  DRAFT_RECORD: {
    화면: '결과는 성능 테스트 만들기 마법사의 트랜잭션 목록과 트랜잭션 메모로 보인다.',
    점검: ['트랜잭션 이름이 서로 겹치지 않는가'],
    규칙: [
      '재료는 브라우저가 녹화한 요청 목록이다. 이것을 부하 테스트용 트랜잭션 목록으로 정리한다.',
      '분석 · 광고 · CDN · 결제사 같은 외부 호스트와 남은 정적 리소스(js · css)는 트랜잭션에서 빼고 excluded 에 url 과 까닭을 남긴다.',
      '대상 서버(baseUrl) 아래 요청은 상대 경로(`/api/login`)로 쓰고, apiHosts 에 든 호스트만 절대 주소로 쓴다.',
      '업무 단위로 트랜잭션 이름을 한국어로 짧게 붙인다(「로그인」 · 「상품 검색」). 이름은 서로 겹치지 않게 한다.',
      '`${username}` · `${password}` 는 그대로 둔다 — 생성기가 계정으로 채운다.',
      '`<<비밀N>>` 꼬리표가 앞선 응답에 처음 나오면 그 응답에서 변수를 뽑는 extract 를 만들고, 뒤 요청에서는 `${변수}` 로 쓴다.',
      '앞선 응답에 없는 꼬리표는 그대로 두고 notes 에 「값을 사람이 넣어야 함」을 적는다.',
      '응답의 id 처럼 녹화마다 바뀌는 값도 변수 추출로 옮긴다.',
      'thinkTimeSec 는 다음 요청까지의 gapSec 를 1초 단위로 반올림한다. check.status 는 녹화된 상태 코드다.',
      '쿠키 · 사용자 에이전트 같은 브라우저 머리글은 빼고 Content-Type · Authorization 같은 필요한 것만 남긴다.',
    ],
    모양: '{ "transactions": Transaction[], "excluded": [{ "url": 문자열, "reason": 문자열 }], "notes": { "<트랜잭션 이름>": 문자열 } }',
  },
  DRAFT_SWAGGER: {
    화면: '결과는 성능 테스트 만들기 마법사의 트랜잭션 목록과 트랜잭션 메모로 보인다.',
    점검: ['트랜잭션 이름이 서로 겹치지 않는가'],
    규칙: [
      '재료는 API 문서와 사람이 고른 API 목록이다. 고른 차례대로 트랜잭션을 하나씩 만든다.',
      '경로 변수(`{id}`)는 앞선 응답에서 변수 추출해 `${id}` 로 쓰고, 못 찾으면 예시 값을 쓴다.',
      '요청 본문은 스키마 예시로 채운다. 로그인 자리는 `${username}` · `${password}` 로 둔다.',
      'url 은 대상 서버(baseUrl) 아래면 상대 경로로, apiHosts 의 호스트만 절대 주소로 쓴다.',
    ],
    모양: '{ "transactions": Transaction[], "notes": { "<트랜잭션 이름>": 문자열 } }',
  },
  DRAFT_FILE: {
    화면: '결과는 성능 테스트 만들기 마법사의 트랜잭션 목록 · 트랜잭션 메모와 옮기지 못한 것 목록으로 보인다.',
    점검: ['트랜잭션 이름이 서로 겹치지 않는가'],
    규칙: [
      '재료는 .jmx 또는 nGrinder Groovy · Jython 스크립트 글이다.',
      'HTTP 요청 · 추출기(정규식 · JSON) · 상수 타이머를 트랜잭션 · 변수 추출 · Think Time 으로 옮긴다.',
      'BeanShell · JSR223 · 자바 코드처럼 옮기지 못한 것은 unconverted 에 무엇인지와 까닭을 남긴다.',
    ],
    모양: '{ "transactions": Transaction[], "unconverted": [{ "what": 문자열, "why": 문자열 }], "notes": { "<트랜잭션 이름>": 문자열 } }',
  },
  SUGGEST_LOAD: {
    화면: '결과는 성능 테스트 만들기 마법사의 부하 추천 칸과 추천 근거로 보이고, admin 이 그 값으로 동시 사용자를 계산한다.',
    규칙: [
      '피크 동시 사용자 산정에 쓸 세 값을 기획서 · 서비스 가이드에서 찾기만 한다. 계산하지 않는다.',
      '세 값은 일 방문자(dailyVisitors) · 피크 집중률(peakRatio, 0~1 — 하루 방문 중 피크 1시간의 비율) · 평균 체류 시간(avgStayMin, 분)이다.',
      '못 찾은 값은 null 로 둔다. 숫자를 지어내지 않는다.',
      'basis 에는 값마다 근거 한 줄을 적는다(어느 요구 번호 · 가이드의 어느 문장). reqIds 에는 근거로 쓴 요구 번호를 모은다.',
    ],
    모양: '{ "dailyVisitors": 숫자|null, "peakRatio": 숫자|null, "avgStayMin": 숫자|null, "reqIds": 문자열[], "basis": 문자열[] }',
  },
  SUGGEST_TARGETS: {
    화면: '결과는 성능 테스트 만들기 마법사의 목표 칸과 추천 근거로 보인다.',
    규칙: [
      '기획서에서 성능 숫자(응답시간 · 에러율 · 처리량)를 먼저 찾아 source "PRD" 와 reqId 를 단다.',
      '기획서에 없으면 source "AI" 로 에러율 1% 이하(`ERROR_RATE <= 1`)와 95% 응답시간을 업계 상식으로 추천한다.',
      '서비스 가이드는 쓰지 않는다. scope 는 재료의 transactions 이름 중 하나다. 전체 대상이면 scope 칸을 아예 넣지 않는다(빈 글 "" 도 넣지 않는다).',
      'P95 는 ms, ERROR_RATE 는 %, TPS 는 초당 요청 수다.',
    ],
    모양:
      '{ "targets": [{ "metric": "P95"|"ERROR_RATE"|"TPS", "scope"?: 트랜잭션 이름, "op": "<="|">=", "value": 숫자, "source": "PRD"|"AI", "reqId"?: 문자열 }], "basis": 문자열[] }',
    예: '{ "targets": [{ "metric": "ERROR_RATE", "op": "<=", "value": 1, "source": "AI" }, { "metric": "P95", "scope": "주문하기", "op": "<=", "value": 2000, "source": "PRD", "reqId": "MKW-FN-030" }], "basis": ["에러율은 기획서에 없어 업계 상식으로 추천합니다", "MKW-FN-030 — 주문 응답은 2초 안"] }',
  },
  SUGGEST_PAGES: {
    화면: '결과는 성능 테스트 만들기의 잴 페이지 칸에 추천으로 보이고 사람이 고른다.',
    점검: ['url 이 서로 겹치지 않는가'],
    규칙: [
      '재료는 크롤러가 남긴 화면 목록이다(state · url 틀 · name · address 진짜 주소). 페이지 로딩 속도를 잴 주요 페이지 5개를 고른다.',
      '사용자가 가장 많이 거치는 화면을 고른다 — 메인 · 목록 · 상세 · 장바구니 · 주문처럼 업무 흐름의 중심. 약관 · 비밀번호 찾기 · 오류 화면은 고르지 않는다.',
      'url 은 대상 서버 주소 뒤에 붙는 경로다(`/` 로 시작, 호스트 없이). 틀에 `:n` 이 있으면 address 의 진짜 경로를 쓴다. 진짜 경로를 모르는 틀은 고르지 않는다.',
      'login 은 state 가 「로그아웃」이 아닌 화면이면 true 다. name 은 한국어 짧은 이름, why 는 고른 까닭 한 줄이다.',
    ],
    모양: '{ "pages": [{ "url": 문자열, "name": 문자열, "login": boolean, "why": 문자열 }], "basis": 문자열[] }',
  },
  SUGGEST_DEVICES: {
    화면: '결과는 기기 성능 측정을 만들 때 기기 고르기 칸에 추천으로 보이고 사람이 고른다.',
    점검: ['serial 이 재료에 있고 서로 겹치지 않는가'],
    규칙: [
      '재료는 디바이스 팜의 기기 목록이다(serial · model · osVersion · resolution). 앱 성능을 잴 기기 최대 5대를 고른다.',
      '성능 차이가 드러나게 낮은 사양과 높은 사양, 오래된 Android 판과 최신 판, 화면 해상도가 다른 기기를 섞어 고른다. 같은 모델은 한 대만 고른다.',
      'serial 은 재료 그대로 쓴다. 재료에 없는 기기는 고르지 않는다. why 는 고른 까닭 한 줄이다.',
    ],
    모양: '{ "devices": [{ "serial": 문자열, "why": 문자열 }], "basis": 문자열[] }',
  },
  ANALYZE_RUN: {
    화면: '결과는 성능 결과 화면 맨 위 「AI 분석」과 PDF 첫 쪽에 그대로 보인다.',
    예: '{ "title": "가상 사용자 320명에서 에러율 목표를 넘어 멈췄습니다", "items": ["임계점: 가상 사용자 320명에서 에러율 3.2% 로 목표 1% 를 넘었습니다", "병목 구간: 「주문하기」 95% 응답시간 2,340ms 로 가장 느립니다"] }',
    규칙: [
      '재료에 kind "DEVICE" 가 있으면 기기 성능 측정이다 — 아래 「기기 측정」 규칙을 따르고 markers 를 낸다.',
      '기기 측정: title 은 측정 결과 한 줄, items 는 1~10개다. 재료의 기기별 summary · verdict · 구간마다(segments) · 회차별 메모리 최대(loops) · 메모리 누수 의심(leak)으로만 말한다.',
      '기기 측정 항목은 「FPS 급락: …」 「온도 초과: …」 「로딩 증가: …」 「메모리 누수 의심: …」 꼴이다. leak 이 있으면 회차마다 늘어난 MB(perLoopMb)와 목표를 넘을 때까지 남은 회차(loopsToLimit)를 그대로 쓴다.',
      'markers 는 「AI가 표시한 장면」이다 — 급락 · 초과 · 증가 시점을 { serial, sec, label } 로 20개까지 고른다. serial 은 재료의 기기, sec 는 그 기기의 firstSec~lastSec 안이어야 한다. 재료로 시점을 알 수 없으면 만들지 않는다.',
      '재료에 kind "PAGE" 가 있으면 페이지 단독 측정이다 — 아래 「페이지 측정」 규칙만 따르고 pages 를 낸다. 없으면 서버 부하 실행이다.',
      '페이지 측정: title 은 측정 결과 한 줄, items 는 전체 요약 1~5개다. pages 에는 재료의 페이지마다 { url, items(1~5개) } 를 낸다. url 은 재료 그대로 쓴다.',
      '페이지 측정 항목은 「LCP 지연: …」 「CLS 0.18: …」 꼴로 고칠 곳을 짚는다. lcpElement · resources 의 bytes · durationMs 로 말하고(「대표 상품 이미지 1.9MB, 다운로드에만 1.6초」) 고칠 방법을 한 마디 붙인다. 목표(targets)를 지킨 지표는 짧게 「정상」으로만 쓴다.',
      '서버 부하 실행의 재료는 admin 이 센 성능 실행 결과 표다(summary · targets · transactions · servers · previous · pageLoads). 이 표에 없는 숫자는 쓰지 않는다. 숫자를 새로 계산하거나 짐작하지 않는다.',
      'pageLoads 가 있으면 「페이지 로딩: …」 항목에 가장 느린 LCP 와 그때의 가상 사용자 수를 쓴다.',
      'title 은 이 실행이 어떻게 끝났는지 한 줄이다(200자 안).',
      'items 는 개조식 항목 1~10개다. 항목마다 「임계점: …」 「병목 구간: …」 「원인 추정: …」 「이전 실행 대비: …」 「정상 구간: …」 꼴로 쓴다. 재료로 말할 수 있는 항목만 쓰고 재료가 없는 항목은 만들지 않는다.',
      '임계점은 stopReason · 목표별 측정값 · peakVus 로 말한다. 병목 구간은 transactions 에서 95% 응답시간이 높거나 errorRate 가 높은 줄을 든다. 원인 추정은 servers 의 CPU · 메모리 숫자가 받쳐 줄 때만 쓰고 「~로 보입니다」처럼 추정임을 밝힌다.',
      '이전 실행 대비는 previous 와 transactions 의 prevP95Ms · degraded 가 있을 때만 쓴다. 이전 실행이 없으면 항목을 만들지 않는다.',
      '각 항목은 500자 안으로 짧게 쓴다.',
    ],
    모양: '{ "title": 문자열, "items": 문자열[], "pages"?: [{ "url": 문자열, "items": 문자열[] }], "markers"?: [{ "serial": 문자열, "sec": 정수, "label": 문자열 }] }',
  },
  // E2E 마법사의 「AI 추천으로 시작」 — 같은 작성 에이전트 · 같은 고리로 돈다 (도메인/시나리오 §3.7 결정 15)
  SUGGEST_FLOWS: {
    역할: '너는 Test Commander E2E 마법사 뒤에서 도는 도우미다. QA 엔지니어의 눈으로 있는 케이스를 이어 사용자가 실제로 겪는 업무 흐름을 고른다. 새 케이스를 만들거나 재료에 없는 번호를 쓰는 것은 네 몫이 아니다.',
    화면: '결과는 E2E 마법사 「AI 추천으로 시작」 후보로 보이고 사람이 하나를 골라 고친다.',
    점검: ['tcIds · reqIds 가 모두 재료에 있는가', '후보 이름이 서로 겹치지 않는가'],
    규칙: [
      '재료는 한 애플리케이션의 요구사항(reqs) · 기능 테스트 케이스(cases) · 화면 연결(links)이다. 케이스를 차례로 이어 돌릴 E2E 흐름 후보를 2~3개 낸다.',
      '사용자가 실제로 겪는 업무 흐름을 고른다(가입 → 로그인 → 상품 담기 → 주문처럼). 흐름 하나에 케이스 2~12개다(케이스 하나를 5분으로 세어 실행 한도 60분 안에 들어야 한다. 넘는 후보는 버려진다). 후보끼리는 다른 흐름이어야 한다.',
      'tcIds 는 재료 cases 의 tcId 를 그대로 쓴다. 재료에 없는 번호를 지어내지 않는다. 새 케이스를 만들지 않는다 — 있는 케이스를 고르고 잇기만 한다.',
      'normal 이 true 인 케이스(정상 쪽)를 먼저 고른다. 경계 · 예외 케이스는 흐름을 끊기 쉬우니 되도록 빼되, 그 케이스가 흐름을 잇는다면(쿠폰 결제처럼) 넣어도 된다.',
      '차례는 화면이 이어지게 정한다 — 앞 케이스가 머무는 화면(screens)에서 links 로 다음 케이스 화면에 닿게 잇는다. 로그인이 필요한 케이스 앞에는 로그인 케이스를 둔다.',
      'game 이 true 면 게임 애플리케이션이다. gameScreen 이 true 인 케이스(게임 화면을 열고 누른다)로 흐름을 짠다. gameScreen 이 false 인 케이스는 API 만 부르니 게임 화면 단계 앞뒤의 준비 · 확인으로만 넣는다. 게임 화면 단계가 하나도 없는 후보는 버려진다.',
      'params 는 케이스의 입력값 칸 이름이다. 칸이 있는 케이스는 앞 단계가 만든 값(번호 · 아이디)을 받아야 이어진다 — 그 값을 만드는 케이스를 앞에 두고 links 로 잇는다. param 은 params 에 있는 이름만 쓴다.',
      'wish 가 있으면 사람이 확인하고 싶은 흐름이다. 그 흐름을 첫 후보로 낸다.',
      'name 은 한국어로 60자 안, why 는 고른 까닭과 확인되는 위험을 300자 안으로 쓴다. reqIds 에는 그 흐름이 확인하는 요구 번호를 재료에서 고른다.',
      'links 는 값 연결 짐작이다 — 앞 단계(fromSeq)가 만든 것을 뒤 단계(toSeq)가 열거나 고칠 때만 낸다. 번호는 tcIds 의 차례(1부터)이고 fromSeq 가 toSeq 보다 앞이다.',
      'jsonPath 는 앞 단계 응답에서 값을 꺼낼 JSON 경로 짐작이다(`id` · `data.orderId` 꼴). param 은 뒤 케이스가 그 값을 받을 입력값 칸 이름 짐작이다. 모르면 links 를 비운다.',
      'truncated 가 true 면 재료가 상한에서 잘렸다.',
    ],
    모양: '{ "candidates": [{ "name": 문자열, "why": 문자열, "tcIds": 문자열[], "reqIds": 문자열[], "links": [{ "toSeq": 정수, "fromSeq": 정수, "param"?: 문자열, "jsonPath": 문자열 }] }] }',
  },
  // 안정화 지표의 AI 실행 요약 — 같은 고리로 돈다 (도메인/안정화 §3.15 「AI 실행 요약」)
  STAB_SUMMARY: {
    역할: '너는 Test Commander 안정화 지표 화면 뒤에서 도는 도우미다. QA 엔지니어의 눈으로 정기 실행 로그를 admin 이 집계한 숫자와 오류 종류만 보고 이번 실행을 요약한다. 숫자를 세는 것, 배포 · 출시를 판단하는 것, 코드를 읽고 원인을 확정하는 것은 네 몫이 아니다.',
    화면: '결과는 안정화 지표 화면의 「AI 실행 요약」 판과 오류 상세의 AI 요약으로 보인다.',
    점검: [
      'changes · errors 의 errorId 가 모두 재료 errors 에 있고 state 가 ONGOING 인 번호가 없는가',
      'features 의 tcIds 가 모두 재료 cases 에 있는가',
      '배포 · 출시를 판단하는 말이 없는가',
      '글 안의 숫자가 모두 재료에 있는 숫자인가',
      '글 칸마다 120자 안인가',
    ],
    규칙: [
      '재료는 한 애플리케이션 · 대상 서버의 정기 실행 한 묶음을 admin 이 집계한 것이다. numbers 는 이번 실행, previous 는 같은 대상 서버의 바로 앞 실행(없으면 null), errors 는 이번 실행에 남은 오류 종류, confirmed 는 이번 실행에서 해결 확인된 종류, trend 는 최근 7일 점, cases 는 이번 실행의 케이스 번호와 이름이다.',
      'errors 의 state 는 NEW(신규) · UP(증가) · REOPENED(재발) · ONGOING(기존)이다. occurrences 의 seq 는 오류가 난 단계 번호다. sample 은 로그 견본 앞부분이고 resolvedAt 은 사람이 해결 처리한 시각이다.',
      '개조식으로 짧게 쓴다. 글 칸마다 120자 안이다.',
      'headline 은 이번 실행을 한 줄로 말한다. errors 가 비었으면 오류가 없었다고 쓴다.',
      'changes 는 state 가 NEW · UP · REOPENED 인 종류 중 눈여겨볼 것 많아야 5개다. errorId 는 재료 번호를 그대로 쓰고, text 는 무엇이 어디서 났는지 한 줄이다. 상태는 화면이 칩으로 달아 text 에 다시 쓰지 않는다.',
      'features 는 cases 의 이름을 보고 기능(로그인 · 장바구니 · 결제처럼)으로 묶은 것 많아야 8개다. tcIds 는 cases 의 번호를 그대로 쓴다. 오류 발생 케이스 수는 admin 이 세니 이름에 숫자를 넣지 않는다. 오류가 난 케이스가 든 기능을 앞에 둔다.',
      'verified 는 confirmed 를 한 줄로 쓴다. 비었으면 해결 확인된 오류가 없다고 쓴다. trend 는 trend 점의 잔여 오류 흐름을 한 줄로 쓴다. 점이 하나뿐이면 견줄 점이 없다고 쓴다.',
      'errors 는 state 가 NEW · UP · REOPENED 인 종류마다 하나씩 낸다. headline 은 무슨 오류인지, impact 는 발생 케이스 · 단계로 본 영향, previous 는 previousCases · firstDay · resolvedAt 으로 본 이전 실행과의 차이, cause 는 sample 로 본 원인 추정이다.',
      'cause 는 추정만 쓴다. 코드를 읽지 않았으니 「~로 보입니다」처럼 쓰고 단정하지 않는다. sample 에 단서가 없으면 견본만으로는 원인을 짐작하기 어렵다고 쓴다.',
      '「출시해도 됩니다」 · 「배포 가능」 · 「배포 보류」처럼 배포 · 출시를 판단하는 말을 쓰지 않는다. 판단은 사람이 한다.',
      '글 안의 숫자는 재료에 있는 것만 옮긴다. 더하거나 빼거나 비율을 새로 계산하지 않는다.',
      'truncated · occurrencesTruncated 가 true 면 재료가 상한에서 잘렸다.',
    ],
    모양: '{ "headline": 문자열, "changes": [{ "errorId": 정수, "text": 문자열 }], "features": [{ "name": 문자열, "tcIds": 문자열[] }], "verified": 문자열, "trend": 문자열, "errors": [{ "errorId": 정수, "headline": 문자열, "impact": 문자열, "previous": 문자열, "cause": 문자열 }] }',
  },
  // QA 리포트 첫 장의 남은 리스크 — 이 일만 MCP 읽기 도구 셋을 연다 (도메인/리포팅 §3.17 「남은 리스크 — AI」)
  REPORT_RISK: {
    역할: '너는 Test Commander QA 리포트 뒤에서 도는 도우미다. QA 엔지니어의 눈으로 빌드 하나의 QA 리포트 첫 장 재료를 보고 「남은 리스크」를 쓴다. 숫자를 세는 것, 실패를 결함 · 테스트 문제로 가르는 것, 배포 · 출시를 판단하는 것은 네 몫이 아니다.',
    화면: '결과는 QA 리포트 첫 장 「남은 리스크」 칸에 「AI 작성」 표시와 함께 보이고 PDF · 워드에도 실린다. 감사인 · QA · 개발이 읽고, 사람이 고칠 수 있다.',
    점검: [
      'refs 가 모두 재료나 도구 결과에서 본 번호인가',
      '배포 · 출시를 판단하는 말이 없는가',
      '글 안의 숫자가 모두 재료에 있는 숫자인가',
      'text 마다 120자 안이고 묶음마다 5줄 안인가',
    ],
    규칙: [
      '재료 summary 는 admin 이 센 첫 장이다. results 는 결과 요약(functional 은 기능 · UI · E2E, nonFunctional 은 호환성 · 성능 · 안정화이고 result 가 null 이면 그 종류 실행이 없다), changes 는 앞 빌드 대비 변경 사항, plan 은 계획 대비 안 돈 것, failures 는 실패 분류(PRODUCT 제품 결함 · TEST 테스트 문제 · ENV 환경 · UNCLASSIFIED 판정이 필요한 실패), previous 는 견준 앞 빌드다. stability.errors 는 이 빌드의 신규 · 증가 · 재발 오류 종류다. truncated 가 true 면 배열이 100개에서 잘렸다.',
      'functional 은 기능 · UI · E2E 실패, 판정이 필요한 실패, 계획 대비 안 돈 것, 변경 사항(기대 결과가 바뀐 테스트 · 바뀐 요구사항 · 테스트가 확인하지 않은 제품 변경)에서 나온 리스크다.',
      'nonFunctional 은 호환성 의심 화면, 성능 목표 미달, 안정화(판정은 통과했지만 오류가 난 케이스 · 신규 · 재발 오류)에서 나온 리스크다.',
      '리스크마다 한 줄로 쓰고 큰 것부터 묶음마다 많아야 5줄이다. refs 에 근거가 된 케이스 번호 · Issue Bunker 이슈 키 · 실행 번호(「RUN 123」 꼴)를 단다. refs 는 admin 이 줄 끝에 괄호로 붙이니 text 에 다시 쓰지 않는다.',
      '묶음에 쓸 것이 없으면 빈 배열로 둔다. admin 이 「확인된 리스크 없음」을 적는다.',
      'MCP 도구(qa-hub)가 열려 있으면 근거를 확인할 때만 쓴다 — map_search(service: 재료 service, tcId) 로 실패 케이스가 덮는 요구를, run_result(runId) 로 실패 단계 · 오류를, bts_search(projectId: 재료 projectId, issueKey) 로 이슈 제목 · 상태를 본다. btsLinked 가 false 면 bts_search 를 부르지 않는다. 열 번 안쪽으로 부르고, 도구가 없거나 거절하면 재료만으로 쓴다.',
      '원인은 단정하지 않는다. 코드를 읽지 않았으니 「~로 보입니다」처럼 쓴다.',
      '「배포 가능」 · 「배포 보류」 · 「출시해도 됩니다」 · go/no-go 처럼 배포 · 출시를 판단하는 말을 쓰지 않는다. 판단은 사람이 승인 칸에서 한다.',
      '글 안의 숫자는 재료에 있는 것만 옮긴다. 더하거나 빼거나 비율을 새로 계산하지 않는다.',
    ],
    모양: '{ "functional": [{ "text": 문자열, "refs": 문자열[] }], "nonFunctional": [{ "text": 문자열, "refs": 문자열[] }] }',
    예: '{ "functional": [{ "text": "결제 실패 2건이 아직 판정 전이라 결함인지 테스트 문제인지 모릅니다", "refs": ["DMK-FN-012", "DMK-FN-013"] }], "nonFunctional": [] }',
  },
  // 프로젝트 QA 리포트의 지난 리포트 대비 리스크 — 같은 REPORT_RISK 일에 projectReportId 가 실려 온다 (도메인/리포팅 §3.17 「프로젝트 QA 리포트」)
  REPORT_RISK_PROJECT: {
    역할: '너는 Test Commander 프로젝트 QA 리포트 뒤에서 도는 도우미다. QA 엔지니어의 눈으로 프로젝트 하나의 기간 상태 숫자를 보고, 지난 프로젝트 리포트와 견줘 새로 생기거나 바뀐 리스크를 쓴다. 숫자를 세는 것, 배포 · 출시를 판단하는 것은 네 몫이 아니다.',
    화면: '결과는 프로젝트 QA 리포트 「지난 리포트 대비 리스크」 칸에 「AI 작성」 표시와 함께 보이고 PDF · 워드에도 실린다. PM · 경영진이 읽고, 사람이 고칠 수 있다.',
    점검: [
      'refs 가 모두 재료나 도구 결과에서 본 번호인가',
      '배포 · 출시를 판단하는 말이 없는가',
      '글 안의 숫자가 모두 재료에 있는 숫자인가',
      '줄마다 「신규」 · 「계속」 · 「해소」 가운데 하나로 시작하는가',
    ],
    규칙: [
      '재료 body 는 admin 이 센 이번 기간 숫자다. apps 는 애플리케이션마다 기간 안 판정(runs) · 회귀 실패(newFailures) · 마지막 애플리케이션 리포트 결과 요약(last.results — functional 은 기능 · UI · E2E, nonFunctional 은 호환성 · 성능 · 안정화) · 열린 결함, deploys 는 배포, changes 는 배포에 든 변경과 확인한 수, coverage 는 요구사항 커버리지, defects 는 결함 추이, nonFunctional 은 성능 목표 판정 · 안정화(passErrorCases 는 판정은 통과했지만 오류가 난 케이스), blocked 는 멈춘 실행 · 준비 실패 · 성능 오류다. previous 는 지난 프로젝트 리포트의 숫자와 그때 쓴 리스크 글(risks)이고 null 이면 처음 리포트다. truncated 가 true 면 배열이 100개에서 잘렸다.',
      '줄마다 지난 리포트 대비 상태를 글 맨 앞에 쓴다 — 「신규 · 」(이번에 처음 보인 것) · 「계속 · 」(지난번에도 있던 것) · 「해소 · 」(지난 리포트 risks 에 있었는데 이번 숫자로는 사라진 것). previous 가 null 이면 모두 「신규 · 」다.',
      'functional 은 기능 · UI · E2E 실패 · 회귀 실패 · 확인하지 못한 변경 · 커버리지 하락 · 막힌 것에서 나온 리스크다. nonFunctional 은 호환성 의심 · 성능 목표 미달 · 안정화(판정은 통과했지만 오류가 난 케이스 · 크래시 · 신규 · 재발 오류)에서 나온 리스크다.',
      '리스크마다 한 줄로 쓰고 큰 것부터 묶음마다 많아야 5줄이다. refs 에 애플리케이션 접두사 · 빌드 번호 · Issue Bunker 이슈 키 · 실행 번호(「RUN 123」 꼴)를 단다. refs 는 admin 이 줄 끝에 괄호로 붙이니 text 에 다시 쓰지 않는다.',
      '묶음에 쓸 것이 없으면 빈 배열로 둔다. admin 이 「확인된 리스크 없음」을 적는다.',
      'MCP 도구(qa-hub)가 열려 있으면 근거를 확인할 때만 쓴다 — run_result(runId) 로 실패 단계 · 오류를, bts_search(projectId: 재료 projectId, issueKey) 로 이슈 제목 · 상태를 본다. btsLinked 가 false 면 bts_search 를 부르지 않는다. 열 번 안쪽으로 부르고, 도구가 없거나 거절하면 재료만으로 쓴다.',
      '원인은 단정하지 않는다. 「~로 보입니다」처럼 쓴다.',
      '「배포 가능」 · 「배포 보류」 · 「출시해도 됩니다」 · go/no-go 처럼 배포 · 출시를 판단하는 말을 쓰지 않는다. 판단은 사람이 한다.',
      '글 안의 숫자는 재료에 있는 것만 옮긴다. 더하거나 빼거나 비율을 새로 계산하지 않는다.',
    ],
    모양: '{ "functional": [{ "text": 문자열, "refs": 문자열[] }], "nonFunctional": [{ "text": 문자열, "refs": 문자열[] }] }',
    예: '{ "functional": [{ "text": "신규 · 웹 결제 회귀 실패 2건이 이번 기간에 처음 나왔습니다", "refs": ["DMW", "빌드 124"] }], "nonFunctional": [{ "text": "계속 · API 95% 응답 시간 목표 미달이 지난 기간에 이어 남았습니다", "refs": ["DMA"] }] }',
  },
};

/** 종류마다 프롬프트를 만든다. 모르는 종류는 null — 부르는 쪽이 error 로 끝낸다 */
export function 성능프롬프트(kind: string, input: unknown): string | null {
  // 프로젝트 리포트의 리스크 일은 종류가 같고 재료가 다르다 — 재료에 프로젝트 리포트 번호가 있으면 그 판을 쓴다
  const 프로젝트인가 = kind === 'REPORT_RISK' && typeof (input as { projectReportId?: unknown } | null)?.projectReportId === 'number';
  const 하나 = 종류별[프로젝트인가 ? 'REPORT_RISK_PROJECT' : kind];
  if (하나 === undefined) return null;
  const 모양글 = kind.startsWith('DRAFT_') ? `\n${트랜잭션모양}\n` : '\n';
  return [
    하나.역할 ?? 성능역할,
    하나.화면,
    제품이름,
    답꼴,
    `\n[규칙]\n${하나.규칙.map((r) => `- ${r}`).join('\n')}`,
    `- ${자료는자료('재료')}`,
    `- ${비밀값}`,
    '',
    ...말투('합니다', '이름 · 근거 · 메모 · 분석처럼 사람이 읽는 글 칸은 화면에 그대로 보인다.'),
    `\n[내는 모양]${모양글}${하나.모양}`,
    ...(하나.예 === undefined ? [] : [`예: ${하나.예}`]),
    '',
    ...끝점검([...공통점검, ...(하나.점검 ?? [])]),
    `\n[재료]\n${JSON.stringify(input)}`,
  ].join('\n');
}

/** claude 답에서 첫 `{` 부터 마지막 `}` 까지 잘라 읽는다. 앞뒤 글 · 코드 울타리는 버린다. 못 읽으면 null */
export function 답에서JSON(글: string): Record<string, unknown> | null {
  const 앞 = 글.indexOf('{');
  const 뒤 = 글.lastIndexOf('}');
  if (앞 < 0 || 뒤 < 앞) return null;
  try {
    const 값: unknown = JSON.parse(글.slice(앞, 뒤 + 1));
    return typeof 값 === 'object' && 값 !== null && !Array.isArray(값) ? (값 as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
