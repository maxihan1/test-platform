# ARI 요구별 케이스 목록

**덮는 범위** — 원장: 요구 406 → 케이스 386 · 제외 20(사람이 뺌 4 · 계정 미등록 1 · 환경 한계 10 · 만들 수 없는 응답 5) · 빠짐 0 · 번호 가족 ARI-REQ 267 · API 139

## 요구사항

| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |
|------|----|------|------|------|------|------|----------|
| 1 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/summary 를 부른다 | 고정 운영 키로 GET /opsapi/summary 를 부르면 200 이다 | ARI-REQ-004 | ARI-FN-004 | 2026-11-13 |
| 2 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 [QA] 공지를 만든 뒤 작업 기록을 그 제목으로 검색한다 | 고정 운영 키로 공지를 만들면 작업 기록의 운영자 칸이 qa-admin-key 다 | ARI-REQ-006 | ARI-FN-006 | 2026-11-13 |
| 3 | 예외 | 대상 서버에 접근할 수 있다 | 틀린 고정 운영 키로 GET /opsapi/summary 를 부른다 | 틀린 고정 운영 키로 GET /opsapi/summary 를 부르면 401 이다 | ARI-REQ-007 · 보류 — 키 헤더 이름을 케이스에 적을 수 없음 | ARI-FN-492 | 2026-11-13 |
| 4 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 POST /api/getallplayercharacters 를 부른다 | 고정 운영 키로 /api 데이터 API 를 부르면 401 이다 | ARI-REQ-009 | ARI-FN-011 | 2026-11-13 |
| 5 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/me 를 부른다 | 고정 운영 키로 GET /opsapi/me 를 부르면 401 이다 | ARI-REQ-010 · API GET /opsapi/me 401 | ARI-FN-013 | 2026-11-13 |
| 6 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」으로 POST /api/login 을 불러 받은 토큰 본문을 읽는다 | 「일반 회원」으로 로그인해 받은 게임 계정 토큰을 열면 id 가 응답의 accountId 와 같다 | ARI-REQ-012 | ARI-FN-016 | 2026-11-13 |
| 7 | 정상 | 「운영자」 계정이 있다 | 「운영자」로 POST /opsapi/login 을 불러 받은 토큰 본문을 읽는다 | 「운영자」로 로그인해 받은 운영자 토큰을 열면 operatorId 와 operatorName 이 들어 있다 | ARI-REQ-013 | ARI-FN-017 | 2026-11-13 |
| 8 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 게임 계정 토큰으로 POST /api/getguilds 를 부른다 | 게임 계정 토큰으로 /api 데이터 API 를 부르면 401 과 본문 「invalid shared secret」이다 | ARI-REQ-014 | ARI-FN-019 | 2026-11-13 |
| 9 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 게임 계정 토큰으로 GET /opsapi/summary 를 부른다 | 게임 계정 토큰으로 /opsapi/* 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-017 | ARI-FN-024 | 2026-11-13 |
| 10 | 예외 | 「운영자」 계정이 있다 | 「운영자」 토큰으로 POST /api/getguilds 를 부른다 | 운영자 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-020 | ARI-FN-029 | 2026-11-13 |
| 11 | 정상 | 「운영자」 계정이 있다 | 「운영자」 토큰으로 GET /opsapi/summary 를 부른다 | 운영자 토큰으로 GET /opsapi/summary 를 부르면 200 이다 | ARI-REQ-021 | ARI-FN-030 | 2026-11-13 |
| 12 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」으로 POST /api/login 을 부른다 | 「일반 회원」으로 POST /api/login 을 부르면 응답에 Set-Cookie 헤더가 붙는다 | ARI-REQ-024 | ARI-FN-034 | 2026-11-13 |
| 13 | 예외 | 「두 번째 플레이어」 계정이 있다 | 정지를 건 「두 번째 플레이어」로 POST /api/login 을 부른다 | 정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 응답에도 Set-Cookie 헤더가 붙는다 | ARI-REQ-025 | ARI-FN-493 | 2026-11-13 |
| 14 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 점검을 켠 채 「두 번째 플레이어」로 POST /api/login 을 부른다 | 점검 중 503 응답에도 Set-Cookie 헤더가 붙는다 | ARI-REQ-025 | ARI-FN-493 | 2026-11-13 |
| 15 | 정상 | 「일반 회원」 계정이 있다 | POST /api/login 에 필드 이름을 소문자 username · password 로 보낸다 | POST /api/login 에 필드 이름을 소문자로 보내면 200 이다 | ARI-REQ-026 | ARI-FN-036 | 2026-11-13 |
| 16 | 정상 | 「일반 회원」 계정이 있다 | 대문자 경로 /API/LOGIN 으로 로그인 요청을 보낸다 | 대문자 경로 /API/LOGIN 으로 로그인을 부르면 200 이다 | ARI-REQ-027 | ARI-FN-037 | 2026-11-13 |
| 17 | 예외 | 대상 서버에 접근할 수 있다 | POST /api/login 에 text/plain 본문을 보낸다 | POST /api/login 에 JSON 이 아닌 본문을 보내면 415 다 | ARI-REQ-028 | ARI-FN-494 | 2026-11-13 |
| 18 | 예외 | 대상 서버에 접근할 수 있다 | POST /api/login 에 깨진 JSON 을 보낸다 | POST /api/login 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다 | ARI-REQ-029 · API POST /api/login 400 | ARI-FN-040 | 2026-11-13 |
| 19 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 [QA] 공지를 만든다 | 운영자 API 로 공지를 만들면 응답의 createdAt 끝에 Z 가 붙는다 | ARI-REQ-030 | ARI-FN-041 | 2026-11-13 |
| 20 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」으로 POST /api/login 을 불러 응답 필드 이름을 읽는다 | POST /api/login 응답을 받으면 필드 이름이 camelCase 인 accountId · token 이다 | ARI-REQ-032 | ARI-FN-043 | 2026-11-13 |
| 21 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getguilds 를 부른다 | 토큰 없이 POST /api/getguilds 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getguilds 401 | ARI-FN-045 | 2026-11-13 |
| 22 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/saveguild 를 부른다 | 토큰 없이 부른 POST /api/saveguild 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/saveguild 401 | ARI-FN-045 | 2026-11-13 |
| 23 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/createguild 를 부른다 | 토큰 없이 부른 POST /api/createguild 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/createguild 401 | ARI-FN-045 | 2026-11-13 |
| 24 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/deleteguild 를 부른다 | 토큰 없이 부른 POST /api/deleteguild 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/deleteguild 401 | ARI-FN-045 | 2026-11-13 |
| 25 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getfriendlists 를 부른다 | 토큰 없이 부른 POST /api/getfriendlists 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getfriendlists 401 | ARI-FN-045 | 2026-11-13 |
| 26 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getmailmessage 를 부른다 | 토큰 없이 부른 POST /api/getmailmessage 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getmailmessage 401 | ARI-FN-045 | 2026-11-13 |
| 27 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/savefriendlist 를 부른다 | 토큰 없이 부른 POST /api/savefriendlist 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/savefriendlist 401 | ARI-FN-045 | 2026-11-13 |
| 28 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getauctionitems 를 부른다 | 토큰 없이 부른 POST /api/getauctionitems 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getauctionitems 401 | ARI-FN-045 | 2026-11-13 |
| 29 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getmailmessages 를 부른다 | 토큰 없이 부른 POST /api/getmailmessages 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getmailmessages 401 | ARI-FN-045 | 2026-11-13 |
| 30 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/saveauctionitem 를 부른다 | 토큰 없이 부른 POST /api/saveauctionitem 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/saveauctionitem 401 | ARI-FN-045 | 2026-11-13 |
| 31 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/savemailmessage 를 부른다 | 토큰 없이 POST /api/savemailmessage 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/savemailmessage 401 | ARI-FN-495 | 2026-11-13 |
| 32 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getiteminstances 를 부른다 | 토큰 없이 부른 POST /api/getiteminstances 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getiteminstances 401 | ARI-FN-495 | 2026-11-13 |
| 33 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/saveiteminstance 를 부른다 | 토큰 없이 부른 POST /api/saveiteminstance 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/saveiteminstance 401 | ARI-FN-495 | 2026-11-13 |
| 34 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/createauctionitem 를 부른다 | 토큰 없이 부른 POST /api/createauctionitem 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/createauctionitem 401 | ARI-FN-495 | 2026-11-13 |
| 35 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/createmailmessage 를 부른다 | 토큰 없이 부른 POST /api/createmailmessage 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/createmailmessage 401 | ARI-FN-495 | 2026-11-13 |
| 36 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/deleteauctionitem 를 부른다 | 토큰 없이 부른 POST /api/deleteauctionitem 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/deleteauctionitem 401 | ARI-FN-495 | 2026-11-13 |
| 37 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/deletemailmessage 를 부른다 | 토큰 없이 부른 POST /api/deletemailmessage 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/deletemailmessage 401 | ARI-FN-495 | 2026-11-13 |
| 38 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/createiteminstance 를 부른다 | 토큰 없이 부른 POST /api/createiteminstance 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/createiteminstance 401 | ARI-FN-495 | 2026-11-13 |
| 39 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/deleteiteminstance 를 부른다 | 토큰 없이 부른 POST /api/deleteiteminstance 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/deleteiteminstance 401 | ARI-FN-495 | 2026-11-13 |
| 40 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getplayercharacters 를 부른다 | 토큰 없이 부른 POST /api/getplayercharacters 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getplayercharacters 401 | ARI-FN-495 | 2026-11-13 |
| 41 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/saveplayercharacter 를 부른다 | 토큰 없이 POST /api/saveplayercharacter 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/saveplayercharacter 401 | ARI-FN-496 | 2026-11-13 |
| 42 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/createplayercharacter 를 부른다 | 토큰 없이 부른 POST /api/createplayercharacter 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/createplayercharacter 401 | ARI-FN-496 | 2026-11-13 |
| 43 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/deleteplayercharacter 를 부른다 | 토큰 없이 부른 POST /api/deleteplayercharacter 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/deleteplayercharacter 401 | ARI-FN-496 | 2026-11-13 |
| 44 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getallplayercharacters 를 부른다 | 토큰 없이 부른 POST /api/getallplayercharacters 응답은 401 이고 본문이 비어 있다 | ARI-REQ-033 · API POST /api/getallplayercharacters 401 | ARI-FN-496 | 2026-11-13 |
| 45 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 토큰의 서명을 변경해 POST /api/getguilds 를 부른다 | 서명이 틀린 토큰으로 /api 데이터 API 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-034 | ARI-FN-047 | 2026-11-13 |
| 46 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getguilds 를 불러 응답 헤더를 읽는다 | 토큰 없이 /api 데이터 API 를 부르면 401 응답에 WWW-Authenticate: Bearer 헤더가 붙는다 | ARI-REQ-035 | ARI-FN-497 | 2026-11-13 |
| 47 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 제목이 빈 공지를 만든다 | 운영자 API 에 제목이 빈 공지를 보내면 400 과 { code, message } JSON 본문이 돌아온다 | ARI-REQ-038 | ARI-FN-054 | 2026-11-13 |
| 48 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 없는 공지 번호를 수정한다 | 없는 공지 번호일 때 404 와 { code, message } JSON 본문이다 | ARI-REQ-038 | ARI-FN-054 | 2026-11-13 |
| 49 | 예외 | 「두 번째 플레이어」 계정이 있다 | 같은 지급을 두 번 회수한다 | 이미 회수한 지급을 다시 회수할 때 409 와 { code, message } JSON 본문이다 | ARI-REQ-038 | ARI-FN-054 | 2026-11-13 |
| 50 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」 아이디와 비밀번호로 POST /api/login 을 부른다 | 「일반 회원」의 맞는 아이디와 비밀번호로 POST /api/login 을 부르면 200 과 accountId · token 이 돌아온다 | ARI-REQ-039 · API POST /api/login 200 | ARI-FN-055 | 2026-11-13 |
| 51 | 예외 | 대상 서버에 접근할 수 있다 | 없는 아이디로 POST /api/login 을 부른다 | 없는 아이디로 POST /api/login 을 부르면 401 이고 본문이 비어 있다 | ARI-REQ-041 · API POST /api/login 401 | ARI-FN-058 | 2026-11-13 |
| 52 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원 아이디와 틀린 비밀번호로 POST /api/login 을 부른다 | 틀린 비밀번호로 POST /api/login 을 부르면 401 이고 본문이 비어 있다 | ARI-REQ-042 | ARI-FN-060 | 2026-11-13 |
| 53 | 예외 | 대상 서버에 접근할 수 있다 | 틀린 공유 비밀로 POST /api/serverlogin 을 부른다 | 틀린 공유 비밀로 POST /api/serverlogin 을 부르면 400 과 본문 「Invalid password」다 | ARI-REQ-043 · API POST /api/serverlogin 400 | ARI-FN-062 | 2026-11-13 |
| 54 | 예외 | 대상 서버에 접근할 수 있다 | 빈 아이디로 POST /api/login 을 부른다 | 빈 아이디로 POST /api/login 을 부르면 401 이다 | ARI-REQ-044 | ARI-FN-064 | 2026-11-13 |
| 55 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원 아이디와 빈 비밀번호로 POST /api/login 을 부른다 | 비밀번호가 빈 문자열일 때도 POST /api/login 은 401 이다 | ARI-REQ-044 | ARI-FN-064 | 2026-11-13 |
| 56 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 틀린 비밀번호로 여러 번 부른 뒤 맞는 비밀번호로 POST /api/login 을 부른다 | 틀린 비밀번호로 여러 번 부른 뒤 맞는 비밀번호로 POST /api/login 을 부르면 200 이다 | ARI-REQ-045 | ARI-FN-066 | 2026-11-13 |
| 57 | 예외 | 「두 번째 플레이어」 계정이 있다 | 정지를 건 「두 번째 플레이어」 아이디와 비밀번호로 POST /api/login 을 부른다 | 정지된 「두 번째 플레이어」로 POST /api/login 을 부르면 403 과 code SUSPENDED · 제재 사유 · until null 이 돌아온다 | ARI-REQ-046 · API POST /api/login 403 | ARI-FN-068 | 2026-11-13 |
| 58 | 예외 | 「두 번째 플레이어」 계정이 있다 | 정지된 「두 번째 플레이어」 아이디와 틀린 비밀번호로 POST /api/login 을 부른다 | 정지된 계정에 틀린 비밀번호로 POST /api/login 을 부르면 401 이다 | ARI-REQ-047 | ARI-FN-070 | 2026-11-13 |
| 59 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 점검 중 「두 번째 플레이어」 아이디와 틀린 비밀번호로 POST /api/login 을 부른다 | 점검 중 틀린 비밀번호일 때도 POST /api/login 은 401 이다 | ARI-REQ-047 | ARI-FN-070 | 2026-11-13 |
| 60 | 예외 | 「두 번째 플레이어」 계정이 있다 | 점검을 켠 채 「두 번째 플레이어」 아이디와 비밀번호로 POST /api/login 을 부른다 | 점검 중 허용 목록에 없는 「두 번째 플레이어」로 POST /api/login 을 부르면 503 과 code MAINTENANCE · 점검 문구가 돌아온다 | ARI-REQ-048 · API POST /api/login 503 | ARI-FN-072 | 2026-11-13 |
| 61 | 예외 | 「두 번째 플레이어」 계정이 있다 | 정지와 점검을 같이 건 채 「두 번째 플레이어」로 POST /api/login 을 부른다 | 정지와 점검이 같이 걸린 「두 번째 플레이어」로 POST /api/login 을 부르면 403 SUSPENDED 다 | ARI-REQ-049 | ARI-FN-498 | 2026-11-13 |
| 62 | 정상 | 대상 서버에 접근할 수 있다 | 인증 없이 GET /api/serverstatus 를 부른다 | 인증 없이 GET /api/serverstatus 를 부르면 200 과 maintenance · notices · serverTime 이 돌아온다 | ARI-REQ-110 · API GET /api/serverstatus 200 | ARI-FN-149 | 2026-11-13 |
| 63 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 시작을 1분 전 · 끝을 10분 뒤로 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 점검을 켜고 지금이 시작과 끝 사이면 maintenance.active 가 참이다 | ARI-REQ-111 | ARI-FN-150 | 2026-11-13 |
| 64 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 시작을 10분 뒤로 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 시작을 10분 뒤로 점검을 켜면 maintenance.active 가 거짓이다 | ARI-REQ-111 | ARI-FN-499 | 2026-11-13 |
| 65 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 끝이 지난 시각으로 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 끝이 지난 시각일 때도 maintenance.active 는 거짓이다 | ARI-REQ-111 | ARI-FN-499 | 2026-11-13 |
| 66 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 시작과 끝을 비우고 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 시작과 끝을 비우고 점검을 켜면 maintenance.active 가 참이다 | ARI-REQ-112 | ARI-FN-151 | 2026-11-13 |
| 67 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 문구와 기간을 넣어 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 문구와 기간을 넣어 점검을 켜면 maintenance.message · startsAt · endsAt 이 넣은 값과 같다 | ARI-REQ-113 | ARI-FN-152 | 2026-11-13 |
| 68 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 기간 없이 점검을 켠 뒤 GET /api/serverstatus 를 부른다 | 기간 없이 켰을 때 maintenance.startsAt 과 endsAt 은 null 이다 | ARI-REQ-113 | ARI-FN-152 | 2026-11-13 |
| 69 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 켜져 있고 기간 안인 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다 | 켜져 있고 기간 안인 공지를 만들면 serverstatus 의 notices 에 그 공지가 보인다 | ARI-REQ-114 | ARI-FN-153 | 2026-11-13 |
| 70 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 꺼진 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다 | 꺼진 공지를 만들면 serverstatus 의 notices 에 그 공지가 보이지 않는다 | ARI-REQ-114 | ARI-FN-500 | 2026-11-13 |
| 71 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 기간이 지난 [QA] 공지를 만든 뒤 GET /api/serverstatus 를 부른다 | 기간이 지난 공지일 때도 serverstatus 의 notices 에 보이지 않는다 | ARI-REQ-114 | ARI-FN-500 | 2026-11-13 |
| 72 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 시작이 다른 [QA] 공지 둘을 만든 뒤 GET /api/serverstatus 를 부른다 | 시작이 다른 공지 둘을 만들면 notices 에 시작이 늦은 것이 먼저 보인다 | ARI-REQ-115 | ARI-FN-154 | 2026-11-13 |
| 73 | 정상 | 대상 서버에 접근할 수 있다 | 인증 없이 GET /api/serverstatus 를 불러 serverTime 을 읽는다 | GET /api/serverstatus 를 부르면 serverTime 이 Z 로 끝나는 UTC 시각이다 | ARI-REQ-116 | ARI-FN-155 | 2026-11-13 |
| 74 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /api/getaccountrestrictions 를 부른다 | 토큰 없이 POST /api/getaccountrestrictions 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-121 · API POST /api/getaccountrestrictions 401 | ARI-FN-161 | 2026-11-13 |
| 75 | 예외 | 「일반 회원」 계정이 있다 | 서명을 변경한 토큰으로 POST /api/getaccountrestrictions 를 부른다 | 서명이 틀린 토큰일 때 getaccountrestrictions 는 401 이고 본문이 비어 있다 | ARI-REQ-121 | ARI-FN-161 | 2026-11-13 |
| 76 | 예외 | 「운영자」 계정이 있다 | 「운영자」 토큰으로 POST /api/getaccountrestrictions 를 부른다 | 운영자 토큰일 때 getaccountrestrictions 는 401 이고 본문이 비어 있다 | ARI-REQ-121 | ARI-FN-161 | 2026-11-13 |
| 77 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 게임 계정 토큰으로 POST /api/getaccountrestrictions 를 부른다 | 게임 계정 토큰으로 getaccountrestrictions 를 부르면 401 과 본문 「invalid shared secret」이다 | ARI-REQ-122 | ARI-FN-163 | 2026-11-13 |
| 78 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/summary 를 부른다 | 토큰 없이 GET /opsapi/summary 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/summary 401 | ARI-FN-166 | 2026-11-13 |
| 79 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/users 를 부른다 | 토큰 없이 부른 GET /opsapi/users 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/users 401 | ARI-FN-166 | 2026-11-13 |
| 80 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/users/{id} 를 부른다 | 토큰 없이 부른 GET /opsapi/users/{id} 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/users/{id} 401 | ARI-FN-166 | 2026-11-13 |
| 81 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /opsapi/users/{id}/sanctions 를 부른다 | 토큰 없이 부른 POST /opsapi/users/{id}/sanctions 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API POST /opsapi/users/{id}/sanctions 401 | ARI-FN-166 | 2026-11-13 |
| 82 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /opsapi/sanctions/{id}/release 를 부른다 | 토큰 없이 부른 POST /opsapi/sanctions/{id}/release 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API POST /opsapi/sanctions/{id}/release 401 | ARI-FN-166 | 2026-11-13 |
| 83 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/characters 를 부른다 | 토큰 없이 부른 GET /opsapi/characters 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/characters 401 | ARI-FN-166 | 2026-11-13 |
| 84 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/items/known 를 부른다 | 토큰 없이 부른 GET /opsapi/items/known 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/items/known 401 | ARI-FN-166 | 2026-11-13 |
| 85 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/grants 를 부른다 | 토큰 없이 부른 GET /opsapi/grants 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/grants 401 | ARI-FN-166 | 2026-11-13 |
| 86 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /opsapi/grants 를 부른다 | 토큰 없이 부른 POST /opsapi/grants 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API POST /opsapi/grants 401 | ARI-FN-166 | 2026-11-13 |
| 87 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /opsapi/grants/{id}/recall 를 부른다 | 토큰 없이 부른 POST /opsapi/grants/{id}/recall 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API POST /opsapi/grants/{id}/recall 401 | ARI-FN-166 | 2026-11-13 |
| 88 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/notices 를 부른다 | 토큰 없이 GET /opsapi/notices 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/notices 401 | ARI-FN-501 | 2026-11-13 |
| 89 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 POST /opsapi/notices 를 부른다 | 토큰 없이 부른 POST /opsapi/notices 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API POST /opsapi/notices 401 | ARI-FN-501 | 2026-11-13 |
| 90 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 PUT /opsapi/notices/{id} 를 부른다 | 토큰 없이 부른 PUT /opsapi/notices/{id} 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API PUT /opsapi/notices/{id} 401 | ARI-FN-501 | 2026-11-13 |
| 91 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 DELETE /opsapi/notices/{id} 를 부른다 | 토큰 없이 부른 DELETE /opsapi/notices/{id} 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API DELETE /opsapi/notices/{id} 401 | ARI-FN-501 | 2026-11-13 |
| 92 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/maintenance 를 부른다 | 토큰 없이 부른 GET /opsapi/maintenance 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/maintenance 401 | ARI-FN-501 | 2026-11-13 |
| 93 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 PUT /opsapi/maintenance 를 부른다 | 토큰 없이 부른 PUT /opsapi/maintenance 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API PUT /opsapi/maintenance 401 | ARI-FN-501 | 2026-11-13 |
| 94 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/logs/audit 를 부른다 | 토큰 없이 부른 GET /opsapi/logs/audit 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/logs/audit 401 | ARI-FN-501 | 2026-11-13 |
| 95 | 예외 | 대상 서버에 접근할 수 있다 | 토큰 없이 GET /opsapi/logs/items 를 부른다 | 토큰 없이 부른 GET /opsapi/logs/items 응답은 401 이고 본문이 비어 있다 | ARI-REQ-124 · API GET /opsapi/logs/items 401 | ARI-FN-501 | 2026-11-13 |
| 96 | 정상 | 「운영자」 계정이 있다 | 「운영자」 아이디와 비밀번호로 POST /opsapi/login 을 부른다 | 「운영자」 아이디와 비밀번호로 POST /opsapi/login 을 부르면 200 과 token · operator 가 돌아온다 | ARI-REQ-125 · API POST /opsapi/login 200 | ARI-FN-167 | 2026-11-13 |
| 97 | 예외 | 「운영자」 계정이 있다 | 「운영자」 아이디와 틀린 비밀번호로 POST /opsapi/login 을 부른다 | 틀린 비밀번호로 POST /opsapi/login 을 부르면 401 과 code UNAUTHORIZED · 「아이디 또는 비밀번호가 맞지 않습니다」가 돌아온다 | ARI-REQ-126 · API POST /opsapi/login 401 | ARI-FN-169 | 2026-11-13 |
| 98 | 예외 | 대상 서버에 접근할 수 있다 | 없는 아이디로 POST /opsapi/login 을 부른다 | 없는 아이디일 때도 POST /opsapi/login 은 401 과 code UNAUTHORIZED 다 | ARI-REQ-126 | ARI-FN-169 | 2026-11-13 |
| 99 | 정상 | 「운영자」 계정이 있다 | 「운영자」 토큰으로 GET /opsapi/me 를 부른다 | 「운영자」 토큰으로 GET /opsapi/me 를 부르면 그 운영자의 id · userName · displayName 이 돌아온다 | ARI-REQ-127 · API GET /opsapi/me 200 | ARI-FN-170 | 2026-11-13 |
| 100 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/summary 를 불러 숫자 칸을 읽는다 | 고정 운영 키로 GET /opsapi/summary 를 부르면 대시보드 숫자 여덟 칸이 돌아온다 | ARI-REQ-128 · API GET /opsapi/summary 200 | ARI-FN-171 | 2026-11-13 |
| 101 | 정상 | 「두 번째 플레이어」 계정이 있다 | q 에 「두 번째 플레이어」 아이디를 넣어 GET /opsapi/users 를 부른다 | q 에 「두 번째 플레이어」 아이디를 넣어 계정을 검색하면 items 에 그 계정이 보인다 | ARI-REQ-129 · API GET /opsapi/users 200 | ARI-FN-172 | 2026-11-13 |
| 102 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 0 으로 GET /opsapi/users 를 부른다 | size 0 으로 GET /opsapi/users 를 부르면 1건이 돌아온다 | ARI-REQ-130 | ARI-FN-502 | 2026-11-13 |
| 103 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 1 로 GET /opsapi/users 를 부른다 | size 1 일 때 GET /opsapi/users 는 1건이다 | ARI-REQ-130 | ARI-FN-502 | 2026-11-13 |
| 104 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 100 으로 GET /opsapi/users 를 부른다 | size 100 일 때 GET /opsapi/users 는 total 과 100 가운데 작은 수만큼이다 | ARI-REQ-130 | ARI-FN-502 | 2026-11-13 |
| 105 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 101 로 GET /opsapi/users 를 부른다 | size 101 일 때도 GET /opsapi/users 는 total 과 100 가운데 작은 수만큼이다 | ARI-REQ-130 | ARI-FN-502 | 2026-11-13 |
| 106 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/users 를 부른다 | GET /opsapi/users 를 부르면 계정 번호가 큰 것부터 보인다 | ARI-REQ-131 | ARI-FN-174 | 2026-11-13 |
| 107 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | page 0 으로 GET /opsapi/users 를 부른다 | page 0 으로 GET /opsapi/users 를 부르면 page 1 과 같은 목록이 돌아온다 | ARI-REQ-132 | ARI-FN-503 | 2026-11-13 |
| 108 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | page -1 로 GET /opsapi/users 를 부른다 | page -1 일 때도 GET /opsapi/users 는 page 1 과 같은 목록이다 | ARI-REQ-132 | ARI-FN-503 | 2026-11-13 |
| 109 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 계정 번호로 GET /opsapi/users/{id} 를 부른다 | 「두 번째 플레이어」 계정 번호로 계정 상세를 부르면 그 계정의 userName · characters · sanctions 가 돌아온다 | ARI-REQ-133 · API GET /opsapi/users/{id} 200 | ARI-FN-176 | 2026-11-13 |
| 110 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 넣어 CHAT_MUTE 제재를 건다 | 「두 번째 플레이어」에 CHAT_MUTE 제재를 걸면 type · reason · endsAt 이 넣은 값인 제재 한 건이 돌아온다 | ARI-REQ-134 · API POST /opsapi/users/{id}/sanctions 200 | ARI-FN-177 | 2026-11-13 |
| 111 | 정상 | 「두 번째 플레이어」 계정이 있다 | endsAt 없이 「두 번째 플레이어」에 CHAT_MUTE 제재를 건다 | endsAt 을 생략하고 제재를 걸면 돌아온 제재의 endsAt 이 null 이다 | ARI-REQ-135 | ARI-FN-178 | 2026-11-13 |
| 112 | 예외 | 「두 번째 플레이어」 계정이 있다 | type 을 BAN 으로 「두 번째 플레이어」에 제재를 건다 | type 을 SUSPEND · CHAT_MUTE 밖의 BAN 으로 제재를 걸면 400 INVALID 다 | ARI-REQ-136 | ARI-FN-504 | 2026-11-13 |
| 113 | 경계 | 「두 번째 플레이어」 계정이 있다 | 사유 0자로 「두 번째 플레이어」에 제재를 건다 | 사유 0자로 제재를 걸면 400 INVALID 다 | ARI-REQ-137 · API POST /opsapi/users/{id}/sanctions 400 | ARI-FN-181 | 2026-11-13 |
| 114 | 경계 | 「두 번째 플레이어」 계정이 있다 | 사유 1자로 「두 번째 플레이어」에 제재를 건다 | 제재 사유 1자일 때 200 으로 제재가 걸린다 | ARI-REQ-137 | ARI-FN-181 | 2026-11-13 |
| 115 | 경계 | 「두 번째 플레이어」 계정이 있다 | 사유 200자로 「두 번째 플레이어」에 제재를 건다 | 제재 사유 200자일 때 200 으로 제재가 걸린다 | ARI-REQ-137 | ARI-FN-181 | 2026-11-13 |
| 116 | 경계 | 「두 번째 플레이어」 계정이 있다 | 사유 201자로 「두 번째 플레이어」에 제재를 건다 | 제재 사유 201자일 때 400 INVALID 다 | ARI-REQ-137 | ARI-FN-181 | 2026-11-13 |
| 117 | 예외 | 「두 번째 플레이어」 계정이 있다 | endsAt 을 1분 전으로 「두 번째 플레이어」에 제재를 건다 | endsAt 을 지금보다 앞 시각으로 제재를 걸면 400 INVALID 다 | ARI-REQ-138 | ARI-FN-505 | 2026-11-13 |
| 118 | 예외 | 「두 번째 플레이어」 계정이 있다 | CHAT_MUTE 가 걸린 「두 번째 플레이어」에 CHAT_MUTE 를 한 번 더 건다 | CHAT_MUTE 가 걸린 계정에 CHAT_MUTE 를 한 번 더 걸면 409 ALREADY_ACTIVE 다 | ARI-REQ-139 · API POST /opsapi/users/{id}/sanctions 409 | ARI-FN-184 | 2026-11-13 |
| 119 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 계정 번호에 CHAT_MUTE 제재를 건다 | 없는 계정 번호에 제재를 걸면 404 다 | ARI-REQ-140 · API POST /opsapi/users/{id}/sanctions 404 | ARI-FN-186 | 2026-11-13 |
| 120 | 정상 | 「두 번째 플레이어」 계정이 있다 | 걸어 둔 CHAT_MUTE 제재를 사유를 적어 푼다 | 걸어 둔 제재를 사유를 적어 풀면 releasedAt · releasedBy · releaseReason 이 채워진 제재가 돌아온다 | ARI-REQ-141 · API POST /opsapi/sanctions/{id}/release 200 | ARI-FN-187 | 2026-11-13 |
| 121 | 경계 | 「두 번째 플레이어」 계정이 있다 | 해제 사유 0자로 제재를 푼다 | 해제 사유 0자로 제재를 풀면 400 INVALID 다 | ARI-REQ-142 · API POST /opsapi/sanctions/{id}/release 400 | ARI-FN-189 | 2026-11-13 |
| 122 | 경계 | 「두 번째 플레이어」 계정이 있다 | 해제 사유 1자로 제재를 푼다 | 해제 사유 1자일 때 200 으로 제재가 풀린다 | ARI-REQ-142 | ARI-FN-189 | 2026-11-13 |
| 123 | 경계 | 「두 번째 플레이어」 계정이 있다 | 해제 사유 200자로 제재를 푼다 | 해제 사유 200자일 때 200 으로 제재가 풀린다 | ARI-REQ-142 | ARI-FN-189 | 2026-11-13 |
| 124 | 경계 | 「두 번째 플레이어」 계정이 있다 | 해제 사유 201자로 제재를 푼다 | 해제 사유 201자일 때 400 INVALID 다 | ARI-REQ-142 | ARI-FN-189 | 2026-11-13 |
| 125 | 예외 | 「두 번째 플레이어」 계정이 있다 | 이미 푼 제재를 한 번 더 푼다 | 이미 푼 제재를 한 번 더 풀면 409 NOT_ACTIVE 다 | ARI-REQ-143 · API POST /opsapi/sanctions/{id}/release 409 | ARI-FN-191 | 2026-11-13 |
| 126 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 제재 번호를 푼다 | 없는 제재 번호를 풀면 404 다 | ARI-REQ-144 · API POST /opsapi/sanctions/{id}/release 404 | ARI-FN-193 | 2026-11-13 |
| 127 | 정상 | 「두 번째 플레이어」 계정이 있다 | q 에 「두 번째 플레이어」 캐릭터 이름을 넣어 GET /opsapi/characters 를 부른다 | 캐릭터 이름으로 GET /opsapi/characters 를 검색하면 그 캐릭터 요약이 보인다 | ARI-REQ-145 · API GET /opsapi/characters 200 | ARI-FN-194 | 2026-11-13 |
| 128 | 정상 | 「두 번째 플레이어」 계정이 있다 | q 에 「두 번째 플레이어」 캐릭터 번호를 넣어 GET /opsapi/characters 를 부른다 | 캐릭터 번호로 검색했을 때도 그 캐릭터 요약이 보인다 | ARI-REQ-145 | ARI-FN-194 | 2026-11-13 |
| 129 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | q 를 비워 GET /opsapi/characters 를 부른다 | q 를 비워 GET /opsapi/characters 를 부르면 이름 순으로 보인다 | ARI-REQ-146 | ARI-FN-195 | 2026-11-13 |
| 130 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 캐릭터가 50명일 때 GET /opsapi/characters 를 부른다 | 캐릭터가 50명일 때 GET /opsapi/characters 를 부르면 50명이 돌아온다 | ARI-REQ-147 · 보류 — 캐릭터가 51명 이상인 서버 상태 | 제거함(ARI-FN-506) | 2026-11-13 |
| 131 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 캐릭터가 51명일 때 GET /opsapi/characters 를 부른다 | 캐릭터가 51명일 때도 GET /opsapi/characters 는 50명까지만 돌아온다 | ARI-REQ-147 · 보류 — 캐릭터가 51명 이상인 서버 상태 | 제거함(ARI-FN-506) | 2026-11-13 |
| 132 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/items/known 을 부른다 | GET /opsapi/items/known 을 부르면 문자열 배열이 돌아온다 | ARI-REQ-148 · API GET /opsapi/items/known 200 | ARI-FN-198 | 2026-11-13 |
| 133 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터에 재화를 지급한 뒤 GET /opsapi/items/known 을 부른다 | 재화를 지급한 뒤 GET /opsapi/items/known 을 부르면 「System Currency Loot Item」이 보이지 않는다 | ARI-REQ-149 | ARI-FN-199 | 2026-11-13 |
| 134 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 아이템이 5,000건을 넘을 때 GET /opsapi/items/known 을 부른다 | 아이템이 5,000건을 넘을 때 GET /opsapi/items/known 을 부르면 최근 5,000건의 이름만 보인다 | ARI-REQ-150 · 보류 — 아이템이 5,000건을 넘는 서버 상태 | 제거함(ARI-FN-507) | 2026-11-13 |
| 135 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/grants 를 부른다 | GET /opsapi/grants 를 부르면 total 과 지급 건 목록 items 가 돌아온다 | ARI-REQ-151 · API GET /opsapi/grants 200 | ARI-FN-201 | 2026-11-13 |
| 136 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 0 으로 GET /opsapi/grants 를 부른다 | size 0 으로 GET /opsapi/grants 를 부르면 1건이 돌아온다 | ARI-REQ-152 | ARI-FN-508 | 2026-11-13 |
| 137 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 1 로 GET /opsapi/grants 를 부른다 | size 1 일 때 GET /opsapi/grants 는 1건이다 | ARI-REQ-152 | ARI-FN-508 | 2026-11-13 |
| 138 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 100 으로 GET /opsapi/grants 를 부른다 | size 100 일 때 GET /opsapi/grants 는 total 과 100 가운데 작은 수만큼이다 | ARI-REQ-152 | ARI-FN-508 | 2026-11-13 |
| 139 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 101 로 GET /opsapi/grants 를 부른다 | size 101 일 때도 GET /opsapi/grants 는 total 과 100 가운데 작은 수만큼이다 | ARI-REQ-152 | ARI-FN-508 | 2026-11-13 |
| 140 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터에 체력 물약 1개를 지급한다 | 「두 번째 플레이어」 캐릭터에 체력 물약 1개를 지급하면 지급 건 번호 id 가 돌아온다 | ARI-REQ-153 · API POST /opsapi/grants 200 | ARI-FN-203 | 2026-11-13 |
| 141 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터 하나에 지급한 뒤 GET /opsapi/grants 에서 그 지급 건을 찾는다 | 캐릭터 하나에 지급하면 그 지급 건 mails 에 우편 한 통이 보인다 | ARI-REQ-154 | ARI-FN-204 | 2026-11-13 |
| 142 | 정상 | 「두 번째 플레이어」 계정이 있다 | 게임 데이터에 없는 아이템 이름 「[QA] 없는 아이템」으로 지급한다 | 게임 데이터에 없는 아이템 이름으로 지급하면 200 이다 | ARI-REQ-155 | ARI-FN-205 | 2026-11-13 |
| 143 | 정상 | 「두 번째 플레이어」 계정이 있다 | 골드 10 을 지급한 뒤 GET /opsapi/logs/items 에서 그 지급 기록을 찾는다 | 재화를 넣어 지급하면 아이템 흐름 기록의 재화 이름이 「Gold」다 | ARI-REQ-157 | ARI-FN-207 | 2026-11-13 |
| 144 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터에 지급한 뒤 그 지급 건 mails 의 status 를 읽는다 | 지급하면 지급 건 mails[].status 가 SENT · TAKEN · RECALLED · PARTLY_RECALLED · DELETED_BY_PLAYER 가운데 하나다 | ARI-REQ-158 | ARI-FN-208 | 2026-11-13 |
| 145 | 경계 | 「두 번째 플레이어」 계정이 있다 | 받는 캐릭터 0명으로 지급한다 | 받는 캐릭터 0명으로 지급하면 400 INVALID 다 | ARI-REQ-159 · API POST /opsapi/grants 400 | ARI-FN-210 | 2026-11-13 |
| 146 | 경계 | 「두 번째 플레이어」 계정이 있다 | 받는 캐릭터 1명으로 지급한다 | 받는 캐릭터 1명일 때 200 으로 지급된다 | ARI-REQ-159 | ARI-FN-210 | 2026-11-13 |
| 147 | 경계 | 「두 번째 플레이어」 계정이 있다 | 같은 캐릭터 번호 50개로 지급한다 | 받는 캐릭터 번호 50개일 때 200 으로 지급된다 | ARI-REQ-159 | ARI-FN-210 | 2026-11-13 |
| 148 | 경계 | 「두 번째 플레이어」 계정이 있다 | 같은 캐릭터 번호 51개로 지급한다 | 받는 캐릭터 번호 51개일 때 400 INVALID 다 | ARI-REQ-159 | ARI-FN-210 | 2026-11-13 |
| 149 | 예외 | 「두 번째 플레이어」 계정이 있다 | 같은 캐릭터 번호를 두 번 넣어 지급한다 | 같은 캐릭터 번호를 두 번 넣어 지급하면 우편이 한 통만 생긴다 | ARI-REQ-160 | ARI-FN-212 | 2026-11-13 |
| 150 | 예외 | 「두 번째 플레이어」 계정이 있다 | 없는 캐릭터 번호를 섞어 지급한다 | 없는 캐릭터 번호를 섞어 지급하면 404 NOT_FOUND 다 | ARI-REQ-161 · API POST /opsapi/grants 404 | ARI-FN-214 | 2026-11-13 |
| 151 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 5종으로 지급한다 | 아이템 5종으로 지급하면 200 이다 | ARI-REQ-162 | ARI-FN-509 | 2026-11-13 |
| 152 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 6종으로 지급한다 | 아이템 6종일 때 400 INVALID 다 | ARI-REQ-162 | ARI-FN-509 | 2026-11-13 |
| 153 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 이름 0자로 지급한다 | 아이템 이름 0자로 지급하면 400 INVALID 다 | ARI-REQ-163 | ARI-FN-217 | 2026-11-13 |
| 154 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 이름 1자로 지급한다 | 아이템 이름 1자일 때 200 으로 지급된다 | ARI-REQ-163 | ARI-FN-217 | 2026-11-13 |
| 155 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 이름 100자로 지급한다 | 아이템 이름 100자일 때 200 으로 지급된다 | ARI-REQ-163 | ARI-FN-217 | 2026-11-13 |
| 156 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 이름 101자로 지급한다 | 아이템 이름 101자일 때 400 INVALID 다 | ARI-REQ-163 | ARI-FN-217 | 2026-11-13 |
| 157 | 경계 | 「두 번째 플레이어」 계정이 있다 | 수량 0 으로 지급한다 | 수량 0 으로 지급하면 400 INVALID 다 | ARI-REQ-164 | ARI-FN-510 | 2026-11-13 |
| 158 | 경계 | 「두 번째 플레이어」 계정이 있다 | 수량 1 로 지급한다 | 수량 1 일 때 200 으로 지급된다 | ARI-REQ-164 | ARI-FN-510 | 2026-11-13 |
| 159 | 경계 | 「두 번째 플레이어」 계정이 있다 | 수량 99 로 지급한다 | 수량 99 일 때 200 으로 지급된다 | ARI-REQ-164 | ARI-FN-510 | 2026-11-13 |
| 160 | 경계 | 「두 번째 플레이어」 계정이 있다 | 수량 100 으로 지급한다 | 수량 100 일 때 400 INVALID 다 | ARI-REQ-164 | ARI-FN-510 | 2026-11-13 |
| 161 | 경계 | 「두 번째 플레이어」 계정이 있다 | 재화 -1 로 지급한다 | 재화 -1 로 지급하면 400 INVALID 다 | ARI-REQ-165 | ARI-FN-511 | 2026-11-13 |
| 162 | 경계 | 「두 번째 플레이어」 계정이 있다 | 아이템 하나와 재화 0 으로 지급한다 | 재화 0 에 아이템이 하나 있을 때 200 으로 지급된다 | ARI-REQ-165 | ARI-FN-511 | 2026-11-13 |
| 163 | 경계 | 「두 번째 플레이어」 계정이 있다 | 재화 1,000,000 으로 지급한다 | 재화 1,000,000 일 때 200 으로 지급된다 | ARI-REQ-165 | ARI-FN-511 | 2026-11-13 |
| 164 | 경계 | 「두 번째 플레이어」 계정이 있다 | 재화 1,000,001 로 지급한다 | 재화 1,000,001 일 때 400 INVALID 다 | ARI-REQ-165 | ARI-FN-511 | 2026-11-13 |
| 165 | 예외 | 「두 번째 플레이어」 계정이 있다 | 아이템 없이 재화 0 으로 지급한다 | 아이템 없이 재화 0 으로 지급하면 400 INVALID 다 | ARI-REQ-166 | ARI-FN-512 | 2026-11-13 |
| 166 | 경계 | 「두 번째 플레이어」 계정이 있다 | 제목 0자로 지급한다 | 제목 0자로 지급하면 400 INVALID 다 | ARI-REQ-167 | ARI-FN-222 | 2026-11-13 |
| 167 | 경계 | 「두 번째 플레이어」 계정이 있다 | 제목 1자로 지급한다 | 지급 제목 1자일 때 200 으로 지급된다 | ARI-REQ-167 | ARI-FN-222 | 2026-11-13 |
| 168 | 경계 | 「두 번째 플레이어」 계정이 있다 | 제목 50자로 지급한다 | 지급 제목 50자일 때 200 으로 지급된다 | ARI-REQ-167 | ARI-FN-222 | 2026-11-13 |
| 169 | 경계 | 「두 번째 플레이어」 계정이 있다 | 제목 51자로 지급한다 | 지급 제목 51자일 때 400 INVALID 다 | ARI-REQ-167 | ARI-FN-222 | 2026-11-13 |
| 170 | 경계 | 「두 번째 플레이어」 계정이 있다 | 본문 500자로 지급한다 | 본문 500자로 지급하면 200 이다 | ARI-REQ-168 | ARI-FN-224 | 2026-11-13 |
| 171 | 경계 | 「두 번째 플레이어」 계정이 있다 | 본문 501자로 지급한다 | 지급 본문 501자일 때 400 INVALID 다 | ARI-REQ-168 | ARI-FN-224 | 2026-11-13 |
| 172 | 경계 | 「두 번째 플레이어」 계정이 있다 | 본문을 빈 문자열로 지급한다 | 지급 본문이 빈 문자열일 때 200 으로 지급된다 | ARI-REQ-168 | ARI-FN-224 | 2026-11-13 |
| 173 | 경계 | 「두 번째 플레이어」 계정이 있다 | 지급 사유 0자로 지급한다 | 지급 사유 0자로 지급하면 400 INVALID 다 | ARI-REQ-169 | ARI-FN-226 | 2026-11-13 |
| 174 | 경계 | 「두 번째 플레이어」 계정이 있다 | 지급 사유 1자로 지급한다 | 지급 사유 1자일 때 200 으로 지급된다 | ARI-REQ-169 | ARI-FN-226 | 2026-11-13 |
| 175 | 경계 | 「두 번째 플레이어」 계정이 있다 | 지급 사유 200자로 지급한다 | 지급 사유 200자일 때 200 으로 지급된다 | ARI-REQ-169 | ARI-FN-226 | 2026-11-13 |
| 176 | 경계 | 「두 번째 플레이어」 계정이 있다 | 지급 사유 201자로 지급한다 | 지급 사유 201자일 때 400 INVALID 다 | ARI-REQ-169 | ARI-FN-226 | 2026-11-13 |
| 177 | 정상 | 「두 번째 플레이어」 계정이 있다 | 지급한 건을 사유를 적어 회수한다 | 안 가져간 지급을 회수하면 recalled · partlyRecalled · alreadyTaken 우편 수가 돌아온다 | ARI-REQ-170 · API POST /opsapi/grants/{id}/recall 200 | ARI-FN-227 | 2026-11-13 |
| 178 | 정상 | 「두 번째 플레이어」 계정이 있다 | 하나도 안 가져간 지급을 회수한 뒤 그 지급 건을 찾는다 | 하나도 안 가져간 지급을 회수하면 recalled 가 1 이고 우편 상태가 RECALLED 다 | ARI-REQ-171 | ARI-FN-228 | 2026-11-13 |
| 179 | 경계 | 「두 번째 플레이어」 계정이 있다 | 회수 사유 0자로 회수한다 | 회수 사유 0자로 회수하면 400 INVALID 다 | ARI-REQ-173 · API POST /opsapi/grants/{id}/recall 400 | ARI-FN-231 | 2026-11-13 |
| 180 | 경계 | 「두 번째 플레이어」 계정이 있다 | 회수 사유 1자로 회수한다 | 회수 사유 1자일 때 200 으로 회수된다 | ARI-REQ-173 | ARI-FN-231 | 2026-11-13 |
| 181 | 경계 | 「두 번째 플레이어」 계정이 있다 | 회수 사유 200자로 회수한다 | 회수 사유 200자일 때 200 으로 회수된다 | ARI-REQ-173 | ARI-FN-231 | 2026-11-13 |
| 182 | 경계 | 「두 번째 플레이어」 계정이 있다 | 회수 사유 201자로 회수한다 | 회수 사유 201자일 때 400 INVALID 다 | ARI-REQ-173 | ARI-FN-231 | 2026-11-13 |
| 183 | 예외 | 「두 번째 플레이어」 계정이 있다 | 이미 회수한 지급을 한 번 더 회수한다 | 이미 회수한 지급을 한 번 더 회수하면 409 ALREADY_RECALLED 다 | ARI-REQ-174 · API POST /opsapi/grants/{id}/recall 409 | ARI-FN-233 | 2026-11-13 |
| 184 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 지급 번호를 회수한다 | 없는 지급 번호를 회수하면 404 다 | ARI-REQ-175 · API POST /opsapi/grants/{id}/recall 404 | ARI-FN-235 | 2026-11-13 |
| 185 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | [QA] 공지를 만든 뒤 GET /opsapi/notices 를 부른다 | 공지를 만든 뒤 GET /opsapi/notices 를 부르면 그 공지가 보인다 | ARI-REQ-176 · API GET /opsapi/notices 200 | ARI-FN-236 | 2026-11-13 |
| 186 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | [QA] 공지 둘을 차례로 만든 뒤 GET /opsapi/notices 를 부른다 | 공지 둘을 차례로 만들면 GET /opsapi/notices 에 번호가 큰 것이 먼저 보인다 | ARI-REQ-177 | ARI-FN-237 | 2026-11-13 |
| 187 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 공지가 200건이 되게 꺼진 [QA] 공지를 만든 뒤 GET /opsapi/notices 를 부른다 | 공지가 200건이 되게 만든 뒤 GET /opsapi/notices 를 부르면 200건이 돌아온다 | ARI-REQ-178 | ARI-FN-239 | 2026-11-13 |
| 188 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 꺼진 [QA] 공지를 1건 더 만든 뒤 GET /opsapi/notices 를 부른다 | 공지가 201건일 때도 GET /opsapi/notices 는 200건까지만 돌아온다 | ARI-REQ-178 | ARI-FN-239 | 2026-11-13 |
| 189 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 제목 · 내용 · 기간을 넣어 꺼진 [QA] 공지를 만든다 | 제목 · 내용 · 기간을 넣어 공지를 만들면 넣은 값의 공지 한 건이 돌아온다 | ARI-REQ-179 · API POST /opsapi/notices 200 | ARI-FN-240 | 2026-11-13 |
| 190 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 제목 0자로 공지를 만든다 | 공지 제목 0자로 만들면 400 INVALID 다 | ARI-REQ-180 · API POST /opsapi/notices 400 | ARI-FN-242 | 2026-11-13 |
| 191 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 제목 1자로 공지를 만든다 | 공지 제목 1자일 때 200 으로 만들어진다 | ARI-REQ-180 | ARI-FN-242 | 2026-11-13 |
| 192 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 제목 60자로 공지를 만든다 | 공지 제목 60자일 때 200 으로 만들어진다 | ARI-REQ-180 | ARI-FN-242 | 2026-11-13 |
| 193 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 제목 61자로 공지를 만든다 | 공지 제목 61자일 때 400 INVALID 다 | ARI-REQ-180 | ARI-FN-242 | 2026-11-13 |
| 194 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 내용 0자로 공지를 만든다 | 공지 내용 0자로 만들면 400 INVALID 다 | ARI-REQ-181 | ARI-FN-244 | 2026-11-13 |
| 195 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 내용 1자로 공지를 만든다 | 공지 내용 1자일 때 200 으로 만들어진다 | ARI-REQ-181 | ARI-FN-244 | 2026-11-13 |
| 196 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 내용 1,000자로 공지를 만든다 | 공지 내용 1,000자일 때 200 으로 만들어진다 | ARI-REQ-181 | ARI-FN-244 | 2026-11-13 |
| 197 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 내용 1,001자로 공지를 만든다 | 공지 내용 1,001자일 때 400 INVALID 다 | ARI-REQ-181 | ARI-FN-244 | 2026-11-13 |
| 198 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | endsAt 을 startsAt 보다 앞으로 공지를 만든다 | endsAt 을 startsAt 보다 앞으로 공지를 만들면 400 INVALID 다 | ARI-REQ-182 | ARI-FN-513 | 2026-11-13 |
| 199 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | startsAt 없이 꺼진 [QA] 공지를 만든다 | startsAt 없이 공지를 만들면 startsAt 이 만든 시각 createdAt 과 같다 | ARI-REQ-183 | ARI-FN-246 | 2026-11-13 |
| 200 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | enabled 없이 [QA] 공지를 만든다 | enabled 없이 공지를 만들면 enabled 가 거짓이다 | ARI-REQ-184 | ARI-FN-247 | 2026-11-13 |
| 201 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 만든 [QA] 공지의 제목을 PUT /opsapi/notices/{id} 로 수정한다 | 공지 제목을 수정하면 수정한 제목의 공지 한 건이 돌아온다 | ARI-REQ-185 · API PUT /opsapi/notices/{id} 200 | ARI-FN-248 | 2026-11-13 |
| 202 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 제목을 비워 PUT /opsapi/notices/{id} 로 수정한다 | 제목을 비워 공지를 수정하면 400 INVALID 다 | ARI-REQ-185 · API PUT /opsapi/notices/{id} 400 | ARI-FN-514 | 2026-11-13 |
| 203 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 시작이 1시간 뒤인 [QA] 공지를 startsAt 없이 수정한다 | startsAt 없이 공지를 수정하면 startsAt 이 수정한 시각 updatedAt 과 같아진다 | ARI-REQ-186 | ARI-FN-249 | 2026-11-13 |
| 204 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 공지 번호를 PUT /opsapi/notices/{id} 로 수정한다 | 없는 공지 번호를 수정하면 404 다 | ARI-REQ-187 · API PUT /opsapi/notices/{id} 404 | ARI-FN-251 | 2026-11-13 |
| 205 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 만든 [QA] 공지를 DELETE /opsapi/notices/{id} 로 삭제한다 | 만든 공지를 삭제하면 204 이고 본문이 없다 | ARI-REQ-188 · API DELETE /opsapi/notices/{id} 204 | ARI-FN-252 | 2026-11-13 |
| 206 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/maintenance 를 부른다 | GET /opsapi/maintenance 를 부르면 id 1 인 점검 설정이 돌아온다 | ARI-REQ-189 · API GET /opsapi/maintenance 200 | ARI-FN-253 | 2026-11-13 |
| 207 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 시작을 1시간 뒤로 PUT /opsapi/maintenance 로 점검 설정을 변경한다 | 점검 설정을 변경하면 넣은 enabled · message · startsAt 의 점검 설정이 돌아온다 | ARI-REQ-191 · API PUT /opsapi/maintenance 200 | ARI-FN-255 | 2026-11-13 |
| 208 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 꺼진 채 문구 300자로 점검 설정을 변경한다 | 점검 문구 300자로 변경하면 200 이다 | ARI-REQ-192 | ARI-FN-257 | 2026-11-13 |
| 209 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 꺼진 채 문구 301자로 점검 설정을 변경한다 | 점검 문구 301자일 때 400 INVALID 다 | ARI-REQ-192 · API PUT /opsapi/maintenance 400 | ARI-FN-257 | 2026-11-13 |
| 210 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 문구 0자로 점검을 켠다 | 문구 0자로 점검을 켜면 400 INVALID 다 | ARI-REQ-193 | ARI-FN-259 | 2026-11-13 |
| 211 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | 시작을 1시간 뒤로 문구 1자를 넣어 점검을 켠다 | 문구 1자일 때 200 으로 점검이 켜진다 | ARI-REQ-193 | ARI-FN-259 | 2026-11-13 |
| 212 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 끝을 시작보다 앞으로 점검 설정을 변경한다 | 끝을 시작보다 앞으로 점검 설정을 변경하면 400 INVALID 다 | ARI-REQ-194 | ARI-FN-515 | 2026-11-13 |
| 213 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 계정 번호 999999 를 허용 목록에 넣어 점검 설정을 변경한다 | 없는 계정 번호를 허용 목록에 넣어 변경하면 200 이다 | ARI-REQ-195 | ARI-FN-261 | 2026-11-13 |
| 214 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 허용 계정 번호 배열 [1, 2] 로 점검 설정을 변경한 뒤 GET /opsapi/maintenance 를 부른다 | 허용 계정 번호를 배열로 넣어 변경하면 읽을 때 allowedAccountIds 가 쉼표로 이은 문자열 「1,2」다 | ARI-REQ-196 | ARI-FN-262 | 2026-11-13 |
| 215 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」을 허용 목록에 넣고 점검을 켠 뒤 「일반 회원」으로 POST /api/login 을 부른다 | 점검 허용 목록에 든 「일반 회원」으로 POST /api/login 을 부르면 200 이다 | ARI-REQ-197 | ARI-FN-263 | 2026-11-13 |
| 216 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | [QA] 공지를 만든 뒤 q 에 그 제목을 넣어 GET /opsapi/logs/audit 를 부른다 | 공지를 만든 뒤 GET /opsapi/logs/audit 를 검색하면 그 작업 기록이 보인다 | ARI-REQ-198 · API GET /opsapi/logs/audit 200 | ARI-FN-264 | 2026-11-13 |
| 217 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 0 으로 GET /opsapi/logs/audit 를 부른다 | size 0 으로 GET /opsapi/logs/audit 를 부르면 1건이 돌아온다 | ARI-REQ-199 | ARI-FN-516 | 2026-11-13 |
| 218 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 1 로 GET /opsapi/logs/audit 를 부른다 | size 1 일 때 GET /opsapi/logs/audit 는 1건이다 | ARI-REQ-199 | ARI-FN-516 | 2026-11-13 |
| 219 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 200 으로 GET /opsapi/logs/audit 를 부른다 | size 200 일 때 GET /opsapi/logs/audit 는 total 과 200 가운데 작은 수만큼이다 | ARI-REQ-199 | ARI-FN-516 | 2026-11-13 |
| 220 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 201 로 GET /opsapi/logs/audit 를 부른다 | size 201 일 때도 GET /opsapi/logs/audit 는 total 과 200 가운데 작은 수만큼이다 | ARI-REQ-199 | ARI-FN-516 | 2026-11-13 |
| 221 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/logs/audit 를 부른다 | GET /opsapi/logs/audit 를 부르면 at 이 늦은 것부터 보인다 | ARI-REQ-200 | ARI-FN-266 | 2026-11-13 |
| 222 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/logs/audit 를 불러 area 를 읽는다 | GET /opsapi/logs/audit 를 부르면 모든 기록의 area 가 AUTH · SANCTION · GRANT · NOTICE · MAINTENANCE 가운데 하나다 | ARI-REQ-201 | ARI-FN-267 | 2026-11-13 |
| 223 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터에 아이템을 지급한 뒤 GET /opsapi/logs/items 를 부른다 | 아이템을 지급한 뒤 GET /opsapi/logs/items 를 부르면 그 지급의 GRANTED 기록이 보인다 | ARI-REQ-202 · API GET /opsapi/logs/items 200 | ARI-FN-268 | 2026-11-13 |
| 224 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 0 으로 GET /opsapi/logs/items 를 부른다 | size 0 으로 GET /opsapi/logs/items 를 부르면 1건이 돌아온다 | ARI-REQ-203 | ARI-FN-517 | 2026-11-13 |
| 225 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 1 로 GET /opsapi/logs/items 를 부른다 | size 1 일 때 GET /opsapi/logs/items 는 1건이다 | ARI-REQ-203 | ARI-FN-517 | 2026-11-13 |
| 226 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 200 으로 GET /opsapi/logs/items 를 부른다 | size 200 일 때 GET /opsapi/logs/items 는 total 과 200 가운데 작은 수만큼이다 | ARI-REQ-203 | ARI-FN-517 | 2026-11-13 |
| 227 | 경계 | 대상 서버 줄에 고정 운영 키가 있다 | size 201 로 GET /opsapi/logs/items 를 부른다 | size 201 일 때도 GET /opsapi/logs/items 는 total 과 200 가운데 작은 수만큼이다 | ARI-REQ-203 | ARI-FN-517 | 2026-11-13 |
| 228 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/logs/items 를 부른다 | GET /opsapi/logs/items 를 부르면 at 이 늦은 것부터 보인다 | ARI-REQ-204 | ARI-FN-270 | 2026-11-13 |
| 229 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 고정 운영 키로 GET /opsapi/logs/items 를 불러 kind 를 읽는다 | GET /opsapi/logs/items 를 부르면 모든 기록의 kind 가 GRANTED · TAKEN · RECALLED 가운데 하나다 | ARI-REQ-205 | ARI-FN-271 | 2026-11-13 |
| 230 | 예외 | 「두 번째 플레이어」 계정이 있다 | 사유를 비워 「두 번째 플레이어」에 CHAT_MUTE 제재를 건다 | 입력 규칙을 어겨 제재를 걸면 400 과 code INVALID · 한국어 message 가 돌아온다 | ARI-REQ-206 | ARI-FN-273 | 2026-11-13 |
| 231 | 예외 | 「두 번째 플레이어」 계정이 있다 | 공백만 넣은 사유로 「두 번째 플레이어」에 CHAT_MUTE 제재를 건다 | 공백만 넣은 사유로 제재를 걸면 앞뒤 공백을 빼고 세어 400 INVALID 다 | ARI-REQ-207 | ARI-FN-518 | 2026-11-13 |
| 232 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 계정 번호로 GET /opsapi/users/{id} 를 부른다 | 없는 계정 번호로 계정 상세를 부르면 404 와 code NOT_FOUND 다 | ARI-REQ-208 · API GET /opsapi/users/{id} 404 | ARI-FN-276 | 2026-11-13 |
| 233 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 없는 공지 번호를 DELETE /opsapi/notices/{id} 로 삭제한다 | 없는 공지 번호를 삭제할 때 404 와 code NOT_FOUND 다 | ARI-REQ-208 · API DELETE /opsapi/notices/{id} 404 | ARI-FN-276 | 2026-11-13 |
| 234 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | 깨진 JSON 으로 POST /opsapi/notices 를 부른다 | 운영자 API 에 깨진 JSON 을 보내면 400 이고 본문이 application/problem+json 형식이다 | ARI-REQ-209 | ARI-FN-278 | 2026-11-13 |
| 235 | 예외 | 대상 서버 줄에 고정 운영 키가 있다 | enabled 에 글자를 넣어 POST /opsapi/notices 를 부른다 | 형이 다른 값을 보냈을 때도 400 이고 본문이 application/problem+json 형식이다 | ARI-REQ-209 | ARI-FN-278 | 2026-11-13 |
| 236 | 정상 | 대상 서버에 접근할 수 있다 | 이동을 따라가지 않고 GET /Account 를 부른다 | GET /Account 를 부르면 302 로 홈으로 이동한다 | ARI-REQ-210 | ARI-FN-279 | 2026-11-13 |
| 237 | 정상 | 대상 서버에 접근할 수 있다 | 로그인 없이 GET /Account/RegisterSuccess 를 부른다 | GET /Account/RegisterSuccess 를 로그인 없이 부르면 200 이다 | ARI-REQ-211 | ARI-FN-280 | 2026-11-13 |
| 238 | 예외 | 대상 서버에 접근할 수 있다 | 쿠키 없이 GET /Account/Dashboard 를 부른다 | 쿠키 없이 GET /Account/Dashboard 를 부르면 302 로 /Home?ReturnUrl=/Account/Dashboard 로 이동한다 | ARI-REQ-212 | ARI-FN-282 | 2026-11-13 |
| 239 | 예외 | 대상 서버에 접근할 수 있다 | 쿠키 없이 GET /Account/Edit 를 부른다 | 쿠키 없이 부른 GET /Account/Edit 는 302 로 /Home?ReturnUrl=/Account/Edit 로 이동한다 | ARI-REQ-212 | ARI-FN-282 | 2026-11-13 |
| 240 | 예외 | 대상 서버에 접근할 수 있다 | 쿠키 없이 GET /Account/ChangePassword 를 부른다 | 쿠키 없이 부른 GET /Account/ChangePassword 는 302 로 /Home?ReturnUrl=/Account/ChangePassword 로 이동한다 | ARI-REQ-212 | ARI-FN-282 | 2026-11-13 |
| 241 | 예외 | 대상 서버에 접근할 수 있다 | 쿠키 없이 GET /Account/Delete 를 부른다 | 쿠키 없이 부른 GET /Account/Delete 는 302 로 /Home?ReturnUrl=/Account/Delete 로 이동한다 | ARI-REQ-212 | ARI-FN-282 | 2026-11-13 |
| 242 | 정상 | 대상 서버에 접근할 수 있다 | GET /Home/Privacy 를 부른다 | GET /Home/Privacy 를 부르면 「Use this page to detail your site’s privacy policy.」가 보인다 | ARI-REQ-214 | ARI-FN-284 | 2026-11-13 |
| 243 | 예외 | 대상 서버에 접근할 수 있다 | GET /Home/Error 를 부른다 | GET /Home/Error 를 부르면 200 으로 오류 안내 화면이 열린다 | ARI-REQ-215 | ARI-FN-286 | 2026-11-13 |
| 244 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 탭 제목을 읽는다 | 홈을 열면 탭 제목이 「 - Account Manager」로 끝난다 | ARI-REQ-216 | ARI-FN-287 | 2026-11-13 |
| 245 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 상단 메뉴를 읽는다 | 홈을 열면 상단 메뉴에 「AccountService」 · 「Home」 · 「Account」 · 「Downloads」 링크가 보인다 | ARI-REQ-217 | ARI-FN-288 | 2026-11-13 |
| 246 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 하단을 읽는다 | 홈을 열면 하단에 「© 2023 - AccountService - Privacy」가 보인다 | ARI-REQ-218 | ARI-FN-289 | 2026-11-13 |
| 247 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 브랜드 · 탭 제목 · 큰 제목을 읽는다 | 홈을 열면 브랜드 「AccountService」 · 탭 「Account Manager」 · 큰 제목 「AnyMMO Account」가 보인다 | ARI-REQ-219 | ARI-FN-290 | 2026-11-13 |
| 248 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 화면 글을 읽는다 | 홈을 열면 큰 제목 「AnyMMO Account」, 입력 「Username」 · 「Password」, 버튼 「Login」 · 「Create Account」, 문구 「or」가 보인다 | ARI-REQ-220 | ARI-FN-291 | 2026-11-13 |
| 249 | 정상 | 대상 서버에 접근할 수 있다 | 홈 GET / 을 불러 로그인 폼을 읽는다 | 홈을 열면 로그인 폼에 위조 방지 토큰이 들어 있다 | ARI-REQ-221 | ARI-FN-292 | 2026-11-13 |
| 250 | 정상 | 대상 서버에 접근할 수 있다 | GET /Account/Create 를 불러 화면 글을 읽는다 | 계정 만들기 화면을 열면 큰 제목 「Create Account」, 입력 「UserName」 · 「Email」 · 「Password」 · 「Repeat Password」, 버튼 「Create」 · 「Back to Login」이 보인다 | ARI-REQ-222 | ARI-FN-293 | 2026-11-13 |
| 251 | 정상 | 대상 서버에 접근할 수 있다 | GET /Account/Create 를 불러 입력 칸을 읽는다 | 계정 만들기 화면을 열면 전화번호 입력 칸이 보이지 않는다 | ARI-REQ-223 | ARI-FN-294 | 2026-11-13 |
| 252 | 정상 | 대상 서버에 접근할 수 있다 | 신규 아이디 · 이메일 · 비밀번호로 계정 만들기를 제출한다 | 신규 아이디로 계정 만들기를 제출하면 302 로 /Account/RegisterSuccess 로 이동한다 | ARI-REQ-224 | ARI-FN-295 | 2026-11-13 |
| 253 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 아이디로 계정 만들기를 제출한다 | 이미 있는 「일반 회원」 아이디로 계정 만들기를 제출하면 400 과 본문 「Username not available」이다 | ARI-REQ-225 | ARI-FN-297 | 2026-11-13 |
| 254 | 예외 | 대상 서버에 접근할 수 있다 | 가입 중 예상 밖 예외가 나게 계정 만들기를 제출한다 | 가입 중 예상 밖 예외가 나면 200 으로 가입 화면이 다시 보인다 | ARI-REQ-226 · 보류 — 가입 중 예상 밖 예외를 낼 길 | 제거함(ARI-FN-519) | 2026-11-13 |
| 255 | 정상 | 대상 서버에 접근할 수 있다 | 기호가 섞인 120자 아이디로 계정 만들기를 제출한다 | 기호가 섞인 120자 아이디로 계정 만들기를 제출하면 302 로 가입된다 | ARI-REQ-227 | ARI-FN-299 | 2026-11-13 |
| 256 | 정상 | 대상 서버에 접근할 수 있다 | 빈 아이디로 계정 만들기를 제출한다 | 빈 아이디로 계정 만들기를 처음 제출하면 302 로 가입된다 | ARI-REQ-228 · 보류 — 빈 아이디 계정이 없는 서버 상태 | 제거함(ARI-FN-520) | 2026-11-13 |
| 257 | 예외 | 「일반 회원」 계정이 있다 | 「일반 회원」 아이디를 대문자로 변경해 계정 만들기를 제출한다 | 「일반 회원」 아이디를 대문자로 변경해 제출하면 같은 아이디로 보고 가입을 400 으로 거절한다 | ARI-REQ-229 | ARI-FN-521 | 2026-11-14 |
| 258 | 정상 | 대상 서버에 접근할 수 있다 | 빈 비밀번호로 계정 만들기를 제출한다 | 빈 비밀번호로 계정 만들기를 제출하면 302 로 가입된다 | ARI-REQ-230 | ARI-FN-303 | 2026-11-13 |
| 259 | 정상 | 대상 서버에 접근할 수 있다 | 비밀번호 확인 칸을 다르게 넣어 계정 만들기를 제출한다 | 비밀번호 확인 칸을 다르게 넣어 제출하면 302 로 가입된다 | ARI-REQ-231 | ARI-FN-304 | 2026-11-13 |
| 260 | 예외 | 대상 서버에 접근할 수 있다 | 형식이 틀린 이메일 「not-an-email」로 계정 만들기를 제출한다 | 형식이 틀린 이메일로 계정 만들기를 제출하면 302 로 가입된다 | ARI-REQ-232 | ARI-FN-306 | 2026-11-13 |
| 261 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원과 같은 이메일로 계정 만들기를 제출한다 | 다른 계정과 같은 이메일일 때도 302 로 가입된다 | ARI-REQ-232 | ARI-FN-306 | 2026-11-13 |
| 262 | 예외 | 대상 서버에 접근할 수 있다 | 위조 방지 토큰 없이 계정 만들기를 제출한다 | 위조 방지 토큰 없이 계정 만들기를 제출하면 400 이다 | ARI-REQ-233 | ARI-FN-308 | 2026-11-13 |
| 263 | 정상 | 대상 서버에 접근할 수 있다 | GET /Account/Login 을 불러 화면 글을 읽는다 | 로그인 화면 /Account/Login 을 열면 큰 제목 「Login」, 입력 「Username」 · 「Password」, 버튼 「Login」, 링크 「Home」이 보인다 | ARI-REQ-234 | ARI-FN-309 | 2026-11-13 |
| 264 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」 아이디와 비밀번호로 POST /Account/Login 을 보낸다 | 「일반 회원」으로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다 | ARI-REQ-235 | ARI-FN-310 | 2026-11-13 |
| 265 | 정상 | 「일반 회원」 계정이 있다 | 주소에 page 질의를 붙여 「일반 회원」으로 POST /Account/Login 을 보낸다 | 주소에 page 질의를 붙여 웹 로그인하면 로그인 화면이 다시 보인다 | ARI-REQ-236 | ARI-FN-311 | 2026-11-13 |
| 266 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원 아이디와 틀린 비밀번호로 POST /Account/Login 을 보낸다 | 틀린 비밀번호로 웹 로그인하면 200 으로 로그인 화면이 다시 보인다 | ARI-REQ-237 | ARI-FN-522 | 2026-11-13 |
| 267 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원 아이디와 틀린 비밀번호로 웹 로그인한 화면을 읽는다 | 틀린 비밀번호로 웹 로그인하면 화면에 빨간 오류 알림이 보이지 않는다 | ARI-REQ-238 | ARI-FN-314 | 2026-11-13 |
| 268 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 틀린 비밀번호로 여러 번 웹 로그인한 뒤 맞는 비밀번호로 POST /Account/Login 을 보낸다 | 틀린 비밀번호로 여러 번 웹 로그인한 뒤 맞는 비밀번호로 로그인하면 302 로 /Account/Dashboard 로 이동한다 | ARI-REQ-239 | ARI-FN-316 | 2026-11-13 |
| 269 | 정상 | 「두 번째 플레이어」 계정이 있다 | 정지를 건 「두 번째 플레이어」로 POST /Account/Login 을 보낸다 | 정지된 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다 | ARI-REQ-240 | ARI-FN-317 | 2026-11-13 |
| 270 | 정상 | 「두 번째 플레이어」 계정이 있다 | 점검을 켠 채 「두 번째 플레이어」로 POST /Account/Login 을 보낸다 | 점검 중 「두 번째 플레이어」로 웹 로그인하면 302 로 /Account/Dashboard 로 이동한다 | ARI-REQ-241 | ARI-FN-318 | 2026-11-13 |
| 271 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」으로 웹 로그인한 뒤 GET /Account/Dashboard 를 부른다 | 「일반 회원」으로 대시보드를 열면 「Account Dashboard」 · 「Account Settings」 · 「Edit Details」 · 「Change Password」 · 「Welcome back, !」 · 「Your Characters」 · 「Logout」이 보인다 | ARI-REQ-242 | ARI-FN-319 | 2026-11-13 |
| 272 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 캐릭터가 없는 일회용 회원으로 웹 로그인한 뒤 GET /Account/Dashboard 를 부른다 | 캐릭터가 없는 계정으로 대시보드를 열면 「No characters found.」가 보인다 | ARI-REQ-243 | ARI-FN-320 | 2026-11-13 |
| 273 | 정상 | 「일반 회원」 계정이 있다 | 「일반 회원」으로 웹 로그인한 뒤 대시보드의 캐릭터 목록을 읽는다 | 「일반 회원」으로 대시보드를 열면 캐릭터 목록 줄이 캐릭터 이름만으로 보인다 | ARI-REQ-244 | ARI-FN-321 | 2026-11-13 |
| 274 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 웹 로그인한 뒤 GET /Account/Edit 를 부른다 | 정보 수정 화면을 열면 「Edit Account Details」 · 읽기 전용 「UserName」 · 「Username cannot be changed.」 · 「Email」 · 「Save Changes」 · 「Cancel」 · 「Logout」이 보인다 | ARI-REQ-245 | ARI-FN-322 | 2026-11-13 |
| 275 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 정보 수정에서 신규 이메일을 저장한다 | 정보 수정에서 이메일을 저장하면 대시보드로 이동해 「Profile updated successfully!」가 보인다 | ARI-REQ-246 | ARI-FN-323 | 2026-11-13 |
| 276 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 저장 중 DB 오류가 나게 정보 수정을 저장한다 | 저장 중 DB 오류가 나면 정보 수정 폼에 「Unable to save changes. Try again later.」가 보인다 | ARI-REQ-247 · 보류 — 저장 중 DB 오류를 낼 길 | 제거함(ARI-FN-523) | 2026-11-13 |
| 277 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원 A 로 로그인해 정보 수정 폼 Id 를 일회용 회원 B 번호로 변경해 제출한다 | 정보 수정 폼 Id 를 다른 계정 번호로 변경해 제출하면 그 계정의 이메일이 변경된다 | ARI-REQ-248 | ARI-FN-326 | 2026-11-13 |
| 278 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 정보 수정에 형식이 틀린 이메일을 저장한다 | 형식이 틀린 이메일로 정보 수정을 저장하면 302 로 대시보드로 이동한다 | ARI-REQ-249 | ARI-FN-327 | 2026-11-13 |
| 279 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 웹 로그인한 뒤 GET /Account/ChangePassword 를 부른다 | 비밀번호 바꾸기 화면을 열면 「Security Settings」 · 「Update Password」 · 「Current Password」 · 「New Password」 · 「Confirm New Password」 · 「Cancel」이 보인다 | ARI-REQ-250 | ARI-FN-328 | 2026-11-13 |
| 280 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 현재 비밀번호를 비우고 비밀번호 바꾸기를 제출한다 | 현재 비밀번호를 비우고 비밀번호 바꾸기를 제출하면 200 으로 같은 화면이 오류와 함께 다시 보인다 | ARI-REQ-251 | ARI-FN-330 | 2026-11-13 |
| 281 | 경계 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호 5자로 비밀번호 바꾸기를 제출한다 | 새 비밀번호 5자로 제출하면 「The password must be at least 6 characters long.」가 보인다 | ARI-REQ-252 | ARI-FN-332 | 2026-11-13 |
| 282 | 경계 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호 6자로 비밀번호 바꾸기를 제출한다 | 새 비밀번호 6자일 때 302 로 대시보드로 이동한다 | ARI-REQ-252 | ARI-FN-332 | 2026-11-13 |
| 283 | 경계 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호 100자로 비밀번호 바꾸기를 제출한다 | 새 비밀번호 100자일 때 302 로 대시보드로 이동한다 | ARI-REQ-252 | ARI-FN-332 | 2026-11-13 |
| 284 | 경계 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호 101자로 비밀번호 바꾸기를 제출한다 | 새 비밀번호 101자일 때 길이 오류 문구 「The password must be at least 6 characters long.」가 보인다 | ARI-REQ-252 | ARI-FN-332 | 2026-11-13 |
| 285 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호를 비우고 비밀번호 바꾸기를 제출한다 | 새 비밀번호를 비우고 제출하면 200 으로 같은 화면이 오류와 함께 다시 보인다 | ARI-REQ-252 | ARI-FN-333 | 2026-11-13 |
| 286 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 새 비밀번호 확인을 다르게 넣어 비밀번호 바꾸기를 제출한다 | 새 비밀번호 확인을 다르게 넣어 제출하면 「The new password and confirmation password do not match.」가 보인다 | ARI-REQ-253 | ARI-FN-335 | 2026-11-13 |
| 287 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 숫자만 6자인 새 비밀번호로 비밀번호 바꾸기를 제출한다 | 숫자만 6자인 새 비밀번호로 바꾸면 302 로 대시보드로 이동한다 | ARI-REQ-254 | ARI-FN-336 | 2026-11-13 |
| 288 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 현재와 같은 새 비밀번호로 비밀번호 바꾸기를 제출한다 | 현재와 같은 새 비밀번호로 바꾸면 302 로 대시보드로 이동한다 | ARI-REQ-255 | ARI-FN-337 | 2026-11-13 |
| 289 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 현재 비밀번호를 틀리게 넣어 비밀번호 바꾸기를 제출한다 | 현재 비밀번호를 틀리게 넣어 제출하면 「Current password is incorrect.」가 보인다 | ARI-REQ-256 | ARI-FN-339 | 2026-11-13 |
| 290 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원의 비밀번호를 신규 비밀번호로 바꾼다 | 비밀번호를 바꾸면 대시보드에 「Password changed successfully!」가 보이고 신규 비밀번호로 웹 로그인된다 | ARI-REQ-257 | ARI-FN-340 | 2026-11-13 |
| 291 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 비밀번호를 바꾼 뒤 바꾸기 전 쿠키로 GET /Account/Dashboard 를 부른다 | 비밀번호를 바꾼 뒤에도 바꾸기 전 쿠키로 대시보드를 열면 200 이다 | ARI-REQ-258 | ARI-FN-341 | 2026-11-13 |
| 292 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 비밀번호를 바꾼 뒤 바꾸기 전에 받은 게임 계정 토큰으로 POST /api/getguilds 를 부른다 | 비밀번호를 바꾼 뒤 이전 게임 계정 토큰으로 데이터 API 를 부르면 서명 오류가 아닌 401 「invalid shared secret」이다 | ARI-REQ-259 | ARI-FN-342 | 2026-11-13 |
| 293 | 예외 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 웹 로그인한 채 GET /Account/Delete 를 부른다 | 로그인한 채 GET /Account/Delete 를 부르면 500 이다 | ARI-REQ-260 | ARI-FN-344 | 2026-11-13 |
| 294 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 웹 로그인한 채 POST /Account/Delete 를 보낸다 | 로그인한 채 POST /Account/Delete 를 보내면 계정이 남은 채 홈으로 이동한다 | ARI-REQ-261 | ARI-FN-345 | 2026-11-13 |
| 295 | 정상 | 대상 서버에 접근할 수 있다 | 로그인 없이 GET /Account/Details/1 을 부른다 | 로그인 없이 GET /Account/Details/1 을 부르면 200 으로 내용 없는 화면이 열린다 | ARI-REQ-262 | ARI-FN-346 | 2026-11-13 |
| 296 | 예외 | 대상 서버에 접근할 수 있다 | GET /Authentication 을 부른다 | GET /Authentication 을 부르면 500 이다 | ARI-REQ-263 | ARI-FN-348 | 2026-11-13 |
| 297 | 정상 | 케이스가 가입한 일회용 회원이 있다 | 일회용 회원으로 웹 로그인한 채 GET /Account/Logout 을 부른다 | 로그인한 채 GET /Account/Logout 을 부르면 홈으로 이동하고 그 뒤 대시보드는 로그인 화면으로 보낸다 | ARI-REQ-264 | ARI-FN-349 | 2026-11-13 |
| 298 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 제재를 걸고 푼 뒤 GET /opsapi/users/{id} 를 부른다 | 제재를 걸고 풀면 계정 상세 sanctions 에 그 제재가 releasedAt 과 함께 남아 있다 | ARI-REQ-265 | ARI-FN-350 | 2026-11-13 |
| 299 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | [QA] 공지를 만들고 삭제한 뒤 공지를 하나 더 만든다 | 공지를 삭제한 뒤 하나 더 만들면 삭제한 번호보다 큰 번호가 매겨진다 | ARI-REQ-266 | ARI-FN-351 | 2026-11-13 |
| 300 | 예외 | 「두 번째 플레이어」 계정이 있다 | 서버 토큰으로 「두 번째 플레이어」 계정에 캐릭터를 만들고 저장한 뒤 그 계정의 캐릭터 목록을 부른다 | 서버 토큰으로 다른 계정의 캐릭터 행을 만들고 저장하고 읽으면 모두 200 이다 | ARI-REQ-015 | ARI-FN-021 | 2026-11-14 |
| 301 | 정상 | 「게임 서버」 계정이 있다 | 맞는 공유 비밀로 POST /api/serverlogin 을 불러 받은 토큰 본문을 읽는다 | 게임 서버 토큰을 열면 sharedSecret 칸에 보낸 공유 비밀이 그대로 들어 있다 | ARI-REQ-016 | ARI-FN-022 | 2026-11-14 |
| 302 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 POST /api/getguilds 와 POST /api/getaccountrestrictions 를 부른다 | 게임 서버 토큰으로 데이터 API 와 getaccountrestrictions 를 부르면 200 이다 | ARI-REQ-018 | ARI-FN-025 | 2026-11-14 |
| 303 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 GET /opsapi/summary 를 부른다 | 게임 서버 토큰으로 /opsapi/* 를 부르면 401 이고 본문이 비어 있다 | ARI-REQ-019 | ARI-FN-027 | 2026-11-14 |
| 304 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 POST /api/createguild 를 부른다 | 데이터 API 로 길드를 만들면 200 과 { "id": <번호> } 가 돌아온다 | ARI-REQ-031 | ARI-FN-042 | 2026-11-14 |
| 305 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 POST /api/getguilds 를 부른다 | 길드 목록 응답은 200 과 { "guilds": [ ... ] } 꼴이다 | ARI-REQ-031 | ARI-FN-042 | 2026-11-14 |
| 306 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 만든 길드를 POST /api/saveguild 로 저장한 뒤 POST /api/deleteguild 로 삭제한다 | 길드 저장과 삭제 응답은 둘 다 본문 없는 200 이다 | ARI-REQ-031 | ARI-FN-042 | 2026-11-14 |
| 307 | 예외 | 「게임 서버」 계정이 있다 | 같은 이름의 캐릭터를 두 번 만든다 | 이름 중복으로 서비스가 실패하면 400 이고 본문은 제목 Bad Request · 상태 400 인 problem 형식이다 | ARI-REQ-036 | ARI-FN-050 | 2026-11-14 |
| 308 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 없는 길드 번호에 POST /api/saveguild 를 부른다 | 데이터 API 에서 대상 번호가 없으면 404 가 아니라 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-037 | ARI-FN-052 | 2026-11-14 |
| 309 | 정상 | 「게임 서버」 계정이 있다 | 맞는 공유 비밀로 POST /api/serverlogin 을 부른다 | 맞는 공유 비밀로 POST /api/serverlogin 을 부르면 200 과 accountId 0 · 서버 토큰이 돌아온다 | ARI-REQ-040 · API POST /api/serverlogin 200 | ARI-FN-056 | 2026-11-14 |
| 310 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 새 이름의 캐릭터를 POST /api/createplayercharacter 로 만든다 | 새 이름으로 POST /api/createplayercharacter 를 부르면 200 과 새 캐릭터 번호 id 가 돌아온다 | ARI-REQ-050 · API POST /api/createplayercharacter 200 | ARI-FN-074 | 2026-11-14 |
| 311 | 정상 | 「게임 서버」 계정이 있다 | 만든 캐릭터의 계정 번호로 POST /api/getplayercharacters 를 부른다 | 만든 캐릭터가 그 계정의 캐릭터 목록에 보인다 | ARI-REQ-050 | ARI-FN-074 | 2026-11-14 |
| 312 | 예외 | 「게임 서버」 계정이 있다 | 이미 있는 캐릭터와 같은 이름으로 POST /api/createplayercharacter 를 부른다 | 이미 있는 캐릭터 이름으로 다시 만들면 400 으로 실패한다 | ARI-REQ-051 · API POST /api/createplayercharacter 400 | ARI-FN-076 | 2026-11-14 |
| 313 | 예외 | 「게임 서버」 계정이 있다 | 「Aria」로 시작하는 이름의 캐릭터를 만든 뒤 같은 이름을 소문자로 바꿔 만든다 | 「Aria」가 있을 때 「aria」로 캐릭터를 만들면 400 으로 실패한다 | ARI-REQ-052 | ARI-FN-078 | 2026-11-14 |
| 314 | 정상 | 「게임 서버」 계정이 있다 | 캐릭터를 만든 뒤 POST /api/getfriendlists 를 부른다 | 캐릭터를 만들면 그 캐릭터의 친구 목록이 saveData 빈 문자열로 같이 생긴다 | ARI-REQ-053 | ARI-FN-079 | 2026-11-14 |
| 315 | 정상 | 「게임 서버」 계정이 있다 | 빈 이름으로 캐릭터를 만든다 | 빈 이름으로 캐릭터를 만들면 200 이고 캐릭터 목록에 빈 이름 그대로 보인다 | ARI-REQ-054 | ARI-FN-080 | 2026-11-14 |
| 316 | 정상 | 「게임 서버」 계정이 있다 | 100자 이름으로 캐릭터를 만든다 | 100자 이름도 막히지 않고 캐릭터 목록에 그대로 보인다 | ARI-REQ-054 | ARI-FN-080 | 2026-11-14 |
| 317 | 정상 | 「게임 서버」 계정이 있다 | 「<>&%/」가 든 이름으로 캐릭터를 만든다 | 금지 문자가 든 이름도 막히지 않고 캐릭터 목록에 그대로 보인다 | ARI-REQ-054 | ARI-FN-080 | 2026-11-14 |
| 318 | 정상 | 「게임 서버」 계정이 있다 | 없는 계정 번호로 캐릭터를 만든다 | 없는 계정 번호로 캐릭터를 만들면 막히지 않고 200 과 id 가 돌아온다 | ARI-REQ-055 | ARI-FN-081 | 2026-11-14 |
| 319 | 정상 | 「게임 서버」 계정이 있다 | 만든 캐릭터를 다른 이름과 저장 데이터로 POST /api/saveplayercharacter 한다 | 캐릭터를 저장하면 200 이고 이름과 저장 데이터가 보낸 값으로 바뀐다 | ARI-REQ-056 · API POST /api/saveplayercharacter 200 | ARI-FN-082 | 2026-11-14 |
| 320 | 예외 | 「게임 서버」 계정이 있다 | 없는 캐릭터 번호로 POST /api/saveplayercharacter 를 부른다 | 없는 캐릭터 번호로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-057 · API POST /api/saveplayercharacter 400 | ARI-FN-084 | 2026-11-14 |
| 321 | 예외 | 「게임 서버」 계정이 있다 | 다른 계정 번호로 만든 캐릭터를 서버 토큰으로 저장한다 | 남의 캐릭터 번호로 저장하면 막히지 않고 200 이다 | ARI-REQ-058 | ARI-FN-086 | 2026-11-14 |
| 322 | 정상 | 「게임 서버」 계정이 있다 | 캐릭터 둘을 만든 뒤 하나를 다른 캐릭터의 이름으로 저장한다 | 다른 캐릭터가 쓰는 이름으로 저장하면 막히지 않고 200 이다 | ARI-REQ-059 | ARI-FN-087 | 2026-11-14 |
| 323 | 정상 | 「게임 서버」 계정이 있다 | 만든 캐릭터를 POST /api/deleteplayercharacter 로 삭제한다 | 캐릭터를 삭제하면 200 이고 그 캐릭터가 목록에서 사라진다 | ARI-REQ-060 · API POST /api/deleteplayercharacter 200 | ARI-FN-088 | 2026-11-14 |
| 324 | 정상 | 「게임 서버」 계정이 있다 | 삭제한 뒤 POST /api/getfriendlists 를 부른다 | 삭제한 캐릭터의 친구 목록도 같이 사라진다 | ARI-REQ-060 | ARI-FN-088 | 2026-11-14 |
| 325 | 예외 | 「게임 서버」 계정이 있다 | 없는 캐릭터 번호로 POST /api/deleteplayercharacter 를 부른다 | 없는 캐릭터 번호로 삭제하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-061 · API POST /api/deleteplayercharacter 400 | ARI-FN-090 | 2026-11-14 |
| 326 | 정상 | 「게임 서버」 계정이 있다 | 친구 목록이 없는 캐릭터를 POST /api/deleteplayercharacter 로 삭제한다 | 친구 목록이 없는 캐릭터를 삭제하면 캐릭터만 삭제된 채 400 이다 | ARI-REQ-062 · 보류 — 친구 목록 없는 캐릭터를 만드는 API 가 없다 | ARI-FN-524 | 2026-11-14 |
| 327 | 정상 | 「게임 서버」 계정이 있다 | 우편을 받은 캐릭터를 삭제한 뒤 그 캐릭터 번호로 POST /api/getmailmessages 를 부른다 | 우편을 받은 캐릭터를 삭제하면 그 캐릭터의 우편은 그대로 남는다 | ARI-REQ-063 | ARI-FN-092 | 2026-11-14 |
| 328 | 정상 | 「게임 서버」 계정이 있다 | 아이템 인스턴스를 가진 캐릭터를 삭제한 뒤 POST /api/getiteminstances 를 부른다 | 삭제한 캐릭터의 아이템 인스턴스가 목록에 남아 있다 | ARI-REQ-063 | ARI-FN-092 | 2026-11-14 |
| 329 | 정상 | 「게임 서버」 계정이 있다 | 길드에 든 캐릭터를 삭제한 뒤 POST /api/getguilds 를 부른다 | 삭제한 캐릭터가 길드 저장 데이터의 멤버로 남아 있다 | ARI-REQ-063 | ARI-FN-092 | 2026-11-14 |
| 330 | 정상 | 「게임 서버」 계정이 있다 | 시험용 계정 번호로 캐릭터 둘을 만든 뒤 POST /api/getplayercharacters 를 부른다 | 계정 번호로 캐릭터 목록을 부르면 200 과 그 계정의 캐릭터 둘이 돌아온다 | ARI-REQ-064 · API POST /api/getplayercharacters 200 | ARI-FN-093 | 2026-11-14 |
| 331 | 정상 | 「게임 서버」 계정이 있다 | 캐릭터가 하나도 없는 계정 번호로 POST /api/getplayercharacters 를 부른다 | 캐릭터가 없는 계정 번호로 목록을 부르면 200 과 { "playerCharacters": [] } 이다 | ARI-REQ-065 | ARI-FN-094 | 2026-11-14 |
| 332 | 정상 | 「일반 회원」 계정이 있다 | 서버 토큰으로 「일반 회원」 계정 번호의 캐릭터 목록을 부른다 | 서버 토큰으로 남의 계정 번호의 캐릭터 목록을 부르면 200 과 그 계정의 캐릭터가 돌아온다 | ARI-REQ-066 | ARI-FN-095 | 2026-11-14 |
| 333 | 정상 | 「게임 서버」 계정이 있다 | 서로 다른 계정 번호로 캐릭터를 하나씩 만든 뒤 POST /api/getallplayercharacters 를 부른다 | 모든 캐릭터 목록을 부르면 200 과 서로 다른 계정에 만든 캐릭터 둘이 다 들어 있다 | ARI-REQ-067 · API POST /api/getallplayercharacters 200 | ARI-FN-096 | 2026-11-14 |
| 334 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 AccountId 에 글자를 넣어 POST /api/getplayercharacters 를 부른다 | AccountId 에 글자를 넣어 캐릭터 목록을 부르면 400 이다 | API POST /api/getplayercharacters 400 | ARI-FN-530 | 2026-11-14 |
| 335 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 저장 데이터를 넣어 POST /api/createguild 를 부른다 | 저장 데이터를 넣어 길드를 만들면 200 과 새 길드 번호 id 가 돌아온다 | ARI-REQ-068 · API POST /api/createguild 200 | ARI-FN-097 | 2026-11-14 |
| 336 | 정상 | 「게임 서버」 계정이 있다 | 만든 뒤 POST /api/getguilds 를 부른다 | 만든 길드 번호가 길드 목록에 보인다 | ARI-REQ-068 | ARI-FN-097 | 2026-11-14 |
| 337 | 정상 | 「게임 서버」 계정이 있다 | 만든 길드를 다른 저장 데이터로 POST /api/saveguild 한다 | 길드를 저장하면 200 이고 목록의 그 길드 saveData 가 보낸 값으로 바뀐다 | ARI-REQ-069 · API POST /api/saveguild 200 | ARI-FN-098 | 2026-11-14 |
| 338 | 정상 | 「게임 서버」 계정이 있다 | 만든 길드를 POST /api/deleteguild 로 삭제한다 | 길드를 삭제하면 200 이고 그 번호가 길드 목록에서 사라진다 | ARI-REQ-070 · API POST /api/deleteguild 200 | ARI-FN-099 | 2026-11-14 |
| 339 | 정상 | 「게임 서버」 계정이 있다 | 길드 둘을 만든 뒤 POST /api/getguilds 를 부른다 | 길드 목록을 부르면 200 과 만든 길드 둘이 다 들어 있다 | ARI-REQ-071 · API POST /api/getguilds 200 | ARI-FN-100 | 2026-11-14 |
| 340 | 정상 | 「게임 서버」 계정이 있다 | 같은 GuildName 을 넣은 길드를 두 번 만든다 | 같은 이름의 길드를 두 번 만들면 막히지 않고 둘 다 200 이다 | ARI-REQ-072 | ARI-FN-101 | 2026-11-14 |
| 341 | 정상 | 「게임 서버」 계정이 있다 | GuildName 을 넣은 길드를 만든 뒤 POST /api/getguilds 를 부른다 | 길드 목록을 받아 보면 그 길드의 name 칸은 빈 문자열이다 | ARI-REQ-073 | ARI-FN-102 | 2026-11-14 |
| 342 | 정상 | 「게임 서버」 계정이 있다 | GuildName 을 넣은 길드를 만든 뒤 POST /api/getguilds 를 부른다 | 길드 이름은 saveData 안의 GuildName 에만 들어 있다 | ARI-REQ-073 | ARI-FN-102 | 2026-11-14 |
| 343 | 예외 | 「게임 서버」 계정이 있다 | 없는 길드 번호로 POST /api/saveguild 를 부른다 | 없는 길드 번호로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-074 · API POST /api/saveguild 400 | ARI-FN-104 | 2026-11-14 |
| 344 | 예외 | 「게임 서버」 계정이 있다 | 없는 길드 번호로 POST /api/deleteguild 를 부른다 | 없는 길드 번호로 삭제한 응답도 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-074 · API POST /api/deleteguild 400 | ARI-FN-104 | 2026-11-14 |
| 345 | 정상 | 「게임 서버」 계정이 있다 | 캐릭터 저장 데이터에 길드 번호를 넣은 뒤 그 길드를 삭제하고 캐릭터를 읽는다 | 길드를 삭제하면 멤버 캐릭터 저장 데이터의 길드 소속은 그대로 남는다 | ARI-REQ-075 | ARI-FN-105 | 2026-11-14 |
| 346 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 SaveData 에 숫자를 넣어 POST /api/createguild 를 부른다 | SaveData 에 숫자를 넣어 길드를 만들면 400 이다 | API POST /api/createguild 400 | ARI-FN-525 | 2026-11-14 |
| 347 | 정상 | 「게임 서버」 계정이 있다 | 만든 캐릭터의 친구 목록을 다른 저장 데이터로 POST /api/savefriendlist 한다 | 친구 목록을 저장하면 200 이고 그 캐릭터 친구 목록의 saveData 가 보낸 값으로 바뀐다 | ARI-REQ-076 · API POST /api/savefriendlist 200 | ARI-FN-106 | 2026-11-14 |
| 348 | 정상 | 「게임 서버」 계정이 있다 | 캐릭터 둘을 만든 뒤 POST /api/getfriendlists 를 부른다 | 친구 목록 전체를 부르면 200 과 만든 캐릭터 둘의 친구 목록이 다 들어 있다 | ARI-REQ-077 · API POST /api/getfriendlists 200 | ARI-FN-107 | 2026-11-14 |
| 349 | 예외 | 「게임 서버」 계정이 있다 | 없는 캐릭터 번호로 POST /api/savefriendlist 를 부른다 | 친구 목록이 없는 캐릭터 번호로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-078 · API POST /api/savefriendlist 400 | ARI-FN-109 | 2026-11-14 |
| 350 | 예외 | 「게임 서버」 계정이 있다 | 없는 캐릭터 번호를 친구로 넣어 POST /api/savefriendlist 를 부른다 | 없는 캐릭터를 친구로 넣어 저장하면 막히지 않고 200 이다 | ARI-REQ-079 | ARI-FN-111 | 2026-11-14 |
| 351 | 정상 | 「게임 서버」 계정이 있다 | 서버 토큰으로 저장 데이터를 넣어 POST /api/createauctionitem 을 부른다 | 경매 물품을 만들면 200 과 새 번호 id 가 돌아온다 | ARI-REQ-080 · API POST /api/createauctionitem 200 | ARI-FN-112 | 2026-11-14 |
| 352 | 정상 | 「게임 서버」 계정이 있다 | 만든 뒤 POST /api/getauctionitems 를 부른다 | 만든 경매 물품 번호가 목록에 보인다 | ARI-REQ-080 | ARI-FN-112 | 2026-11-14 |
| 353 | 정상 | 「게임 서버」 계정이 있다 | 만든 경매 물품을 다른 저장 데이터로 POST /api/saveauctionitem 한다 | 경매 물품을 저장하면 200 이고 목록의 saveData 가 보낸 값으로 바뀐다 | ARI-REQ-081 · API POST /api/saveauctionitem 200 | ARI-FN-113 | 2026-11-14 |
| 354 | 정상 | 「게임 서버」 계정이 있다 | 만든 경매 물품을 POST /api/deleteauctionitem 으로 삭제한다 | 경매 물품을 삭제하면 200 이고 목록에서 사라진다 | ARI-REQ-082 · API POST /api/deleteauctionitem 200 | ARI-FN-114 | 2026-11-14 |
| 355 | 정상 | 「게임 서버」 계정이 있다 | 경매 물품 둘을 만든 뒤 POST /api/getauctionitems 를 부른다 | 경매 물품 목록을 부르면 200 과 만든 물품 둘이 다 들어 있다 | ARI-REQ-083 · API POST /api/getauctionitems 200 | ARI-FN-115 | 2026-11-14 |
| 356 | 예외 | 「게임 서버」 계정이 있다 | 없는 경매 물품 번호로 POST /api/saveauctionitem 을 부른다 | 없는 경매 물품 번호로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-084 · API POST /api/saveauctionitem 400 | ARI-FN-117 | 2026-11-14 |
| 357 | 예외 | 「게임 서버」 계정이 있다 | 없는 경매 물품 번호로 POST /api/deleteauctionitem 을 부른다 | 없는 경매 물품 번호로 삭제한 응답도 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-084 · API POST /api/deleteauctionitem 400 | ARI-FN-117 | 2026-11-14 |
| 358 | 정상 | 「게임 서버」 계정이 있다 | 가격을 음수로 넣은 저장 데이터로 경매 물품을 만든다 | 가격이 음수인 경매 물품을 만들면 막히지 않고 목록에 그대로 저장된다 | ARI-REQ-085 | ARI-FN-118 | 2026-11-14 |
| 359 | 예외 | 「게임 서버」 계정이 있다 | 같은 저장 데이터로 경매 물품을 두 번 만든다 | 같은 경매 물품을 두 번 등록하면 막히지 않고 서로 다른 번호 둘이 생긴다 | ARI-REQ-086 | ARI-FN-120 | 2026-11-14 |
| 360 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 SaveData 에 숫자를 넣어 POST /api/createauctionitem 을 부른다 | SaveData 에 숫자를 넣어 경매 물품을 만들면 400 이다 | API POST /api/createauctionitem 400 | ARI-FN-527 | 2026-11-14 |
| 361 | 정상 | 「게임 서버」 계정이 있다 | 새 ItemInstanceId 로 POST /api/createiteminstance 를 부른다 | 새 ItemInstanceId 로 아이템 인스턴스를 만들면 200 과 id 가 돌아온다 | ARI-REQ-087 · API POST /api/createiteminstance 200 | ARI-FN-121 | 2026-11-14 |
| 362 | 정상 | 「게임 서버」 계정이 있다 | 만든 뒤 POST /api/getiteminstances 를 부른다 | 만든 아이템 인스턴스가 목록에 보인다 | ARI-REQ-087 | ARI-FN-121 | 2026-11-14 |
| 363 | 정상 | 「게임 서버」 계정이 있다 | 만든 아이템 인스턴스를 다른 저장 데이터로 POST /api/saveiteminstance 한다 | 아이템 인스턴스를 저장하면 200 이고 목록의 saveData 가 보낸 값으로 바뀐다 | ARI-REQ-088 · API POST /api/saveiteminstance 200 | ARI-FN-122 | 2026-11-14 |
| 364 | 정상 | 「게임 서버」 계정이 있다 | 만든 아이템 인스턴스를 ItemInstanceId 로 POST /api/deleteiteminstance 한다 | ItemInstanceId 로 삭제하면 200 이고 그 아이템 인스턴스가 목록에서 사라진다 | ARI-REQ-089 · API POST /api/deleteiteminstance 200 | ARI-FN-123 | 2026-11-14 |
| 365 | 정상 | 「게임 서버」 계정이 있다 | 아이템 인스턴스 둘을 만든 뒤 POST /api/getiteminstances 를 부른다 | 아이템 인스턴스 목록을 부르면 200 과 만든 둘이 다 들어 있다 | ARI-REQ-090 · API POST /api/getiteminstances 200 | ARI-FN-124 | 2026-11-14 |
| 366 | 정상 | 「게임 서버」 계정이 있다 | 같은 ItemInstanceId 로 POST /api/createiteminstance 를 두 번 부른다 | 같은 ItemInstanceId 로 두 번 만들면 막히지 않고 그 번호의 행이 둘 생긴다 | ARI-REQ-091 | ARI-FN-125 | 2026-11-14 |
| 367 | 정상 | 「게임 서버」 계정이 있다 | 같은 ItemInstanceId 행 둘을 만든 뒤 그 번호로 저장한다 | 같은 ItemInstanceId 행이 둘일 때 저장하면 첫 행에만 적용된다 | ARI-REQ-092 | ARI-FN-126 | 2026-11-14 |
| 368 | 정상 | 「게임 서버」 계정이 있다 | 같은 ItemInstanceId 행 둘을 만든 뒤 그 번호로 삭제한다 | 삭제도 첫 행에만 적용되고 둘째 행은 남는다 | ARI-REQ-092 | ARI-FN-126 | 2026-11-14 |
| 369 | 예외 | 「게임 서버」 계정이 있다 | 없는 ItemInstanceId 로 POST /api/saveiteminstance 를 부른다 | 없는 ItemInstanceId 로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-093 · API POST /api/saveiteminstance 400 | ARI-FN-128 | 2026-11-14 |
| 370 | 예외 | 「게임 서버」 계정이 있다 | 없는 ItemInstanceId 로 POST /api/deleteiteminstance 를 부른다 | 없는 ItemInstanceId 로 삭제한 응답도 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-093 · API POST /api/deleteiteminstance 400 | ARI-FN-128 | 2026-11-14 |
| 371 | 정상 | 「게임 서버」 계정이 있다 | 없는 아이템 이름과 품질을 넣은 저장 데이터로 아이템 인스턴스를 만든다 | 없는 아이템 이름 · 품질로 만들면 막히지 않고 200 이다 | ARI-REQ-094 | ARI-FN-129 | 2026-11-14 |
| 372 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 ItemInstanceId 에 글자를 넣어 POST /api/createiteminstance 를 부른다 | ItemInstanceId 에 글자를 넣어 아이템 인스턴스를 만들면 400 이다 | API POST /api/createiteminstance 400 | ARI-FN-529 | 2026-11-14 |
| 373 | 정상 | 「게임 서버」 계정이 있다 | 만든 캐릭터에게 POST /api/createmailmessage 로 우편을 만든다 | 받는 캐릭터에게 우편을 만들면 200 과 id 가 돌아온다 | ARI-REQ-095 · API POST /api/createmailmessage 200 | ARI-FN-130 | 2026-11-14 |
| 374 | 정상 | 「게임 서버」 계정이 있다 | 만든 뒤 그 캐릭터 번호로 POST /api/getmailmessages 를 부른다 | 만든 우편이 받는 캐릭터의 우편 목록에 보인다 | ARI-REQ-095 | ARI-FN-130 | 2026-11-14 |
| 375 | 정상 | 「게임 서버」 계정이 있다 | 만든 우편을 다른 저장 데이터로 POST /api/savemailmessage 한다 | 우편을 저장하면 200 이고 그 우편의 saveData 가 보낸 값으로 바뀐다 | ARI-REQ-096 · API POST /api/savemailmessage 200 | ARI-FN-131 | 2026-11-14 |
| 376 | 정상 | 「게임 서버」 계정이 있다 | 만든 우편을 POST /api/deletemailmessage 로 삭제한다 | 우편을 삭제하면 200 이고 그 우편이 목록에서 사라진다 | ARI-REQ-097 · API POST /api/deletemailmessage 200 | ARI-FN-132 | 2026-11-14 |
| 377 | 정상 | 「게임 서버」 계정이 있다 | 우편 둘을 받은 캐릭터 번호로 POST /api/getmailmessages 를 부른다 | 캐릭터 번호로 우편 목록을 부르면 200 과 그 캐릭터가 받은 우편 둘이 돌아온다 | ARI-REQ-098 · API POST /api/getmailmessages 200 | ARI-FN-133 | 2026-11-14 |
| 378 | 정상 | 「게임 서버」 계정이 있다 | 만든 우편 번호로 POST /api/getmailmessage 를 부른다 | 우편 번호로 한 통을 부르면 200 과 그 우편의 id · playerCharacterId · saveData 가 돌아온다 | ARI-REQ-099 · API POST /api/getmailmessage 200 | ARI-FN-134 | 2026-11-14 |
| 379 | 예외 | 「게임 서버」 계정이 있다 | 없는 우편 번호로 POST /api/savemailmessage 를 부른다 | 없는 우편 번호로 저장하면 400 과 본문 「Error occured on server.  See server logs for more details.」이다 | ARI-REQ-100 · API POST /api/savemailmessage 400 | ARI-FN-136 | 2026-11-14 |
| 380 | 예외 | 「게임 서버」 계정이 있다 | 없는 우편 번호로 POST /api/deletemailmessage 를 부른다 | 없는 우편 번호로 삭제하면 400 과 본문 「Delete mail message failed.  Message not found.」이다 | ARI-REQ-101 · API POST /api/deletemailmessage 400 | ARI-FN-138 | 2026-11-14 |
| 381 | 예외 | 「게임 서버」 계정이 있다 | 없는 우편 번호로 POST /api/getmailmessage 를 부른다 | 없는 우편 번호로 한 통을 조회하면 400 과 본문 「Mail message not found.」이다 | ARI-REQ-102 · API POST /api/getmailmessage 400 | ARI-FN-140 | 2026-11-14 |
| 382 | 정상 | 「게임 서버」 계정이 있다 | 우편이 없는 캐릭터 번호로 POST /api/getmailmessages 를 부른다 | 우편이 없는 캐릭터의 우편 목록을 부르면 200 과 { "mailMessages": [] } 이다 | ARI-REQ-103 | ARI-FN-141 | 2026-11-14 |
| 383 | 정상 | 「게임 서버」 계정이 있다 | 없는 캐릭터 번호를 받는 캐릭터로 넣어 POST /api/createmailmessage 를 부른다 | 없는 받는 캐릭터 번호로 우편을 만들면 막히지 않고 200 과 id 가 돌아온다 | ARI-REQ-104 | ARI-FN-142 | 2026-11-14 |
| 384 | 예외 | 「게임 서버」 계정이 있다 | 다른 캐릭터에게 간 우편을 서버 토큰으로 조회한다 | 남의 우편을 조회하면 막히지 않고 200 이다 | ARI-REQ-105 | ARI-FN-144 | 2026-11-14 |
| 385 | 예외 | 「게임 서버」 계정이 있다 | 다른 캐릭터에게 간 우편을 서버 토큰으로 삭제한다 | 남의 우편 삭제도 막히지 않고 200 이다 | ARI-REQ-105 | ARI-FN-144 | 2026-11-14 |
| 386 | 정상 | 「게임 서버」 계정이 있다 | 요금 -1 · 첨부 100칸 · 제목 1,000자인 저장 데이터로 우편을 만든다 | 우편 요금 · 첨부 개수 · 제목 길이를 크게 넣으면 막히지 않고 200 이다 | ARI-REQ-106 | ARI-FN-145 | 2026-11-14 |
| 387 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에게 아이템을 지급한 뒤 그 우편의 첨부를 모두 빼고 POST /api/savemailmessage 한다 | 운영 지급 우편을 첨부를 뺀 채 저장하면 지급 기록의 우편 상태가 TAKEN 이 된다 | ARI-REQ-107 | ARI-FN-146 | 2026-11-14 |
| 388 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에게 지급한 우편을 POST /api/deletemailmessage 로 삭제한다 | 운영 지급 우편을 삭제하면 지급 기록의 우편 상태가 TAKEN 또는 DELETED_BY_PLAYER 가 된다 | ARI-REQ-108 | ARI-FN-147 | 2026-11-14 |
| 389 | 정상 | 「게임 서버」 계정이 있다 | 접속 중이 아닌 시험용 캐릭터에게 우편 번호와 재화 첨부를 비운 저장 데이터로 POST /api/createmailmessage 를 부른 뒤 그 우편을 읽는다 | 접속 중이 아닌 캐릭터에게 createmailmessage 로 우편을 보내면 서버가 저장 데이터에 우편 번호를 채워 넣지 않는다 | ARI-REQ-109 | ARI-FN-148 | 2026-11-14 |
| 390 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 PlayerCharacterId 에 글자를 넣어 POST /api/getmailmessages 를 부른다 | PlayerCharacterId 에 글자를 넣어 우편 목록을 부르면 400 이다 | API POST /api/getmailmessages 400 | ARI-FN-526 | 2026-11-14 |
| 391 | 예외 | 「게임 서버」 계정이 있다 | 서버 토큰으로 PlayerCharacterId 에 글자를 넣어 POST /api/createmailmessage 를 부른다 | PlayerCharacterId 에 글자를 넣어 우편을 만들면 400 이다 | API POST /api/createmailmessage 400 | ARI-FN-528 | 2026-11-14 |
| 392 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 계정 번호로 POST /api/getaccountrestrictions 를 부른다 | 계정 번호로 제한 상태를 부르면 200 과 물어본 accountId · 정지 · 채팅 금지 · 점검 차단 칸이 돌아온다 | ARI-REQ-117 · API POST /api/getaccountrestrictions 200 | ARI-FN-156 | 2026-11-14 |
| 393 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 정지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | 끝 시각을 정해 정지를 걸면 suspended 가 참이다 | ARI-REQ-118 | ARI-FN-157 | 2026-11-14 |
| 394 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 정지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | suspendedUntil 이 건 끝 시각과 같다 | ARI-REQ-118 | ARI-FN-157 | 2026-11-14 |
| 395 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 정지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | suspendReason 이 건 사유와 같다 | ARI-REQ-118 | ARI-FN-157 | 2026-11-14 |
| 396 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각 없이 정지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | 끝이 없는 정지의 suspendedUntil 은 null 이다 | ARI-REQ-118 | ARI-FN-157 | 2026-11-14 |
| 397 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 채팅 금지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | 끝 시각을 정해 채팅 금지를 걸면 chatMuted 가 참이다 | ARI-REQ-119 | ARI-FN-158 | 2026-11-14 |
| 398 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 채팅 금지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | chatMutedUntil 이 건 끝 시각과 같다 | ARI-REQ-119 | ARI-FN-158 | 2026-11-14 |
| 399 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」에 끝 시각을 정한 채팅 금지를 건 뒤 POST /api/getaccountrestrictions 를 부른다 | chatMuteReason 이 건 사유와 같다 | ARI-REQ-119 | ARI-FN-158 | 2026-11-14 |
| 400 | 정상 | 대상 서버 줄에 고정 운영 키가 있다 | 점검을 켠 채 허용 목록에 없는 「두 번째 플레이어」 계정 번호로 POST /api/getaccountrestrictions 를 부른다 | 점검 중 허용 목록에 없는 계정의 제한 상태를 부르면 maintenanceBlocked 가 참이다 | ARI-REQ-120 | ARI-FN-159 | 2026-11-14 |
| 401 | 정상 | 「일반 회원」 계정이 있다 | 없는 계정 번호와 「일반 회원」 계정 번호로 POST /api/getaccountrestrictions 를 부른다 | 없는 계정 번호로 제한 상태를 부르면 200 이고 제재 없는 계정과 같은 응답이다 | ARI-REQ-123 | ARI-FN-164 | 2026-11-14 |
| 402 | 정상 | 「두 번째 플레이어」 계정이 있다 | 「두 번째 플레이어」 캐릭터에게 골드를 지급한 뒤 그 우편의 첨부 아이템 인스턴스를 읽는다 | 재화를 지급하면 우편 첨부에 System Currency Loot Item 이 들어 있다 | ARI-REQ-156 | ARI-FN-206 | 2026-11-14 |
| 403 | 정상 | 「두 번째 플레이어」 계정이 있다 | 아이템 둘을 지급하고 첨부 하나만 뺀 채 우편을 저장한 뒤 그 지급을 회수한다 | 일부를 가져간 우편을 회수하면 지급 기록의 우편 상태가 PARTLY_RECALLED 다 | ARI-REQ-172 | ARI-FN-229 | 2026-11-14 |
| 404 | 정상 | 「두 번째 플레이어」 계정이 있다 | 아이템 둘을 지급하고 첨부 하나만 뺀 채 우편을 저장한 뒤 그 지급을 회수한다 | 일부를 가져간 우편은 회수한 뒤에도 남아 있다 | ARI-REQ-172 | ARI-FN-229 | 2026-11-14 |
| 405 | 정상 | 「게임 서버」 계정이 있다 | JSON 이 아닌 글자를 SaveData 로 넣어 길드를 만든 뒤 POST /api/getguilds 를 부른다 | JSON 이 아닌 글자를 SaveData 로 저장하면 보낸 글자 그대로 돌려준다 | ARI-REQ-267 | ARI-FN-352 | 2026-11-14 |

## 제외

| 요구 | 종류 | 사유 |
|------|------|------|
| ARI-REQ-001 | 환경 한계 | 시계 넘기기 — 토큰 만료 1일을 보려면 서버 시계를 앞으로 돌려야 한다 |
| ARI-REQ-002 | 환경 한계 | 시계 넘기기 — 토큰 만료 1일을 보려면 서버 시계를 앞으로 돌려야 한다 |
| ARI-REQ-003 | 환경 한계 | 시계 넘기기 — 토큰 만료 12시간을 보려면 서버 시계를 앞으로 돌려야 한다 |
| ARI-REQ-005 | 환경 한계 | 게임 서버 다시 켜기 — API 서버 설정을 비운 채 다시 띄워야 한다 |
| ARI-REQ-008 | 환경 한계 | 게임 서버 다시 켜기 — API 서버 설정을 바꿔 다시 띄워야 한다 |
| ARI-REQ-011 | 환경 한계 | 시계 넘기기 — 만료 뒤 1분 오차를 보려면 서버 시계를 앞으로 돌려야 한다 |
| ARI-REQ-022 | 환경 한계 | 게임 서버 다시 켜기 — API 서버 설정을 바꿔 다시 띄워야 한다 |
| ARI-REQ-023 | 환경 한계 | 게임 서버 다시 켜기 — API 서버 설정을 바꿔 다시 띄워야 한다 |
| ARI-REQ-190 | 환경 한계 | 서버 전체 초기화 — 점검 설정을 처음 상태로 되돌려야 한다 |
| ARI-REQ-213 | 환경 한계 | 케이스 한도를 넘는 기다림 — 10분 동안 아무 요청 없이 기다려야 한다 |
| API POST /api/getguilds 400 | 만들 수 없는 응답 | 본문을 읽지 않는 목록 API 라 400 을 낼 입력이 없다 |
| API POST /api/getfriendlists 400 | 만들 수 없는 응답 | 본문을 읽지 않는 목록 API 라 400 을 낼 입력이 없다 |
| API POST /api/getauctionitems 400 | 만들 수 없는 응답 | 본문을 읽지 않는 목록 API 라 400 을 낼 입력이 없다 |
| API POST /api/getiteminstances 400 | 만들 수 없는 응답 | 본문을 읽지 않는 목록 API 라 400 을 낼 입력이 없다 |
| API POST /api/getallplayercharacters 400 | 만들 수 없는 응답 | 본문을 읽지 않는 목록 API 라 400 을 낼 입력이 없다 |
