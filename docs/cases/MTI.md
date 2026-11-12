**덮는 범위** — 원장: 요구 2371 → 케이스 1133 · 제외 1238(계정 미등록 5 · 환경 한계 292 · 되돌릴 수 없음 6 · 자료 없음 622 · 만들 수 없는 응답 313) · 빠짐 0 · 번호 가족 MTI-NEW 499 · API 1872

## 요구사항

| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |
|------|----|------|------|------|------|------|----------|
| 1 | 정상 | 토큰이 없다 | POST /api/v1/apps 를 토큰 없이 부른다 | POST /api/v1/apps 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-001 · API POST /api/v1/apps 200 | MTI-FN-001 | 2026-11-11 |
| 2 | 정상 | 「Mastodon 앱」 앱 토큰이 있다 | GET /api/v1/apps/verify_credentials 를 「Mastodon 앱」 토큰으로 부른다 | GET /api/v1/apps/verify_credentials 를 「Mastodon 앱」 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-002 · API GET /api/v1/apps/verify_credentials 200 | MTI-FN-002 | 2026-11-11 |
| 3 | 예외 | 요청에 토큰이 없다 | GET /api/v1/apps/verify_credentials 를 토큰 없이 부른다 | GET /api/v1/apps/verify_credentials 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-002 · API GET /api/v1/apps/verify_credentials 401 | MTI-FN-003 | 2026-11-11 |
| 4 | 정상 | 토큰이 없다 | GET /oauth/authorize 를 토큰 없이 부른다 | GET /oauth/authorize 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-003 · API GET /oauth/authorize 200 | MTI-FN-004 | 2026-11-11 |
| 5 | 정상 | 토큰이 없다 | POST /oauth/token 을 토큰 없이 부른다 | POST /oauth/token 을 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-004 · API POST /oauth/token 200 | MTI-FN-005 | 2026-11-11 |
| 6 | 정상 | 토큰이 없다 | POST /oauth/revoke 를 토큰 없이 부른다 | POST /oauth/revoke 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-005 · API POST /oauth/revoke 200 | MTI-FN-006 | 2026-11-11 |
| 7 | 정상 | 일반 회원 토큰이 있다 | GET /oauth/userinfo 를 일반 회원 토큰으로 부른다 | GET /oauth/userinfo 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-006 · API GET /oauth/userinfo 200 |  | 2026-11-11 |
| 8 | 예외 | 요청에 토큰이 없다 | GET /oauth/userinfo 를 토큰 없이 부른다 | GET /oauth/userinfo 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-006 · API GET /oauth/userinfo 401 | MTI-FN-008 | 2026-11-11 |
| 9 | 정상 | 일반 회원 토큰이 있다 | POST /oauth/userinfo 를 일반 회원 토큰으로 부른다 | POST /oauth/userinfo 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-007 |  | 2026-11-11 |
| 10 | 예외 | 요청에 토큰이 없다 | POST /oauth/userinfo 를 토큰 없이 부른다 | POST /oauth/userinfo 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-007 | MTI-FN-010 | 2026-11-11 |
| 11 | 정상 | 토큰이 없다 | GET /.well-known/oauth-authorization-server 를 토큰 없이 부른다 | GET /.well-known/oauth-authorization-server 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-008 · API GET /.well-known/oauth-authorization-server 200 | MTI-FN-011 | 2026-11-11 |
| 12 | 정상 | 쓰기 범위 시험 앱 토큰이 있다 | POST /api/v1/accounts 를 쓰기 범위 시험 앱 토큰으로 부른다 | POST /api/v1/accounts 를 쓰기 범위 시험 앱 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-009 · API POST /api/v1/accounts 200 | MTI-FN-012 | 2026-11-11 |
| 13 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts 를 토큰 없이 부른다 | POST /api/v1/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-009 · API POST /api/v1/accounts 401 | MTI-FN-013 | 2026-11-11 |
| 14 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/verify_credentials 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/verify_credentials 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-010 · API GET /api/v1/accounts/verify_credentials 200 | MTI-FN-014 | 2026-11-11 |
| 15 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/verify_credentials 를 토큰 없이 부른다 | GET /api/v1/accounts/verify_credentials 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-010 · API GET /api/v1/accounts/verify_credentials 401 | MTI-FN-015 | 2026-11-11 |
| 16 | 정상 | 두 번째 사용자 토큰이 있다 | PATCH /api/v1/accounts/update_credentials 를 두 번째 사용자 토큰으로 부른다 | PATCH /api/v1/accounts/update_credentials 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-011 · API PATCH /api/v1/accounts/update_credentials 200 | MTI-FN-016 | 2026-11-11 |
| 17 | 예외 | 요청에 토큰이 없다 | PATCH /api/v1/accounts/update_credentials 를 토큰 없이 부른다 | PATCH /api/v1/accounts/update_credentials 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-011 · API PATCH /api/v1/accounts/update_credentials 401 | MTI-FN-017 | 2026-11-11 |
| 18 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/profile 를 일반 회원 토큰으로 부른다 | GET /api/v1/profile 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-012 · API GET /api/v1/profile 200 | MTI-FN-018 | 2026-11-11 |
| 19 | 예외 | 요청에 토큰이 없다 | GET /api/v1/profile 를 토큰 없이 부른다 | GET /api/v1/profile 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-012 · API GET /api/v1/profile 401 | MTI-FN-019 | 2026-11-11 |
| 20 | 정상 | 두 번째 사용자 토큰이 있다 | PATCH /api/v1/profile 를 두 번째 사용자 토큰으로 부른다 | PATCH /api/v1/profile 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-013 · API PATCH /api/v1/profile 200 | MTI-FN-020 | 2026-11-11 |
| 21 | 예외 | 요청에 토큰이 없다 | PATCH /api/v1/profile 를 토큰 없이 부른다 | PATCH /api/v1/profile 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-013 · API PATCH /api/v1/profile 401 | MTI-FN-021 | 2026-11-11 |
| 22 | 정상 | 두 번째 사용자 토큰이 있다 | DELETE /api/v1/profile/avatar 를 두 번째 사용자 토큰으로 부른다 | DELETE /api/v1/profile/avatar 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-014 · API DELETE /api/v1/profile/avatar 200 | MTI-FN-022 | 2026-11-11 |
| 23 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/profile/avatar 를 토큰 없이 부른다 | DELETE /api/v1/profile/avatar 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-014 · API DELETE /api/v1/profile/avatar 401 | MTI-FN-023 | 2026-11-11 |
| 24 | 정상 | 두 번째 사용자 토큰이 있다 | DELETE /api/v1/profile/header 를 두 번째 사용자 토큰으로 부른다 | DELETE /api/v1/profile/header 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-015 · API DELETE /api/v1/profile/header 200 | MTI-FN-024 | 2026-11-11 |
| 25 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/profile/header 를 토큰 없이 부른다 | DELETE /api/v1/profile/header 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-015 · API DELETE /api/v1/profile/header 401 | MTI-FN-025 | 2026-11-11 |
| 26 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/preferences 를 일반 회원 토큰으로 부른다 | GET /api/v1/preferences 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-016 · API GET /api/v1/preferences 200 | MTI-FN-026 | 2026-11-11 |
| 27 | 예외 | 요청에 토큰이 없다 | GET /api/v1/preferences 를 토큰 없이 부른다 | GET /api/v1/preferences 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-016 · API GET /api/v1/preferences 401 | MTI-FN-027 | 2026-11-11 |
| 28 | 정상 | 방금 가입한 계정 토큰이 있다 | POST /api/v1/emails/confirmations 를 방금 가입한 계정 토큰으로 부른다 | POST /api/v1/emails/confirmations 를 방금 가입한 계정 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-017 · API POST /api/v1/emails/confirmations 200 | MTI-FN-028 | 2026-11-11 |
| 29 | 예외 | 요청에 토큰이 없다 | POST /api/v1/emails/confirmations 를 토큰 없이 부른다 | POST /api/v1/emails/confirmations 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-017 · API POST /api/v1/emails/confirmations 401 | MTI-FN-029 | 2026-11-11 |
| 30 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/emails/check_confirmation 을 일반 회원 토큰으로 부른다 | GET /api/v1/emails/check_confirmation 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-018 | MTI-FN-030 | 2026-11-11 |
| 31 | 예외 | 요청에 토큰이 없다 | GET /api/v1/emails/check_confirmation 을 토큰 없이 부른다 | GET /api/v1/emails/check_confirmation 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-018 | MTI-FN-031 | 2026-11-11 |
| 32 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/annual_reports 를 일반 회원 토큰으로 부른다 | GET /api/v1/annual_reports 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-019 · API GET /api/v1/annual_reports 200 | MTI-FN-032 | 2026-11-11 |
| 33 | 예외 | 요청에 토큰이 없다 | GET /api/v1/annual_reports 를 토큰 없이 부른다 | GET /api/v1/annual_reports 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-019 · API GET /api/v1/annual_reports 401 | MTI-FN-033 | 2026-11-11 |
| 34 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/annual_reports/{year} 를 일반 회원 토큰으로 부른다 | GET /api/v1/annual_reports/{year} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-020 · API GET /api/v1/annual_reports/{year} 200 |  | 2026-11-11 |
| 35 | 예외 | 요청에 토큰이 없다 | GET /api/v1/annual_reports/{year} 를 토큰 없이 부른다 | GET /api/v1/annual_reports/{year} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-020 · API GET /api/v1/annual_reports/{year} 401 | MTI-FN-035 | 2026-11-11 |
| 36 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/annual_reports/{year} 를 없는 연도로 부른다 | GET /api/v1/annual_reports/{year} 를 없는 연도로 부른 응답 코드가 404 다 | MTI-REQ-020 · API GET /api/v1/annual_reports/{year} 404 | MTI-FN-035 | 2026-11-11 |
| 37 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/annual_reports/{year}/state 를 일반 회원 토큰으로 부른다 | GET /api/v1/annual_reports/{year}/state 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-021 · API GET /api/v1/annual_reports/{year}/state 200 | MTI-FN-036 | 2026-11-11 |
| 38 | 예외 | 요청에 토큰이 없다 | GET /api/v1/annual_reports/{year}/state 를 토큰 없이 부른다 | GET /api/v1/annual_reports/{year}/state 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-021 · API GET /api/v1/annual_reports/{year}/state 401 | MTI-FN-037 | 2026-11-11 |
| 39 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/annual_reports/{year}/state 를 없는 연도로 부른다 | GET /api/v1/annual_reports/{year}/state 를 없는 연도로 부른 응답 코드가 404 다 | MTI-REQ-021 · API GET /api/v1/annual_reports/{year}/state 404 | MTI-FN-037 | 2026-11-11 |
| 40 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/annual_reports/{year}/read 를 일반 회원 토큰으로 부른다 | POST /api/v1/annual_reports/{year}/read 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-022 · API POST /api/v1/annual_reports/{year}/read 200 |  | 2026-11-11 |
| 41 | 예외 | 요청에 토큰이 없다 | POST /api/v1/annual_reports/{year}/read 를 토큰 없이 부른다 | POST /api/v1/annual_reports/{year}/read 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-022 · API POST /api/v1/annual_reports/{year}/read 401 | MTI-FN-039 | 2026-11-11 |
| 42 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/annual_reports/{year}/read 를 없는 연도로 부른다 | POST /api/v1/annual_reports/{year}/read 를 없는 연도로 부른 응답 코드가 404 다 | MTI-REQ-022 · API POST /api/v1/annual_reports/{year}/read 404 | MTI-FN-039 | 2026-11-11 |
| 43 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/annual_reports/{year}/generate 를 일반 회원 토큰으로 부른다 | POST /api/v1/annual_reports/{year}/generate 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-023 · API POST /api/v1/annual_reports/{year}/generate 200 | MTI-FN-040 | 2026-11-11 |
| 44 | 예외 | 요청에 토큰이 없다 | POST /api/v1/annual_reports/{year}/generate 를 토큰 없이 부른다 | POST /api/v1/annual_reports/{year}/generate 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-023 · API POST /api/v1/annual_reports/{year}/generate 401 | MTI-FN-041 | 2026-11-11 |
| 45 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/annual_reports/{year}/generate 를 없는 연도로 부른다 | POST /api/v1/annual_reports/{year}/generate 를 없는 연도로 부른 응답 코드가 404 다 | MTI-REQ-023 · API POST /api/v1/annual_reports/{year}/generate 404 | MTI-FN-041 | 2026-11-11 |
| 46 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/endorsements 를 일반 회원 토큰으로 부른다 | GET /api/v1/endorsements 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-024 · API GET /api/v1/endorsements 200 | MTI-FN-042 | 2026-11-11 |
| 47 | 예외 | 요청에 토큰이 없다 | GET /api/v1/endorsements 를 토큰 없이 부른다 | GET /api/v1/endorsements 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-024 · API GET /api/v1/endorsements 401 | MTI-FN-043 | 2026-11-11 |
| 48 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id} 를 토큰 없이 부른다 | GET /api/v1/accounts/{id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-025 · API GET /api/v1/accounts/{id} 200 | MTI-FN-044 | 2026-11-11 |
| 49 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id} 를 없는 번호로 부른다 | GET /api/v1/accounts/{id} 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-025 · API GET /api/v1/accounts/{id} 404 | MTI-FN-045 | 2026-11-11 |
| 50 | 정상 | 토큰이 없다 | GET /api/v1/accounts?id[]={id}&id[]={id} 를 토큰 없이 부른다 | GET /api/v1/accounts?id[]={id}&id[]={id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-026 · API GET /api/v1/accounts 200 | MTI-FN-046 | 2026-11-11 |
| 51 | 정상 | 토큰이 없다 | GET /api/v1/accounts/lookup?acct=hana_photo 를 토큰 없이 부른다 | GET /api/v1/accounts/lookup?acct=hana_photo 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-027 · API GET /api/v1/accounts/lookup 200 | MTI-FN-047 | 2026-11-11 |
| 52 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/search?q=hana 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/search?q=hana 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-028 · API GET /api/v1/accounts/search 200 | MTI-FN-048 | 2026-11-11 |
| 53 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/search?q=hana 를 토큰 없이 부른다 | GET /api/v1/accounts/search?q=hana 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-028 · API GET /api/v1/accounts/search 401 | MTI-FN-049 | 2026-11-11 |
| 54 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/relationships?id[]={id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/relationships?id[]={id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-029 · API GET /api/v1/accounts/relationships 200 | MTI-FN-050 | 2026-11-11 |
| 55 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/relationships?id[]={id} 를 토큰 없이 부른다 | GET /api/v1/accounts/relationships?id[]={id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-029 · API GET /api/v1/accounts/relationships 401 | MTI-FN-051 | 2026-11-11 |
| 56 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/familiar_followers?id[]={id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/familiar_followers?id[]={id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-030 · API GET /api/v1/accounts/familiar_followers 200 | MTI-FN-052 | 2026-11-11 |
| 57 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/familiar_followers?id[]={id} 를 토큰 없이 부른다 | GET /api/v1/accounts/familiar_followers?id[]={id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-030 · API GET /api/v1/accounts/familiar_followers 401 | MTI-FN-053 | 2026-11-11 |
| 58 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id}/statuses 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/statuses 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-031 · API GET /api/v1/accounts/{id}/statuses 200 | MTI-FN-054 | 2026-11-11 |
| 59 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id}/statuses 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/statuses 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-031 · API GET /api/v1/accounts/{id}/statuses 404 | MTI-FN-055 | 2026-11-11 |
| 60 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id}/followers 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/followers 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-032 · API GET /api/v1/accounts/{id}/followers 200 | MTI-FN-056 | 2026-11-11 |
| 61 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id}/followers 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/followers 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-032 · API GET /api/v1/accounts/{id}/followers 404 | MTI-FN-057 | 2026-11-11 |
| 62 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id}/following 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/following 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-033 · API GET /api/v1/accounts/{id}/following 200 | MTI-FN-058 | 2026-11-11 |
| 63 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id}/following 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/following 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-033 · API GET /api/v1/accounts/{id}/following 404 | MTI-FN-059 | 2026-11-11 |
| 64 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id}/featured_tags 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/featured_tags 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-034 · API GET /api/v1/accounts/{id}/featured_tags 200 | MTI-FN-060 | 2026-11-11 |
| 65 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id}/featured_tags 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/featured_tags 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-034 · API GET /api/v1/accounts/{id}/featured_tags 404 | MTI-FN-061 | 2026-11-11 |
| 66 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id}/endorsements 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/endorsements 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-035 · API GET /api/v1/accounts/{id}/endorsements 200 | MTI-FN-062 | 2026-11-11 |
| 67 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{id}/endorsements 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/endorsements 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-035 · API GET /api/v1/accounts/{id}/endorsements 404 | MTI-FN-063 | 2026-11-11 |
| 68 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{id}/lists 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/{id}/lists 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-036 · API GET /api/v1/accounts/{id}/lists 200 | MTI-FN-064 | 2026-11-11 |
| 69 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/{id}/lists 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/lists 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-036 · API GET /api/v1/accounts/{id}/lists 401 | MTI-FN-065 | 2026-11-11 |
| 70 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{id}/lists 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/lists 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-036 · API GET /api/v1/accounts/{id}/lists 404 | MTI-FN-065 | 2026-11-11 |
| 71 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{id}/identity_proofs 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/{id}/identity_proofs 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-037 · API GET /api/v1/accounts/{id}/identity_proofs 200 | MTI-FN-066 | 2026-11-11 |
| 72 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/{id}/identity_proofs 를 토큰 없이 부른다 | GET /api/v1/accounts/{id}/identity_proofs 를 토큰 없이 부르면 응답 코드가 422 다 | MTI-REQ-037 · API GET /api/v1/accounts/{id}/identity_proofs 422 | MTI-FN-067 | 2026-11-11 |
| 73 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{id}/identity_proofs 를 없는 번호로 부른다 | GET /api/v1/accounts/{id}/identity_proofs 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-037 · API GET /api/v1/accounts/{id}/identity_proofs 404 | MTI-FN-067 | 2026-11-11 |
| 74 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/follow 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/follow 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-038 · API POST /api/v1/accounts/{id}/follow 200 | MTI-FN-068 | 2026-11-11 |
| 75 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/follow 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/follow 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-038 · API POST /api/v1/accounts/{id}/follow 401 | MTI-FN-069 | 2026-11-11 |
| 76 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/follow 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/follow 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-038 · API POST /api/v1/accounts/{id}/follow 404 | MTI-FN-069 | 2026-11-11 |
| 77 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unfollow 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/unfollow 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-039 · API POST /api/v1/accounts/{id}/unfollow 200 | MTI-FN-070 | 2026-11-11 |
| 78 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/unfollow 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/unfollow 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-039 · API POST /api/v1/accounts/{id}/unfollow 401 | MTI-FN-071 | 2026-11-11 |
| 79 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unfollow 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/unfollow 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-039 · API POST /api/v1/accounts/{id}/unfollow 404 | MTI-FN-071 | 2026-11-11 |
| 80 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/remove_from_followers 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/accounts/{id}/remove_from_followers 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-040 · API POST /api/v1/accounts/{id}/remove_from_followers 200 | MTI-FN-072 | 2026-11-11 |
| 81 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/remove_from_followers 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/remove_from_followers 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-040 · API POST /api/v1/accounts/{id}/remove_from_followers 401 | MTI-FN-073 | 2026-11-11 |
| 82 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/remove_from_followers 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/remove_from_followers 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-040 · API POST /api/v1/accounts/{id}/remove_from_followers 404 | MTI-FN-073 | 2026-11-11 |
| 83 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/block 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/block 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-041 · API POST /api/v1/accounts/{id}/block 200 | MTI-FN-074 | 2026-11-11 |
| 84 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/block 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/block 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-041 · API POST /api/v1/accounts/{id}/block 401 | MTI-FN-075 | 2026-11-11 |
| 85 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/block 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/block 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-041 · API POST /api/v1/accounts/{id}/block 404 | MTI-FN-075 | 2026-11-11 |
| 86 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unblock 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/unblock 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-042 · API POST /api/v1/accounts/{id}/unblock 200 | MTI-FN-076 | 2026-11-11 |
| 87 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/unblock 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/unblock 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-042 · API POST /api/v1/accounts/{id}/unblock 401 | MTI-FN-077 | 2026-11-11 |
| 88 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unblock 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/unblock 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-042 · API POST /api/v1/accounts/{id}/unblock 404 | MTI-FN-077 | 2026-11-11 |
| 89 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/mute 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/accounts/{id}/mute 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-043 · API POST /api/v1/accounts/{id}/mute 200 | MTI-FN-078 | 2026-11-11 |
| 90 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/mute 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/mute 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-043 · API POST /api/v1/accounts/{id}/mute 401 | MTI-FN-079 | 2026-11-11 |
| 91 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/mute 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/mute 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-043 · API POST /api/v1/accounts/{id}/mute 404 | MTI-FN-079 | 2026-11-11 |
| 92 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/unmute 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/accounts/{id}/unmute 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-044 · API POST /api/v1/accounts/{id}/unmute 200 | MTI-FN-080 | 2026-11-11 |
| 93 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/unmute 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/unmute 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-044 · API POST /api/v1/accounts/{id}/unmute 401 | MTI-FN-081 | 2026-11-11 |
| 94 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/accounts/{id}/unmute 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/unmute 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-044 · API POST /api/v1/accounts/{id}/unmute 404 | MTI-FN-081 | 2026-11-11 |
| 95 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/pin 을 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/pin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-045 · API POST /api/v1/accounts/{id}/pin 200 | MTI-FN-082 | 2026-11-11 |
| 96 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/pin 을 토큰 없이 부른다 | POST /api/v1/accounts/{id}/pin 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-045 · API POST /api/v1/accounts/{id}/pin 401 | MTI-FN-083 | 2026-11-11 |
| 97 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/pin 을 없는 번호로 부른다 | POST /api/v1/accounts/{id}/pin 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-045 · API POST /api/v1/accounts/{id}/pin 404 | MTI-FN-083 | 2026-11-11 |
| 98 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unpin 을 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/unpin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-046 · API POST /api/v1/accounts/{id}/unpin 200 | MTI-FN-084 | 2026-11-11 |
| 99 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/unpin 을 토큰 없이 부른다 | POST /api/v1/accounts/{id}/unpin 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-046 · API POST /api/v1/accounts/{id}/unpin 401 | MTI-FN-085 | 2026-11-11 |
| 100 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unpin 을 없는 번호로 부른다 | POST /api/v1/accounts/{id}/unpin 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-046 · API POST /api/v1/accounts/{id}/unpin 404 | MTI-FN-085 | 2026-11-11 |
| 101 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/endorse 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/endorse 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-047 · API POST /api/v1/accounts/{id}/endorse 200 | MTI-FN-086 | 2026-11-11 |
| 102 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/endorse 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/endorse 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-047 · API POST /api/v1/accounts/{id}/endorse 401 | MTI-FN-087 | 2026-11-11 |
| 103 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/endorse 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/endorse 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-047 · API POST /api/v1/accounts/{id}/endorse 404 | MTI-FN-087 | 2026-11-11 |
| 104 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unendorse 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/unendorse 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-048 · API POST /api/v1/accounts/{id}/unendorse 200 | MTI-FN-088 | 2026-11-11 |
| 105 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/unendorse 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/unendorse 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-048 · API POST /api/v1/accounts/{id}/unendorse 401 | MTI-FN-089 | 2026-11-11 |
| 106 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/unendorse 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/unendorse 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-048 · API POST /api/v1/accounts/{id}/unendorse 404 | MTI-FN-089 | 2026-11-11 |
| 107 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/note 를 일반 회원 토큰으로 부른다 | POST /api/v1/accounts/{id}/note 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-049 · API POST /api/v1/accounts/{id}/note 200 | MTI-FN-090 | 2026-11-11 |
| 108 | 예외 | 요청에 토큰이 없다 | POST /api/v1/accounts/{id}/note 를 토큰 없이 부른다 | POST /api/v1/accounts/{id}/note 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-049 · API POST /api/v1/accounts/{id}/note 401 | MTI-FN-091 | 2026-11-11 |
| 109 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/accounts/{id}/note 를 없는 번호로 부른다 | POST /api/v1/accounts/{id}/note 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-049 · API POST /api/v1/accounts/{id}/note 404 | MTI-FN-091 | 2026-11-11 |
| 110 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/blocks 를 일반 회원 토큰으로 부른다 | GET /api/v1/blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-050 · API GET /api/v1/blocks 200 | MTI-FN-092 | 2026-11-11 |
| 111 | 예외 | 요청에 토큰이 없다 | GET /api/v1/blocks 를 토큰 없이 부른다 | GET /api/v1/blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-050 · API GET /api/v1/blocks 401 | MTI-FN-093 | 2026-11-11 |
| 112 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/mutes 를 일반 회원 토큰으로 부른다 | GET /api/v1/mutes 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-051 · API GET /api/v1/mutes 200 | MTI-FN-094 | 2026-11-11 |
| 113 | 예외 | 요청에 토큰이 없다 | GET /api/v1/mutes 를 토큰 없이 부른다 | GET /api/v1/mutes 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-051 · API GET /api/v1/mutes 401 | MTI-FN-095 | 2026-11-11 |
| 114 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/domain_blocks 를 일반 회원 토큰으로 부른다 | GET /api/v1/domain_blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-052 · API GET /api/v1/domain_blocks 200 | MTI-FN-096 | 2026-11-11 |
| 115 | 예외 | 요청에 토큰이 없다 | GET /api/v1/domain_blocks 를 토큰 없이 부른다 | GET /api/v1/domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-052 · API GET /api/v1/domain_blocks 401 | MTI-FN-097 | 2026-11-11 |
| 116 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/domain_blocks 를 일반 회원 토큰으로 부른다 | POST /api/v1/domain_blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-053 · API POST /api/v1/domain_blocks 200 | MTI-FN-098 | 2026-11-11 |
| 117 | 예외 | 요청에 토큰이 없다 | POST /api/v1/domain_blocks 를 토큰 없이 부른다 | POST /api/v1/domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-053 · API POST /api/v1/domain_blocks 401 | MTI-FN-099 | 2026-11-11 |
| 118 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/domain_blocks 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/domain_blocks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-054 · API DELETE /api/v1/domain_blocks 200 | MTI-FN-100 | 2026-11-11 |
| 119 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/domain_blocks 를 토큰 없이 부른다 | DELETE /api/v1/domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-054 · API DELETE /api/v1/domain_blocks 401 | MTI-FN-101 | 2026-11-11 |
| 120 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/domain_blocks/preview?domain=spam.example 를 일반 회원 토큰으로 부른다 | GET /api/v1/domain_blocks/preview?domain=spam.example 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-055 | MTI-FN-102 | 2026-11-11 |
| 121 | 예외 | 요청에 토큰이 없다 | GET /api/v1/domain_blocks/preview?domain=spam.example 를 토큰 없이 부른다 | GET /api/v1/domain_blocks/preview?domain=spam.example 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-055 | MTI-FN-103 | 2026-11-11 |
| 122 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/follow_requests 를 일반 회원 토큰으로 부른다 | GET /api/v1/follow_requests 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-056 · API GET /api/v1/follow_requests 200 | MTI-FN-104 | 2026-11-11 |
| 123 | 예외 | 요청에 토큰이 없다 | GET /api/v1/follow_requests 를 토큰 없이 부른다 | GET /api/v1/follow_requests 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-056 · API GET /api/v1/follow_requests 401 | MTI-FN-105 | 2026-11-11 |
| 124 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/follow_requests/{account_id}/authorize 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/follow_requests/{account_id}/authorize 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-057 · API POST /api/v1/follow_requests/{account_id}/authorize 200 | MTI-FN-106 | 2026-11-11 |
| 125 | 예외 | 요청에 토큰이 없다 | POST /api/v1/follow_requests/{account_id}/authorize 를 토큰 없이 부른다 | POST /api/v1/follow_requests/{account_id}/authorize 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-057 · API POST /api/v1/follow_requests/{account_id}/authorize 401 | MTI-FN-107 | 2026-11-11 |
| 126 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/follow_requests/{account_id}/authorize 를 없는 번호로 부른다 | POST /api/v1/follow_requests/{account_id}/authorize 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-057 · API POST /api/v1/follow_requests/{account_id}/authorize 404 | MTI-FN-107 | 2026-11-11 |
| 127 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/follow_requests/{account_id}/reject 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/follow_requests/{account_id}/reject 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-058 · API POST /api/v1/follow_requests/{account_id}/reject 200 | MTI-FN-108 | 2026-11-11 |
| 128 | 예외 | 요청에 토큰이 없다 | POST /api/v1/follow_requests/{account_id}/reject 를 토큰 없이 부른다 | POST /api/v1/follow_requests/{account_id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-058 · API POST /api/v1/follow_requests/{account_id}/reject 401 | MTI-FN-109 | 2026-11-11 |
| 129 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/follow_requests/{account_id}/reject 를 없는 번호로 부른다 | POST /api/v1/follow_requests/{account_id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-058 · API POST /api/v1/follow_requests/{account_id}/reject 404 | MTI-FN-109 | 2026-11-11 |
| 130 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/suggestions 를 일반 회원 토큰으로 부른다 | GET /api/v1/suggestions 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-059 · API GET /api/v1/suggestions 200 | MTI-FN-110 | 2026-11-11 |
| 131 | 예외 | 요청에 토큰이 없다 | GET /api/v1/suggestions 를 토큰 없이 부른다 | GET /api/v1/suggestions 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-059 · API GET /api/v1/suggestions 401 | MTI-FN-111 | 2026-11-11 |
| 132 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/suggestions 를 일반 회원 토큰으로 부른다 | GET /api/v2/suggestions 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-060 · API GET /api/v2/suggestions 200 | MTI-FN-112 | 2026-11-11 |
| 133 | 예외 | 요청에 토큰이 없다 | GET /api/v2/suggestions 를 토큰 없이 부른다 | GET /api/v2/suggestions 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-060 · API GET /api/v2/suggestions 401 | MTI-FN-113 | 2026-11-11 |
| 134 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/suggestions/{account_id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/suggestions/{account_id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-061 · API DELETE /api/v1/suggestions/{account_id} 200 | MTI-FN-114 | 2026-11-11 |
| 135 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/suggestions/{account_id} 를 토큰 없이 부른다 | DELETE /api/v1/suggestions/{account_id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-061 · API DELETE /api/v1/suggestions/{account_id} 401 | MTI-FN-115 | 2026-11-11 |
| 136 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/suggestions/{account_id} 를 없는 번호로 부른다 | DELETE /api/v1/suggestions/{account_id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-061 · API DELETE /api/v1/suggestions/{account_id} 404 | MTI-FN-115 | 2026-11-11 |
| 137 | 정상 | 토큰이 없다 | GET /api/v1/directory 를 토큰 없이 부른다 | GET /api/v1/directory 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-062 · API GET /api/v1/directory 200 | MTI-FN-116 | 2026-11-11 |
| 138 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-063 · API POST /api/v1/statuses 200 | MTI-FN-117 | 2026-11-11 |
| 139 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses 를 토큰 없이 부른다 | POST /api/v1/statuses 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-063 · API POST /api/v1/statuses 401 | MTI-FN-118 | 2026-11-11 |
| 140 | 정상 | 토큰이 없다 | GET /api/v1/statuses/{id} 를 토큰 없이 부른다 | GET /api/v1/statuses/{id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-064 · API GET /api/v1/statuses/{id} 200 | MTI-FN-119 | 2026-11-11 |
| 141 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id} 를 없는 번호로 부른다 | GET /api/v1/statuses/{id} 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-064 · API GET /api/v1/statuses/{id} 404 | MTI-FN-120 | 2026-11-11 |
| 142 | 정상 | 토큰이 없다 | GET /api/v1/statuses?id[]={id}&id[]={id} 를 토큰 없이 부른다 | GET /api/v1/statuses?id[]={id}&id[]={id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-065 · API GET /api/v1/statuses 200 | MTI-FN-121 | 2026-11-11 |
| 143 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/statuses/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-066 · API PUT /api/v1/statuses/{id} 200 | MTI-FN-122 | 2026-11-11 |
| 144 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/statuses/{id} 를 토큰 없이 부른다 | PUT /api/v1/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-066 · API PUT /api/v1/statuses/{id} 401 | MTI-FN-123 | 2026-11-11 |
| 145 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/statuses/{id} 를 없는 번호로 부른다 | PUT /api/v1/statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-066 · API PUT /api/v1/statuses/{id} 404 | MTI-FN-123 | 2026-11-11 |
| 146 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/statuses/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-067 · API DELETE /api/v1/statuses/{id} 200 | MTI-FN-124 | 2026-11-11 |
| 147 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/statuses/{id} 를 토큰 없이 부른다 | DELETE /api/v1/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-067 · API DELETE /api/v1/statuses/{id} 401 | MTI-FN-125 | 2026-11-11 |
| 148 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/statuses/{id} 를 없는 번호로 부른다 | DELETE /api/v1/statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-067 · API DELETE /api/v1/statuses/{id} 404 | MTI-FN-125 | 2026-11-11 |
| 149 | 정상 | 토큰이 없다 | GET /api/v1/statuses/{id}/context 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/context 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-068 · API GET /api/v1/statuses/{id}/context 200 | MTI-FN-126 | 2026-11-11 |
| 150 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id}/context 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/context 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-068 · API GET /api/v1/statuses/{id}/context 404 | MTI-FN-127 | 2026-11-11 |
| 151 | 정상 | 토큰이 없다 | GET /api/v1/statuses/{id}/history 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/history 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-069 · API GET /api/v1/statuses/{id}/history 200 | MTI-FN-128 | 2026-11-11 |
| 152 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id}/history 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/history 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-069 · API GET /api/v1/statuses/{id}/history 404 | MTI-FN-129 | 2026-11-11 |
| 153 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/statuses/{id}/source 를 일반 회원 토큰으로 부른다 | GET /api/v1/statuses/{id}/source 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-070 · API GET /api/v1/statuses/{id}/source 200 | MTI-FN-130 | 2026-11-11 |
| 154 | 예외 | 요청에 토큰이 없다 | GET /api/v1/statuses/{id}/source 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/source 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-070 · API GET /api/v1/statuses/{id}/source 401 | MTI-FN-131 | 2026-11-11 |
| 155 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/statuses/{id}/source 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/source 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-070 · API GET /api/v1/statuses/{id}/source 404 | MTI-FN-131 | 2026-11-11 |
| 156 | 정상 | 토큰이 없다 | GET /api/v1/statuses/{id}/reblogged_by 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/reblogged_by 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-071 · API GET /api/v1/statuses/{id}/reblogged_by 200 | MTI-FN-132 | 2026-11-11 |
| 157 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id}/reblogged_by 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/reblogged_by 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-071 · API GET /api/v1/statuses/{id}/reblogged_by 404 | MTI-FN-133 | 2026-11-11 |
| 158 | 정상 | 토큰이 없다 | GET /api/v1/statuses/{id}/favourited_by 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/favourited_by 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-072 · API GET /api/v1/statuses/{id}/favourited_by 200 | MTI-FN-134 | 2026-11-11 |
| 159 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id}/favourited_by 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/favourited_by 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-072 · API GET /api/v1/statuses/{id}/favourited_by 404 | MTI-FN-135 | 2026-11-11 |
| 160 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/statuses/{id}/quotes 를 일반 회원 토큰으로 부른다 | GET /api/v1/statuses/{id}/quotes 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-073 · API GET /api/v1/statuses/{id}/quotes 200 | MTI-FN-136 | 2026-11-11 |
| 161 | 예외 | 요청에 토큰이 없다 | GET /api/v1/statuses/{id}/quotes 를 토큰 없이 부른다 | GET /api/v1/statuses/{id}/quotes 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-073 · API GET /api/v1/statuses/{id}/quotes 401 | MTI-FN-137 | 2026-11-11 |
| 162 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/statuses/{id}/quotes 를 없는 번호로 부른다 | GET /api/v1/statuses/{id}/quotes 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-073 · API GET /api/v1/statuses/{id}/quotes 404 | MTI-FN-137 | 2026-11-11 |
| 163 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-074 · API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 200 | MTI-FN-138 | 2026-11-11 |
| 164 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-074 · API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 401 | MTI-FN-139 | 2026-11-11 |
| 165 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-074 · API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 404 | MTI-FN-139 | 2026-11-11 |
| 166 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/statuses/{id}/interaction_policy 를 일반 회원 토큰으로 부른다 | PUT /api/v1/statuses/{id}/interaction_policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-075 · API PUT /api/v1/statuses/{id}/interaction_policy 200 | MTI-FN-140 | 2026-11-11 |
| 167 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/statuses/{id}/interaction_policy 를 토큰 없이 부른다 | PUT /api/v1/statuses/{id}/interaction_policy 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-075 · API PUT /api/v1/statuses/{id}/interaction_policy 401 | MTI-FN-141 | 2026-11-11 |
| 168 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/statuses/{id}/interaction_policy 를 없는 번호로 부른다 | PUT /api/v1/statuses/{id}/interaction_policy 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-075 · API PUT /api/v1/statuses/{id}/interaction_policy 404 | MTI-FN-141 | 2026-11-11 |
| 169 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/reblog 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/reblog 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-076 · API POST /api/v1/statuses/{id}/reblog 200 | MTI-FN-142 | 2026-11-11 |
| 170 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/reblog 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/reblog 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-076 · API POST /api/v1/statuses/{id}/reblog 401 | MTI-FN-143 | 2026-11-11 |
| 171 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/reblog 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/reblog 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-076 · API POST /api/v1/statuses/{id}/reblog 404 | MTI-FN-143 | 2026-11-11 |
| 172 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unreblog 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/unreblog 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-077 · API POST /api/v1/statuses/{id}/unreblog 200 | MTI-FN-144 | 2026-11-11 |
| 173 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/unreblog 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/unreblog 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-077 · API POST /api/v1/statuses/{id}/unreblog 401 | MTI-FN-145 | 2026-11-11 |
| 174 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unreblog 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/unreblog 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-077 · API POST /api/v1/statuses/{id}/unreblog 404 | MTI-FN-145 | 2026-11-11 |
| 175 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/favourite 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/favourite 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-078 · API POST /api/v1/statuses/{id}/favourite 200 | MTI-FN-146 | 2026-11-11 |
| 176 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/favourite 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/favourite 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-078 · API POST /api/v1/statuses/{id}/favourite 401 | MTI-FN-147 | 2026-11-11 |
| 177 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/favourite 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/favourite 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-078 · API POST /api/v1/statuses/{id}/favourite 404 | MTI-FN-147 | 2026-11-11 |
| 178 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unfavourite 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/unfavourite 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-079 · API POST /api/v1/statuses/{id}/unfavourite 200 | MTI-FN-148 | 2026-11-11 |
| 179 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/unfavourite 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/unfavourite 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-079 · API POST /api/v1/statuses/{id}/unfavourite 401 | MTI-FN-149 | 2026-11-11 |
| 180 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unfavourite 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/unfavourite 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-079 · API POST /api/v1/statuses/{id}/unfavourite 404 | MTI-FN-149 | 2026-11-11 |
| 181 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/bookmark 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/bookmark 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-080 · API POST /api/v1/statuses/{id}/bookmark 200 | MTI-FN-150 | 2026-11-11 |
| 182 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/bookmark 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/bookmark 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-080 · API POST /api/v1/statuses/{id}/bookmark 401 | MTI-FN-151 | 2026-11-11 |
| 183 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/bookmark 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/bookmark 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-080 · API POST /api/v1/statuses/{id}/bookmark 404 | MTI-FN-151 | 2026-11-11 |
| 184 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unbookmark 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/unbookmark 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-081 · API POST /api/v1/statuses/{id}/unbookmark 200 | MTI-FN-152 | 2026-11-11 |
| 185 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/unbookmark 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/unbookmark 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-081 · API POST /api/v1/statuses/{id}/unbookmark 401 | MTI-FN-153 | 2026-11-11 |
| 186 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unbookmark 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/unbookmark 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-081 · API POST /api/v1/statuses/{id}/unbookmark 404 | MTI-FN-153 | 2026-11-11 |
| 187 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/mute 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/mute 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-082 · API POST /api/v1/statuses/{id}/mute 200 | MTI-FN-154 | 2026-11-11 |
| 188 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/mute 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/mute 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-082 · API POST /api/v1/statuses/{id}/mute 401 | MTI-FN-155 | 2026-11-11 |
| 189 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/mute 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/mute 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-082 · API POST /api/v1/statuses/{id}/mute 404 | MTI-FN-155 | 2026-11-11 |
| 190 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unmute 를 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/unmute 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-083 · API POST /api/v1/statuses/{id}/unmute 200 | MTI-FN-156 | 2026-11-11 |
| 191 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/unmute 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/unmute 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-083 · API POST /api/v1/statuses/{id}/unmute 401 | MTI-FN-157 | 2026-11-11 |
| 192 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unmute 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/unmute 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-083 · API POST /api/v1/statuses/{id}/unmute 404 | MTI-FN-157 | 2026-11-11 |
| 193 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/pin 을 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/pin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-084 · API POST /api/v1/statuses/{id}/pin 200 | MTI-FN-158 | 2026-11-11 |
| 194 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/pin 을 토큰 없이 부른다 | POST /api/v1/statuses/{id}/pin 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-084 · API POST /api/v1/statuses/{id}/pin 401 | MTI-FN-159 | 2026-11-11 |
| 195 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/pin 을 없는 번호로 부른다 | POST /api/v1/statuses/{id}/pin 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-084 · API POST /api/v1/statuses/{id}/pin 404 | MTI-FN-159 | 2026-11-11 |
| 196 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unpin 을 일반 회원 토큰으로 부른다 | POST /api/v1/statuses/{id}/unpin 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-085 · API POST /api/v1/statuses/{id}/unpin 200 | MTI-FN-160 | 2026-11-11 |
| 197 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/unpin 을 토큰 없이 부른다 | POST /api/v1/statuses/{id}/unpin 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-085 · API POST /api/v1/statuses/{id}/unpin 401 | MTI-FN-161 | 2026-11-11 |
| 198 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/unpin 을 없는 번호로 부른다 | POST /api/v1/statuses/{id}/unpin 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-085 · API POST /api/v1/statuses/{id}/unpin 404 | MTI-FN-161 | 2026-11-11 |
| 199 | 예외 | 요청에 토큰이 없다 | POST /api/v1/statuses/{id}/translate 를 토큰 없이 부른다 | POST /api/v1/statuses/{id}/translate 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-086 · API POST /api/v1/statuses/{id}/translate 401 | MTI-FN-162 | 2026-11-11 |
| 200 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/statuses/{id}/translate 를 없는 번호로 부른다 | POST /api/v1/statuses/{id}/translate 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-086 · API POST /api/v1/statuses/{id}/translate 404 | MTI-FN-162 | 2026-11-11 |
| 201 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/favourites 를 일반 회원 토큰으로 부른다 | GET /api/v1/favourites 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-087 · API GET /api/v1/favourites 200 | MTI-FN-163 | 2026-11-11 |
| 202 | 예외 | 요청에 토큰이 없다 | GET /api/v1/favourites 를 토큰 없이 부른다 | GET /api/v1/favourites 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-087 · API GET /api/v1/favourites 401 | MTI-FN-164 | 2026-11-11 |
| 203 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/bookmarks 를 일반 회원 토큰으로 부른다 | GET /api/v1/bookmarks 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-088 · API GET /api/v1/bookmarks 200 | MTI-FN-165 | 2026-11-11 |
| 204 | 예외 | 요청에 토큰이 없다 | GET /api/v1/bookmarks 를 토큰 없이 부른다 | GET /api/v1/bookmarks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-088 · API GET /api/v1/bookmarks 401 | MTI-FN-166 | 2026-11-11 |
| 205 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/scheduled_statuses 를 일반 회원 토큰으로 부른다 | GET /api/v1/scheduled_statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-089 · API GET /api/v1/scheduled_statuses 200 | MTI-FN-167 | 2026-11-11 |
| 206 | 예외 | 요청에 토큰이 없다 | GET /api/v1/scheduled_statuses 를 토큰 없이 부른다 | GET /api/v1/scheduled_statuses 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-089 · API GET /api/v1/scheduled_statuses 401 | MTI-FN-168 | 2026-11-11 |
| 207 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-090 · API GET /api/v1/scheduled_statuses/{id} 200 | MTI-FN-169 | 2026-11-11 |
| 208 | 예외 | 요청에 토큰이 없다 | GET /api/v1/scheduled_statuses/{id} 를 토큰 없이 부른다 | GET /api/v1/scheduled_statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-090 · API GET /api/v1/scheduled_statuses/{id} 401 | MTI-FN-170 | 2026-11-11 |
| 209 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른다 | GET /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-090 · API GET /api/v1/scheduled_statuses/{id} 404 | MTI-FN-170 | 2026-11-11 |
| 210 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-091 · API PUT /api/v1/scheduled_statuses/{id} 200 | MTI-FN-171 | 2026-11-11 |
| 211 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/scheduled_statuses/{id} 를 토큰 없이 부른다 | PUT /api/v1/scheduled_statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-091 · API PUT /api/v1/scheduled_statuses/{id} 401 | MTI-FN-172 | 2026-11-11 |
| 212 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른다 | PUT /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-091 · API PUT /api/v1/scheduled_statuses/{id} 404 | MTI-FN-172 | 2026-11-11 |
| 213 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/scheduled_statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-092 · API DELETE /api/v1/scheduled_statuses/{id} 200 | MTI-FN-173 | 2026-11-11 |
| 214 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/scheduled_statuses/{id} 를 토큰 없이 부른다 | DELETE /api/v1/scheduled_statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-092 · API DELETE /api/v1/scheduled_statuses/{id} 401 | MTI-FN-174 | 2026-11-11 |
| 215 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른다 | DELETE /api/v1/scheduled_statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-092 · API DELETE /api/v1/scheduled_statuses/{id} 404 | MTI-FN-174 | 2026-11-11 |
| 216 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/media 를 일반 회원 토큰으로 부른다 | POST /api/v2/media 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-093 · API POST /api/v2/media 200 | MTI-FN-175 | 2026-11-11 |
| 217 | 예외 | 요청에 토큰이 없다 | POST /api/v2/media 를 토큰 없이 부른다 | POST /api/v2/media 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-093 · API POST /api/v2/media 401 | MTI-FN-176 | 2026-11-11 |
| 218 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/media 를 일반 회원 토큰으로 부른다 | POST /api/v1/media 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-094 · API POST /api/v1/media 200 | MTI-FN-177 | 2026-11-11 |
| 219 | 예외 | 요청에 토큰이 없다 | POST /api/v1/media 를 토큰 없이 부른다 | POST /api/v1/media 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-094 · API POST /api/v1/media 401 | MTI-FN-178 | 2026-11-11 |
| 220 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/media/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/media/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-095 · API GET /api/v1/media/{id} 200 | MTI-FN-179 | 2026-11-11 |
| 221 | 예외 | 요청에 토큰이 없다 | GET /api/v1/media/{id} 를 토큰 없이 부른다 | GET /api/v1/media/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-095 · API GET /api/v1/media/{id} 401 | MTI-FN-180 | 2026-11-11 |
| 222 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/media/{id} 를 없는 번호로 부른다 | GET /api/v1/media/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-095 · API GET /api/v1/media/{id} 404 | MTI-FN-180 | 2026-11-11 |
| 223 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/media/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/media/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-096 · API PUT /api/v1/media/{id} 200 | MTI-FN-181 | 2026-11-11 |
| 224 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/media/{id} 를 토큰 없이 부른다 | PUT /api/v1/media/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-096 · API PUT /api/v1/media/{id} 401 | MTI-FN-182 | 2026-11-11 |
| 225 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/media/{id} 를 없는 번호로 부른다 | PUT /api/v1/media/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-096 · API PUT /api/v1/media/{id} 404 | MTI-FN-182 | 2026-11-11 |
| 226 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/media/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/media/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-097 · API DELETE /api/v1/media/{id} 200 | MTI-FN-183 | 2026-11-11 |
| 227 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/media/{id} 를 토큰 없이 부른다 | DELETE /api/v1/media/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-097 · API DELETE /api/v1/media/{id} 401 | MTI-FN-184 | 2026-11-11 |
| 228 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/media/{id} 를 없는 번호로 부른다 | DELETE /api/v1/media/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-097 · API DELETE /api/v1/media/{id} 404 | MTI-FN-184 | 2026-11-11 |
| 229 | 정상 | 토큰이 없다 | GET /api/v1/polls/{id} 를 토큰 없이 부른다 | GET /api/v1/polls/{id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-098 · API GET /api/v1/polls/{id} 200 | MTI-FN-185 | 2026-11-11 |
| 230 | 예외 | 토큰이 없다 | GET /api/v1/polls/{id} 를 없는 번호로 부른다 | GET /api/v1/polls/{id} 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-098 · API GET /api/v1/polls/{id} 404 | MTI-FN-186 | 2026-11-11 |
| 231 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/polls/{id}/votes 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/polls/{id}/votes 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-099 · API POST /api/v1/polls/{id}/votes 200 | MTI-FN-187 | 2026-11-11 |
| 232 | 예외 | 요청에 토큰이 없다 | POST /api/v1/polls/{id}/votes 를 토큰 없이 부른다 | POST /api/v1/polls/{id}/votes 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-099 · API POST /api/v1/polls/{id}/votes 401 | MTI-FN-188 | 2026-11-11 |
| 233 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/polls/{id}/votes 를 없는 번호로 부른다 | POST /api/v1/polls/{id}/votes 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-099 · API POST /api/v1/polls/{id}/votes 404 | MTI-FN-188 | 2026-11-11 |
| 234 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/timelines/home 를 일반 회원 토큰으로 부른다 | GET /api/v1/timelines/home 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-100 · API GET /api/v1/timelines/home 200 | MTI-FN-189 | 2026-11-11 |
| 235 | 예외 | 요청에 토큰이 없다 | GET /api/v1/timelines/home 를 토큰 없이 부른다 | GET /api/v1/timelines/home 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-100 · API GET /api/v1/timelines/home 401 | MTI-FN-190 | 2026-11-11 |
| 236 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public 를 토큰 없이 부른다 | GET /api/v1/timelines/public 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-101 · API GET /api/v1/timelines/public 200 | MTI-FN-191 | 2026-11-11 |
| 237 | 정상 | 토큰이 없다 | GET /api/v1/timelines/tag/{hashtag} 를 토큰 없이 부른다 | GET /api/v1/timelines/tag/{hashtag} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-102 · API GET /api/v1/timelines/tag/{hashtag} 200 | MTI-FN-192 | 2026-11-11 |
| 238 | 정상 | 토큰이 없다 | GET /api/v1/timelines/link 를 토큰 없이 부른다 | GET /api/v1/timelines/link 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-103 · API GET /api/v1/timelines/link 200 | MTI-FN-193 | 2026-11-11 |
| 239 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/timelines/list/{list_id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/timelines/list/{list_id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-104 · API GET /api/v1/timelines/list/{list_id} 200 | MTI-FN-194 | 2026-11-11 |
| 240 | 예외 | 요청에 토큰이 없다 | GET /api/v1/timelines/list/{list_id} 를 토큰 없이 부른다 | GET /api/v1/timelines/list/{list_id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-104 · API GET /api/v1/timelines/list/{list_id} 401 | MTI-FN-195 | 2026-11-11 |
| 241 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/timelines/list/{list_id} 를 없는 번호로 부른다 | GET /api/v1/timelines/list/{list_id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-104 · API GET /api/v1/timelines/list/{list_id} 404 | MTI-FN-195 | 2026-11-11 |
| 242 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/conversations 를 일반 회원 토큰으로 부른다 | GET /api/v1/conversations 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-105 · API GET /api/v1/conversations 200 | MTI-FN-196 | 2026-11-11 |
| 243 | 예외 | 요청에 토큰이 없다 | GET /api/v1/conversations 를 토큰 없이 부른다 | GET /api/v1/conversations 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-105 · API GET /api/v1/conversations 401 | MTI-FN-197 | 2026-11-11 |
| 244 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/conversations/{id}/read 를 일반 회원 토큰으로 부른다 | POST /api/v1/conversations/{id}/read 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-106 · API POST /api/v1/conversations/{id}/read 200 | MTI-FN-198 | 2026-11-11 |
| 245 | 예외 | 요청에 토큰이 없다 | POST /api/v1/conversations/{id}/read 를 토큰 없이 부른다 | POST /api/v1/conversations/{id}/read 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-106 · API POST /api/v1/conversations/{id}/read 401 | MTI-FN-199 | 2026-11-11 |
| 246 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/conversations/{id}/read 를 없는 번호로 부른다 | POST /api/v1/conversations/{id}/read 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-106 · API POST /api/v1/conversations/{id}/read 404 | MTI-FN-199 | 2026-11-11 |
| 247 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/conversations/{id}/unread 를 일반 회원 토큰으로 부른다 | POST /api/v1/conversations/{id}/unread 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-107 | MTI-FN-200 | 2026-11-11 |
| 248 | 예외 | 요청에 토큰이 없다 | POST /api/v1/conversations/{id}/unread 를 토큰 없이 부른다 | POST /api/v1/conversations/{id}/unread 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-107 | MTI-FN-201 | 2026-11-11 |
| 249 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/conversations/{id}/unread 를 없는 번호로 부른다 | POST /api/v1/conversations/{id}/unread 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-107 | MTI-FN-201 | 2026-11-11 |
| 250 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/conversations/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/conversations/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-108 · API DELETE /api/v1/conversations/{id} 200 | MTI-FN-202 | 2026-11-11 |
| 251 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/conversations/{id} 를 토큰 없이 부른다 | DELETE /api/v1/conversations/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-108 · API DELETE /api/v1/conversations/{id} 401 | MTI-FN-203 | 2026-11-11 |
| 252 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/conversations/{id} 를 없는 번호로 부른다 | DELETE /api/v1/conversations/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-108 · API DELETE /api/v1/conversations/{id} 404 | MTI-FN-203 | 2026-11-11 |
| 253 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/markers?timeline[]=home&timeline[]=notifications 를 일반 회원 토큰으로 부른다 | GET /api/v1/markers?timeline[]=home&timeline[]=notifications 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-109 · API GET /api/v1/markers 200 | MTI-FN-204 | 2026-11-11 |
| 254 | 예외 | 요청에 토큰이 없다 | GET /api/v1/markers?timeline[]=home&timeline[]=notifications 를 토큰 없이 부른다 | GET /api/v1/markers?timeline[]=home&timeline[]=notifications 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-109 · API GET /api/v1/markers 401 | MTI-FN-205 | 2026-11-11 |
| 255 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/markers 를 일반 회원 토큰으로 부른다 | POST /api/v1/markers 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-110 · API POST /api/v1/markers 200 | MTI-FN-206 | 2026-11-11 |
| 256 | 예외 | 요청에 토큰이 없다 | POST /api/v1/markers 를 토큰 없이 부른다 | POST /api/v1/markers 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-110 · API POST /api/v1/markers 401 | MTI-FN-207 | 2026-11-11 |
| 257 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-111 · API GET /api/v1/notifications 200 | MTI-FN-208 | 2026-11-11 |
| 258 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications 를 토큰 없이 부른다 | GET /api/v1/notifications 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-111 · API GET /api/v1/notifications 401 | MTI-FN-209 | 2026-11-11 |
| 259 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-112 · API GET /api/v1/notifications/{id} 200 | MTI-FN-210 | 2026-11-11 |
| 260 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/{id} 를 토큰 없이 부른다 | GET /api/v1/notifications/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-112 · API GET /api/v1/notifications/{id} 401 | MTI-FN-211 | 2026-11-11 |
| 261 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/{id} 를 없는 번호로 부른다 | GET /api/v1/notifications/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-112 · API GET /api/v1/notifications/{id} 404 | MTI-FN-211 | 2026-11-11 |
| 262 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/unread_count 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/unread_count 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-113 · API GET /api/v1/notifications/unread_count 200 | MTI-FN-212 | 2026-11-11 |
| 263 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/unread_count 를 토큰 없이 부른다 | GET /api/v1/notifications/unread_count 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-113 · API GET /api/v1/notifications/unread_count 401 | MTI-FN-213 | 2026-11-11 |
| 264 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/clear 를 토큰 없이 부른다 | POST /api/v1/notifications/clear 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-114 · API POST /api/v1/notifications/clear 401 | MTI-FN-214 | 2026-11-11 |
| 265 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/notifications/{id}/dismiss 를 일반 회원 토큰으로 부른다 | POST /api/v1/notifications/{id}/dismiss 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-115 · API POST /api/v1/notifications/{id}/dismiss 200 | MTI-FN-215 | 2026-11-11 |
| 266 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/{id}/dismiss 를 토큰 없이 부른다 | POST /api/v1/notifications/{id}/dismiss 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-115 · API POST /api/v1/notifications/{id}/dismiss 401 | MTI-FN-216 | 2026-11-11 |
| 267 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/notifications/{id}/dismiss 를 없는 번호로 부른다 | POST /api/v1/notifications/{id}/dismiss 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-115 · API POST /api/v1/notifications/{id}/dismiss 404 | MTI-FN-216 | 2026-11-11 |
| 268 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/notifications 를 일반 회원 토큰으로 부른다 | GET /api/v2/notifications 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-116 · API GET /api/v2/notifications 200 | MTI-FN-217 | 2026-11-11 |
| 269 | 예외 | 요청에 토큰이 없다 | GET /api/v2/notifications 를 토큰 없이 부른다 | GET /api/v2/notifications 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-116 · API GET /api/v2/notifications 401 | MTI-FN-218 | 2026-11-11 |
| 270 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/{group_key} 를 일반 회원 토큰으로 부른다 | GET /api/v2/notifications/{group_key} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-117 · API GET /api/v2/notifications/{group_key} 200 | MTI-FN-219 | 2026-11-11 |
| 271 | 예외 | 요청에 토큰이 없다 | GET /api/v2/notifications/{group_key} 를 토큰 없이 부른다 | GET /api/v2/notifications/{group_key} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-117 · API GET /api/v2/notifications/{group_key} 401 | MTI-FN-220 | 2026-11-11 |
| 272 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/{group_key} 를 없는 번호로 부른다 | GET /api/v2/notifications/{group_key} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-117 · API GET /api/v2/notifications/{group_key} 404 | MTI-FN-220 | 2026-11-11 |
| 273 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/{group_key}/accounts 를 일반 회원 토큰으로 부른다 | GET /api/v2/notifications/{group_key}/accounts 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-118 · API GET /api/v2/notifications/{group_key}/accounts 200 | MTI-FN-221 | 2026-11-11 |
| 274 | 예외 | 요청에 토큰이 없다 | GET /api/v2/notifications/{group_key}/accounts 를 토큰 없이 부른다 | GET /api/v2/notifications/{group_key}/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-118 · API GET /api/v2/notifications/{group_key}/accounts 401 | MTI-FN-222 | 2026-11-11 |
| 275 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/{group_key}/accounts 를 없는 번호로 부른다 | GET /api/v2/notifications/{group_key}/accounts 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-118 · API GET /api/v2/notifications/{group_key}/accounts 404 | MTI-FN-222 | 2026-11-11 |
| 276 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/unread_count 를 일반 회원 토큰으로 부른다 | GET /api/v2/notifications/unread_count 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-119 · API GET /api/v2/notifications/unread_count 200 | MTI-FN-223 | 2026-11-11 |
| 277 | 예외 | 요청에 토큰이 없다 | GET /api/v2/notifications/unread_count 를 토큰 없이 부른다 | GET /api/v2/notifications/unread_count 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-119 · API GET /api/v2/notifications/unread_count 401 | MTI-FN-224 | 2026-11-11 |
| 278 | 예외 | 요청에 토큰이 없다 | POST /api/v2/notifications/clear 를 토큰 없이 부른다 | POST /api/v2/notifications/clear 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-120 | MTI-FN-225 | 2026-11-11 |
| 279 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/notifications/{group_key}/dismiss 를 일반 회원 토큰으로 부른다 | POST /api/v2/notifications/{group_key}/dismiss 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-121 · API POST /api/v2/notifications/{group_key}/dismiss 200 | MTI-FN-226 | 2026-11-11 |
| 280 | 예외 | 요청에 토큰이 없다 | POST /api/v2/notifications/{group_key}/dismiss 를 토큰 없이 부른다 | POST /api/v2/notifications/{group_key}/dismiss 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-121 · API POST /api/v2/notifications/{group_key}/dismiss 401 | MTI-FN-227 | 2026-11-11 |
| 281 | 예외 | 일반 회원 토큰이 있다 | POST /api/v2/notifications/{group_key}/dismiss 를 없는 번호로 부른다 | POST /api/v2/notifications/{group_key}/dismiss 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-121 · API POST /api/v2/notifications/{group_key}/dismiss 404 | MTI-FN-227 | 2026-11-11 |
| 282 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/notifications/policy 를 일반 회원 토큰으로 부른다 | GET /api/v2/notifications/policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-122 · API GET /api/v2/notifications/policy 200 | MTI-FN-228 | 2026-11-11 |
| 283 | 예외 | 요청에 토큰이 없다 | GET /api/v2/notifications/policy 를 토큰 없이 부른다 | GET /api/v2/notifications/policy 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-122 · API GET /api/v2/notifications/policy 401 | MTI-FN-229 | 2026-11-11 |
| 284 | 정상 | 일반 회원 토큰이 있다 | PATCH /api/v2/notifications/policy 를 일반 회원 토큰으로 부른다 | PATCH /api/v2/notifications/policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-123 · API PATCH /api/v2/notifications/policy 200 | MTI-FN-230 | 2026-11-11 |
| 285 | 예외 | 요청에 토큰이 없다 | PATCH /api/v2/notifications/policy 를 토큰 없이 부른다 | PATCH /api/v2/notifications/policy 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-123 · API PATCH /api/v2/notifications/policy 401 | MTI-FN-231 | 2026-11-11 |
| 286 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/policy 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/policy 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-124 | MTI-FN-232 | 2026-11-11 |
| 287 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/policy 를 토큰 없이 부른다 | GET /api/v1/notifications/policy 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-124 | MTI-FN-233 | 2026-11-11 |
| 288 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/requests 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/requests 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-125 · API GET /api/v1/notifications/requests 200 | MTI-FN-234 | 2026-11-11 |
| 289 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/requests 를 토큰 없이 부른다 | GET /api/v1/notifications/requests 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-125 · API GET /api/v1/notifications/requests 401 | MTI-FN-235 | 2026-11-11 |
| 290 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/requests/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/requests/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-126 · API GET /api/v1/notifications/requests/{id} 200 | MTI-FN-236 | 2026-11-11 |
| 291 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/requests/{id} 를 토큰 없이 부른다 | GET /api/v1/notifications/requests/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-126 · API GET /api/v1/notifications/requests/{id} 401 | MTI-FN-237 | 2026-11-11 |
| 292 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/requests/{id} 를 없는 번호로 부른다 | GET /api/v1/notifications/requests/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-126 · API GET /api/v1/notifications/requests/{id} 404 | MTI-FN-237 | 2026-11-11 |
| 293 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/notifications/requests/merged 를 일반 회원 토큰으로 부른다 | GET /api/v1/notifications/requests/merged 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-127 · API GET /api/v1/notifications/requests/merged 200 | MTI-FN-238 | 2026-11-11 |
| 294 | 예외 | 요청에 토큰이 없다 | GET /api/v1/notifications/requests/merged 를 토큰 없이 부른다 | GET /api/v1/notifications/requests/merged 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-127 · API GET /api/v1/notifications/requests/merged 401 | MTI-FN-239 | 2026-11-11 |
| 295 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/requests/{id}/accept 를 토큰 없이 부른다 | POST /api/v1/notifications/requests/{id}/accept 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-128 · API POST /api/v1/notifications/requests/{id}/accept 401 | MTI-FN-240 | 2026-11-11 |
| 296 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/notifications/requests/{id}/accept 를 없는 번호로 부른다 | POST /api/v1/notifications/requests/{id}/accept 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-128 · API POST /api/v1/notifications/requests/{id}/accept 404 | MTI-FN-240 | 2026-11-11 |
| 297 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/requests/{id}/dismiss 를 토큰 없이 부른다 | POST /api/v1/notifications/requests/{id}/dismiss 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-129 · API POST /api/v1/notifications/requests/{id}/dismiss 401 | MTI-FN-241 | 2026-11-11 |
| 298 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/notifications/requests/{id}/dismiss 를 없는 번호로 부른다 | POST /api/v1/notifications/requests/{id}/dismiss 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-129 · API POST /api/v1/notifications/requests/{id}/dismiss 404 | MTI-FN-241 | 2026-11-11 |
| 299 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/requests/accept 를 토큰 없이 부른다 | POST /api/v1/notifications/requests/accept 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-130 · API POST /api/v1/notifications/requests/accept 401 | MTI-FN-242 | 2026-11-11 |
| 300 | 예외 | 요청에 토큰이 없다 | POST /api/v1/notifications/requests/dismiss 를 토큰 없이 부른다 | POST /api/v1/notifications/requests/dismiss 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-131 · API POST /api/v1/notifications/requests/dismiss 401 | MTI-FN-243 | 2026-11-11 |
| 301 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/push/subscription 을 일반 회원 토큰으로 부른다 | POST /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-132 · API POST /api/v1/push/subscription 200 | MTI-FN-244 | 2026-11-11 |
| 302 | 예외 | 요청에 토큰이 없다 | POST /api/v1/push/subscription 을 토큰 없이 부른다 | POST /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-132 · API POST /api/v1/push/subscription 401 | MTI-FN-245 | 2026-11-11 |
| 303 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/push/subscription 을 일반 회원 토큰으로 부른다 | GET /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-133 · API GET /api/v1/push/subscription 200 | MTI-FN-246 | 2026-11-11 |
| 304 | 예외 | 요청에 토큰이 없다 | GET /api/v1/push/subscription 을 토큰 없이 부른다 | GET /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-133 · API GET /api/v1/push/subscription 401 | MTI-FN-247 | 2026-11-11 |
| 305 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/push/subscription 을 일반 회원 토큰으로 부른다 | PUT /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-134 · API PUT /api/v1/push/subscription 200 | MTI-FN-248 | 2026-11-11 |
| 306 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/push/subscription 을 토큰 없이 부른다 | PUT /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-134 · API PUT /api/v1/push/subscription 401 | MTI-FN-249 | 2026-11-11 |
| 307 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/push/subscription 을 일반 회원 토큰으로 부른다 | DELETE /api/v1/push/subscription 을 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-135 · API DELETE /api/v1/push/subscription 200 | MTI-FN-250 | 2026-11-11 |
| 308 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/push/subscription 을 토큰 없이 부른다 | DELETE /api/v1/push/subscription 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-135 · API DELETE /api/v1/push/subscription 401 | MTI-FN-251 | 2026-11-11 |
| 309 | 정상 | 토큰이 없다 | GET /api/v2/search?q=hana_photo&type=accounts 를 토큰 없이 부른다 | GET /api/v2/search?q=hana_photo&type=accounts 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-136 · API GET /api/v2/search 200 | MTI-FN-252 | 2026-11-11 |
| 310 | 정상 | 토큰이 없다 | GET /api/v1/tags/{name} 를 토큰 없이 부른다 | GET /api/v1/tags/{name} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-137 · API GET /api/v1/tags/{name} 200 | MTI-FN-253 | 2026-11-11 |
| 311 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{name}/follow 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/tags/{name}/follow 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-138 · API POST /api/v1/tags/{name}/follow 200 | MTI-FN-254 | 2026-11-11 |
| 312 | 예외 | 요청에 토큰이 없다 | POST /api/v1/tags/{name}/follow 를 토큰 없이 부른다 | POST /api/v1/tags/{name}/follow 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-138 · API POST /api/v1/tags/{name}/follow 401 | MTI-FN-255 | 2026-11-11 |
| 313 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{name}/follow 를 없는 번호로 부른다 | POST /api/v1/tags/{name}/follow 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-138 · API POST /api/v1/tags/{name}/follow 404 | MTI-FN-255 | 2026-11-11 |
| 314 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{name}/unfollow 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/tags/{name}/unfollow 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-139 · API POST /api/v1/tags/{name}/unfollow 200 | MTI-FN-256 | 2026-11-11 |
| 315 | 예외 | 요청에 토큰이 없다 | POST /api/v1/tags/{name}/unfollow 를 토큰 없이 부른다 | POST /api/v1/tags/{name}/unfollow 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-139 · API POST /api/v1/tags/{name}/unfollow 401 | MTI-FN-257 | 2026-11-11 |
| 316 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{name}/unfollow 를 없는 번호로 부른다 | POST /api/v1/tags/{name}/unfollow 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-139 · API POST /api/v1/tags/{name}/unfollow 404 | MTI-FN-257 | 2026-11-11 |
| 317 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{id}/feature 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/tags/{id}/feature 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-140 · API POST /api/v1/tags/{id}/feature 200 | MTI-FN-258 | 2026-11-11 |
| 318 | 예외 | 요청에 토큰이 없다 | POST /api/v1/tags/{id}/feature 를 토큰 없이 부른다 | POST /api/v1/tags/{id}/feature 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-140 · API POST /api/v1/tags/{id}/feature 401 | MTI-FN-259 | 2026-11-11 |
| 319 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{id}/feature 를 없는 번호로 부른다 | POST /api/v1/tags/{id}/feature 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-140 · API POST /api/v1/tags/{id}/feature 404 | MTI-FN-259 | 2026-11-11 |
| 320 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{id}/unfeature 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/tags/{id}/unfeature 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-141 · API POST /api/v1/tags/{id}/unfeature 200 | MTI-FN-260 | 2026-11-11 |
| 321 | 예외 | 요청에 토큰이 없다 | POST /api/v1/tags/{id}/unfeature 를 토큰 없이 부른다 | POST /api/v1/tags/{id}/unfeature 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-141 · API POST /api/v1/tags/{id}/unfeature 401 | MTI-FN-261 | 2026-11-11 |
| 322 | 예외 | 두 번째 사용자 토큰이 있다 | POST /api/v1/tags/{id}/unfeature 를 없는 번호로 부른다 | POST /api/v1/tags/{id}/unfeature 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-141 · API POST /api/v1/tags/{id}/unfeature 404 | MTI-FN-261 | 2026-11-11 |
| 323 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/followed_tags 를 일반 회원 토큰으로 부른다 | GET /api/v1/followed_tags 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-142 · API GET /api/v1/followed_tags 200 | MTI-FN-262 | 2026-11-11 |
| 324 | 예외 | 요청에 토큰이 없다 | GET /api/v1/followed_tags 를 토큰 없이 부른다 | GET /api/v1/followed_tags 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-142 · API GET /api/v1/followed_tags 401 | MTI-FN-263 | 2026-11-11 |
| 325 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/featured_tags 를 일반 회원 토큰으로 부른다 | GET /api/v1/featured_tags 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-143 · API GET /api/v1/featured_tags 200 | MTI-FN-264 | 2026-11-11 |
| 326 | 예외 | 요청에 토큰이 없다 | GET /api/v1/featured_tags 를 토큰 없이 부른다 | GET /api/v1/featured_tags 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-143 · API GET /api/v1/featured_tags 401 | MTI-FN-265 | 2026-11-11 |
| 327 | 정상 | 두 번째 사용자 토큰이 있다 | POST /api/v1/featured_tags 를 두 번째 사용자 토큰으로 부른다 | POST /api/v1/featured_tags 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-144 · API POST /api/v1/featured_tags 200 | MTI-FN-266 | 2026-11-11 |
| 328 | 예외 | 요청에 토큰이 없다 | POST /api/v1/featured_tags 를 토큰 없이 부른다 | POST /api/v1/featured_tags 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-144 · API POST /api/v1/featured_tags 401 | MTI-FN-267 | 2026-11-11 |
| 329 | 정상 | 두 번째 사용자 토큰이 있다 | DELETE /api/v1/featured_tags/{id} 를 두 번째 사용자 토큰으로 부른다 | DELETE /api/v1/featured_tags/{id} 를 두 번째 사용자 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-145 · API DELETE /api/v1/featured_tags/{id} 200 | MTI-FN-268 | 2026-11-11 |
| 330 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/featured_tags/{id} 를 토큰 없이 부른다 | DELETE /api/v1/featured_tags/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-145 · API DELETE /api/v1/featured_tags/{id} 401 | MTI-FN-269 | 2026-11-11 |
| 331 | 예외 | 두 번째 사용자 토큰이 있다 | DELETE /api/v1/featured_tags/{id} 를 없는 번호로 부른다 | DELETE /api/v1/featured_tags/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-145 · API DELETE /api/v1/featured_tags/{id} 404 | MTI-FN-269 | 2026-11-11 |
| 332 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/featured_tags/suggestions 를 일반 회원 토큰으로 부른다 | GET /api/v1/featured_tags/suggestions 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-146 · API GET /api/v1/featured_tags/suggestions 200 | MTI-FN-270 | 2026-11-11 |
| 333 | 예외 | 요청에 토큰이 없다 | GET /api/v1/featured_tags/suggestions 를 토큰 없이 부른다 | GET /api/v1/featured_tags/suggestions 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-146 · API GET /api/v1/featured_tags/suggestions 401 | MTI-FN-271 | 2026-11-11 |
| 334 | 정상 | 토큰이 없다 | GET /api/v1/trends/tags 를 토큰 없이 부른다 | GET /api/v1/trends/tags 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-147 · API GET /api/v1/trends/tags 200 | MTI-FN-272 | 2026-11-11 |
| 335 | 정상 | 토큰이 없다 | GET /api/v1/trends 를 토큰 없이 부른다 | GET /api/v1/trends 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-148 | MTI-FN-273 | 2026-11-11 |
| 336 | 정상 | 토큰이 없다 | GET /api/v1/trends/statuses 를 토큰 없이 부른다 | GET /api/v1/trends/statuses 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-149 · API GET /api/v1/trends/statuses 200 | MTI-FN-274 | 2026-11-11 |
| 337 | 정상 | 토큰이 없다 | GET /api/v1/trends/links 를 토큰 없이 부른다 | GET /api/v1/trends/links 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-150 · API GET /api/v1/trends/links 200 | MTI-FN-275 | 2026-11-11 |
| 338 | 정상 | 토큰이 없다 | GET /api/v1/peers/search?q=example 를 토큰 없이 부른다 | GET /api/v1/peers/search?q=example 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-151 | MTI-FN-276 | 2026-11-11 |
| 339 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/lists 를 일반 회원 토큰으로 부른다 | GET /api/v1/lists 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-152 · API GET /api/v1/lists 200 | MTI-FN-277 | 2026-11-11 |
| 340 | 예외 | 요청에 토큰이 없다 | GET /api/v1/lists 를 토큰 없이 부른다 | GET /api/v1/lists 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-152 · API GET /api/v1/lists 401 | MTI-FN-278 | 2026-11-11 |
| 341 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/lists/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/lists/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-153 · API GET /api/v1/lists/{id} 200 | MTI-FN-279 | 2026-11-11 |
| 342 | 예외 | 요청에 토큰이 없다 | GET /api/v1/lists/{id} 를 토큰 없이 부른다 | GET /api/v1/lists/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-153 · API GET /api/v1/lists/{id} 401 | MTI-FN-280 | 2026-11-11 |
| 343 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/lists/{id} 를 없는 번호로 부른다 | GET /api/v1/lists/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-153 · API GET /api/v1/lists/{id} 404 | MTI-FN-280 | 2026-11-11 |
| 344 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/lists 를 일반 회원 토큰으로 부른다 | POST /api/v1/lists 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-154 · API POST /api/v1/lists 200 | MTI-FN-281 | 2026-11-11 |
| 345 | 예외 | 요청에 토큰이 없다 | POST /api/v1/lists 를 토큰 없이 부른다 | POST /api/v1/lists 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-154 · API POST /api/v1/lists 401 | MTI-FN-282 | 2026-11-11 |
| 346 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/lists/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/lists/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-155 · API PUT /api/v1/lists/{id} 200 | MTI-FN-283 | 2026-11-11 |
| 347 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/lists/{id} 를 토큰 없이 부른다 | PUT /api/v1/lists/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-155 · API PUT /api/v1/lists/{id} 401 | MTI-FN-284 | 2026-11-11 |
| 348 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/lists/{id} 를 없는 번호로 부른다 | PUT /api/v1/lists/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-155 · API PUT /api/v1/lists/{id} 404 | MTI-FN-284 | 2026-11-11 |
| 349 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/lists/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/lists/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-156 · API DELETE /api/v1/lists/{id} 200 | MTI-FN-285 | 2026-11-11 |
| 350 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/lists/{id} 를 토큰 없이 부른다 | DELETE /api/v1/lists/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-156 · API DELETE /api/v1/lists/{id} 401 | MTI-FN-286 | 2026-11-11 |
| 351 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/lists/{id} 를 없는 번호로 부른다 | DELETE /api/v1/lists/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-156 · API DELETE /api/v1/lists/{id} 404 | MTI-FN-286 | 2026-11-11 |
| 352 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부른다 | GET /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-157 · API GET /api/v1/lists/{id}/accounts 200 | MTI-FN-287 | 2026-11-11 |
| 353 | 예외 | 요청에 토큰이 없다 | GET /api/v1/lists/{id}/accounts 를 토큰 없이 부른다 | GET /api/v1/lists/{id}/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-157 · API GET /api/v1/lists/{id}/accounts 401 | MTI-FN-288 | 2026-11-11 |
| 354 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/lists/{id}/accounts 를 없는 번호로 부른다 | GET /api/v1/lists/{id}/accounts 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-157 · API GET /api/v1/lists/{id}/accounts 404 | MTI-FN-288 | 2026-11-11 |
| 355 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부른다 | POST /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-158 · API POST /api/v1/lists/{id}/accounts 200 | MTI-FN-289 | 2026-11-11 |
| 356 | 예외 | 요청에 토큰이 없다 | POST /api/v1/lists/{id}/accounts 를 토큰 없이 부른다 | POST /api/v1/lists/{id}/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-158 · API POST /api/v1/lists/{id}/accounts 401 | MTI-FN-290 | 2026-11-11 |
| 357 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/lists/{id}/accounts 를 없는 번호로 부른다 | POST /api/v1/lists/{id}/accounts 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-158 · API POST /api/v1/lists/{id}/accounts 404 | MTI-FN-290 | 2026-11-11 |
| 358 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/lists/{id}/accounts 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-159 · API DELETE /api/v1/lists/{id}/accounts 200 | MTI-FN-291 | 2026-11-11 |
| 359 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/lists/{id}/accounts 를 토큰 없이 부른다 | DELETE /api/v1/lists/{id}/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-159 · API DELETE /api/v1/lists/{id}/accounts 401 | MTI-FN-292 | 2026-11-11 |
| 360 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/lists/{id}/accounts 를 없는 번호로 부른다 | DELETE /api/v1/lists/{id}/accounts 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-159 · API DELETE /api/v1/lists/{id}/accounts 404 | MTI-FN-292 | 2026-11-11 |
| 361 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-160 · API GET /api/v2/filters 200 | MTI-FN-293 | 2026-11-11 |
| 362 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters 를 토큰 없이 부른다 | GET /api/v2/filters 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-160 · API GET /api/v2/filters 401 | MTI-FN-294 | 2026-11-11 |
| 363 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-161 · API GET /api/v2/filters/{id} 200 | MTI-FN-295 | 2026-11-11 |
| 364 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters/{id} 를 토큰 없이 부른다 | GET /api/v2/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-161 · API GET /api/v2/filters/{id} 401 | MTI-FN-296 | 2026-11-11 |
| 365 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{id} 를 없는 번호로 부른다 | GET /api/v2/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-161 · API GET /api/v2/filters/{id} 404 | MTI-FN-296 | 2026-11-11 |
| 366 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/filters 를 일반 회원 토큰으로 부른다 | POST /api/v2/filters 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-162 · API POST /api/v2/filters 200 | MTI-FN-297 | 2026-11-11 |
| 367 | 예외 | 요청에 토큰이 없다 | POST /api/v2/filters 를 토큰 없이 부른다 | POST /api/v2/filters 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-162 · API POST /api/v2/filters 401 | MTI-FN-298 | 2026-11-11 |
| 368 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v2/filters/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v2/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-163 · API PUT /api/v2/filters/{id} 200 | MTI-FN-299 | 2026-11-11 |
| 369 | 예외 | 요청에 토큰이 없다 | PUT /api/v2/filters/{id} 를 토큰 없이 부른다 | PUT /api/v2/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-163 · API PUT /api/v2/filters/{id} 401 | MTI-FN-300 | 2026-11-11 |
| 370 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v2/filters/{id} 를 없는 번호로 부른다 | PUT /api/v2/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-163 · API PUT /api/v2/filters/{id} 404 | MTI-FN-300 | 2026-11-11 |
| 371 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v2/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-164 · API DELETE /api/v2/filters/{id} 200 | MTI-FN-301 | 2026-11-11 |
| 372 | 예외 | 요청에 토큰이 없다 | DELETE /api/v2/filters/{id} 를 토큰 없이 부른다 | DELETE /api/v2/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-164 · API DELETE /api/v2/filters/{id} 401 | MTI-FN-302 | 2026-11-11 |
| 373 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/{id} 를 없는 번호로 부른다 | DELETE /api/v2/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-164 · API DELETE /api/v2/filters/{id} 404 | MTI-FN-302 | 2026-11-11 |
| 374 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{filter_id}/keywords 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters/{filter_id}/keywords 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-165 · API GET /api/v2/filters/{filter_id}/keywords 200 | MTI-FN-303 | 2026-11-11 |
| 375 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부른다 | GET /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-165 · API GET /api/v2/filters/{filter_id}/keywords 401 | MTI-FN-304 | 2026-11-11 |
| 376 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른다 | GET /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-165 · API GET /api/v2/filters/{filter_id}/keywords 404 | MTI-FN-304 | 2026-11-11 |
| 377 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/filters/{filter_id}/keywords 를 일반 회원 토큰으로 부른다 | POST /api/v2/filters/{filter_id}/keywords 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-166 · API POST /api/v2/filters/{filter_id}/keywords 200 | MTI-FN-305 | 2026-11-11 |
| 378 | 예외 | 요청에 토큰이 없다 | POST /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부른다 | POST /api/v2/filters/{filter_id}/keywords 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-166 · API POST /api/v2/filters/{filter_id}/keywords 401 | MTI-FN-306 | 2026-11-11 |
| 379 | 예외 | 일반 회원 토큰이 있다 | POST /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른다 | POST /api/v2/filters/{filter_id}/keywords 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-166 · API POST /api/v2/filters/{filter_id}/keywords 404 | MTI-FN-306 | 2026-11-11 |
| 380 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-167 · API GET /api/v2/filters/keywords/{id} 200 | MTI-FN-307 | 2026-11-11 |
| 381 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters/keywords/{id} 를 토큰 없이 부른다 | GET /api/v2/filters/keywords/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-167 · API GET /api/v2/filters/keywords/{id} 401 | MTI-FN-308 | 2026-11-11 |
| 382 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/filters/keywords/{id} 를 없는 번호로 부른다 | GET /api/v2/filters/keywords/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-167 · API GET /api/v2/filters/keywords/{id} 404 | MTI-FN-308 | 2026-11-11 |
| 383 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-168 · API PUT /api/v2/filters/keywords/{id} 200 | MTI-FN-309 | 2026-11-11 |
| 384 | 예외 | 요청에 토큰이 없다 | PUT /api/v2/filters/keywords/{id} 를 토큰 없이 부른다 | PUT /api/v2/filters/keywords/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-168 · API PUT /api/v2/filters/keywords/{id} 401 | MTI-FN-310 | 2026-11-11 |
| 385 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v2/filters/keywords/{id} 를 없는 번호로 부른다 | PUT /api/v2/filters/keywords/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-168 · API PUT /api/v2/filters/keywords/{id} 404 | MTI-FN-310 | 2026-11-11 |
| 386 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v2/filters/keywords/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-169 · API DELETE /api/v2/filters/keywords/{id} 200 | MTI-FN-311 | 2026-11-11 |
| 387 | 예외 | 요청에 토큰이 없다 | DELETE /api/v2/filters/keywords/{id} 를 토큰 없이 부른다 | DELETE /api/v2/filters/keywords/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-169 · API DELETE /api/v2/filters/keywords/{id} 401 | MTI-FN-312 | 2026-11-11 |
| 388 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/keywords/{id} 를 없는 번호로 부른다 | DELETE /api/v2/filters/keywords/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-169 · API DELETE /api/v2/filters/keywords/{id} 404 | MTI-FN-312 | 2026-11-11 |
| 389 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-170 · API GET /api/v2/filters/{filter_id}/statuses 200 | MTI-FN-313 | 2026-11-11 |
| 390 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters/{filter_id}/statuses 를 토큰 없이 부른다 | GET /api/v2/filters/{filter_id}/statuses 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-170 · API GET /api/v2/filters/{filter_id}/statuses 401 | MTI-FN-314 | 2026-11-11 |
| 391 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/filters/{filter_id}/statuses 를 없는 번호로 부른다 | GET /api/v2/filters/{filter_id}/statuses 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-170 · API GET /api/v2/filters/{filter_id}/statuses 404 | MTI-FN-314 | 2026-11-11 |
| 392 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부른다 | POST /api/v2/filters/{filter_id}/statuses 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-171 · API POST /api/v2/filters/{filter_id}/statuses 200 | MTI-FN-315 | 2026-11-11 |
| 393 | 예외 | 요청에 토큰이 없다 | POST /api/v2/filters/{filter_id}/statuses 를 토큰 없이 부른다 | POST /api/v2/filters/{filter_id}/statuses 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-171 · API POST /api/v2/filters/{filter_id}/statuses 401 | MTI-FN-316 | 2026-11-11 |
| 394 | 예외 | 일반 회원 토큰이 있다 | POST /api/v2/filters/{filter_id}/statuses 를 없는 번호로 부른다 | POST /api/v2/filters/{filter_id}/statuses 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-171 · API POST /api/v2/filters/{filter_id}/statuses 404 | MTI-FN-316 | 2026-11-11 |
| 395 | 정상 | 일반 회원 토큰이 있다 | GET /api/v2/filters/statuses/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v2/filters/statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-172 · API GET /api/v2/filters/statuses/{id} 200 | MTI-FN-317 | 2026-11-11 |
| 396 | 예외 | 요청에 토큰이 없다 | GET /api/v2/filters/statuses/{id} 를 토큰 없이 부른다 | GET /api/v2/filters/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-172 · API GET /api/v2/filters/statuses/{id} 401 | MTI-FN-318 | 2026-11-11 |
| 397 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/filters/statuses/{id} 를 없는 번호로 부른다 | GET /api/v2/filters/statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-172 · API GET /api/v2/filters/statuses/{id} 404 | MTI-FN-318 | 2026-11-11 |
| 398 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/statuses/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v2/filters/statuses/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-173 · API DELETE /api/v2/filters/statuses/{id} 200 | MTI-FN-319 | 2026-11-11 |
| 399 | 예외 | 요청에 토큰이 없다 | DELETE /api/v2/filters/statuses/{id} 를 토큰 없이 부른다 | DELETE /api/v2/filters/statuses/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-173 · API DELETE /api/v2/filters/statuses/{id} 401 | MTI-FN-320 | 2026-11-11 |
| 400 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v2/filters/statuses/{id} 를 없는 번호로 부른다 | DELETE /api/v2/filters/statuses/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-173 · API DELETE /api/v2/filters/statuses/{id} 404 | MTI-FN-320 | 2026-11-11 |
| 401 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/filters 를 일반 회원 토큰으로 부른다 | GET /api/v1/filters 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-174 · API GET /api/v1/filters 200 | MTI-FN-321 | 2026-11-11 |
| 402 | 예외 | 요청에 토큰이 없다 | GET /api/v1/filters 를 토큰 없이 부른다 | GET /api/v1/filters 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-174 · API GET /api/v1/filters 401 | MTI-FN-322 | 2026-11-11 |
| 403 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/filters 를 일반 회원 토큰으로 부른다 | POST /api/v1/filters 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-175 · API POST /api/v1/filters 200 | MTI-FN-323 | 2026-11-11 |
| 404 | 예외 | 요청에 토큰이 없다 | POST /api/v1/filters 를 토큰 없이 부른다 | POST /api/v1/filters 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-175 · API POST /api/v1/filters 401 | MTI-FN-324 | 2026-11-11 |
| 405 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/filters/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-176 · API GET /api/v1/filters/{id} 200 | MTI-FN-325 | 2026-11-11 |
| 406 | 예외 | 요청에 토큰이 없다 | GET /api/v1/filters/{id} 를 토큰 없이 부른다 | GET /api/v1/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-176 · API GET /api/v1/filters/{id} 401 | MTI-FN-326 | 2026-11-11 |
| 407 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/filters/{id} 를 없는 번호로 부른다 | GET /api/v1/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-176 · API GET /api/v1/filters/{id} 404 | MTI-FN-326 | 2026-11-11 |
| 408 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/filters/{id} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-177 · API PUT /api/v1/filters/{id} 200 | MTI-FN-327 | 2026-11-11 |
| 409 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/filters/{id} 를 토큰 없이 부른다 | PUT /api/v1/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-177 · API PUT /api/v1/filters/{id} 401 | MTI-FN-328 | 2026-11-11 |
| 410 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/filters/{id} 를 없는 번호로 부른다 | PUT /api/v1/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-177 · API PUT /api/v1/filters/{id} 404 | MTI-FN-328 | 2026-11-11 |
| 411 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/filters/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/filters/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-178 · API DELETE /api/v1/filters/{id} 200 | MTI-FN-329 | 2026-11-11 |
| 412 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/filters/{id} 를 토큰 없이 부른다 | DELETE /api/v1/filters/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-178 · API DELETE /api/v1/filters/{id} 401 | MTI-FN-330 | 2026-11-11 |
| 413 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/filters/{id} 를 없는 번호로 부른다 | DELETE /api/v1/filters/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-178 · API DELETE /api/v1/filters/{id} 404 | MTI-FN-330 | 2026-11-11 |
| 414 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/reports 를 일반 회원 토큰으로 부른다 | POST /api/v1/reports 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-179 · API POST /api/v1/reports 200 | MTI-FN-331 | 2026-11-11 |
| 415 | 예외 | 요청에 토큰이 없다 | POST /api/v1/reports 를 토큰 없이 부른다 | POST /api/v1/reports 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-179 · API POST /api/v1/reports 401 | MTI-FN-332 | 2026-11-11 |
| 416 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/announcements 를 일반 회원 토큰으로 부른다 | GET /api/v1/announcements 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-180 · API GET /api/v1/announcements 200 | MTI-FN-333 | 2026-11-11 |
| 417 | 예외 | 요청에 토큰이 없다 | GET /api/v1/announcements 를 토큰 없이 부른다 | GET /api/v1/announcements 를 토큰 없이 부르면 응답 코드가 422 다 | MTI-REQ-180 · API GET /api/v1/announcements 422 | MTI-FN-334 | 2026-11-11 |
| 418 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/announcements/{id}/dismiss 를 일반 회원 토큰으로 부른다 | POST /api/v1/announcements/{id}/dismiss 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-181 · API POST /api/v1/announcements/{id}/dismiss 200 | MTI-FN-335 | 2026-11-11 |
| 419 | 예외 | 요청에 토큰이 없다 | POST /api/v1/announcements/{id}/dismiss 를 토큰 없이 부른다 | POST /api/v1/announcements/{id}/dismiss 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-181 · API POST /api/v1/announcements/{id}/dismiss 401 | MTI-FN-336 | 2026-11-11 |
| 420 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/announcements/{id}/dismiss 를 없는 번호로 부른다 | POST /api/v1/announcements/{id}/dismiss 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-181 · API POST /api/v1/announcements/{id}/dismiss 404 | MTI-FN-336 | 2026-11-11 |
| 421 | 정상 | 일반 회원 토큰이 있다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부른다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-182 · API PUT /api/v1/announcements/{id}/reactions/{name} 200 | MTI-FN-337 | 2026-11-11 |
| 422 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 토큰 없이 부른다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-182 · API PUT /api/v1/announcements/{id}/reactions/{name} 401 | MTI-FN-338 | 2026-11-11 |
| 423 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 없는 번호로 부른다 | PUT /api/v1/announcements/{id}/reactions/{name} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-182 · API PUT /api/v1/announcements/{id}/reactions/{name} 404 | MTI-FN-338 | 2026-11-11 |
| 424 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-183 · API DELETE /api/v1/announcements/{id}/reactions/{name} 200 | MTI-FN-339 | 2026-11-11 |
| 425 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 토큰 없이 부른다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-183 · API DELETE /api/v1/announcements/{id}/reactions/{name} 401 | MTI-FN-340 | 2026-11-11 |
| 426 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 없는 번호로 부른다 | DELETE /api/v1/announcements/{id}/reactions/{name} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-183 · API DELETE /api/v1/announcements/{id}/reactions/{name} 404 | MTI-FN-340 | 2026-11-11 |
| 427 | 정상 | 토큰이 없다 | GET /api/v1/custom_emojis 를 토큰 없이 부른다 | GET /api/v1/custom_emojis 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-184 · API GET /api/v1/custom_emojis 200 | MTI-FN-341 | 2026-11-11 |
| 428 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/collections 를 일반 회원 토큰으로 부른다 | POST /api/v1/collections 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-185 · API POST /api/v1/collections 200 | MTI-FN-342 | 2026-11-11 |
| 429 | 예외 | 요청에 토큰이 없다 | POST /api/v1/collections 를 토큰 없이 부른다 | POST /api/v1/collections 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-185 · API POST /api/v1/collections 401 | MTI-FN-343 | 2026-11-11 |
| 430 | 정상 | 토큰이 없다 | GET /api/v1/collections/{id} 를 토큰 없이 부른다 | GET /api/v1/collections/{id} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-186 · API GET /api/v1/collections/{id} 200 | MTI-FN-344 | 2026-11-11 |
| 431 | 예외 | 토큰이 없다 | GET /api/v1/collections/{id} 를 없는 번호로 부른다 | GET /api/v1/collections/{id} 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-186 · API GET /api/v1/collections/{id} 404 | MTI-FN-345 | 2026-11-11 |
| 432 | 정상 | 일반 회원 토큰이 있다 | PATCH /api/v1/collections/{id} 를 일반 회원 토큰으로 부른다 | PATCH /api/v1/collections/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-187 · API PATCH /api/v1/collections/{id} 200 | MTI-FN-346 | 2026-11-11 |
| 433 | 예외 | 요청에 토큰이 없다 | PATCH /api/v1/collections/{id} 를 토큰 없이 부른다 | PATCH /api/v1/collections/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-187 · API PATCH /api/v1/collections/{id} 401 | MTI-FN-347 | 2026-11-11 |
| 434 | 예외 | 일반 회원 토큰이 있다 | PATCH /api/v1/collections/{id} 를 없는 번호로 부른다 | PATCH /api/v1/collections/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-187 · API PATCH /api/v1/collections/{id} 404 | MTI-FN-347 | 2026-11-11 |
| 435 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/collections/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/collections/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-188 · API DELETE /api/v1/collections/{id} 200 | MTI-FN-348 | 2026-11-11 |
| 436 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/collections/{id} 를 토큰 없이 부른다 | DELETE /api/v1/collections/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-188 · API DELETE /api/v1/collections/{id} 401 | MTI-FN-349 | 2026-11-11 |
| 437 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/collections/{id} 를 없는 번호로 부른다 | DELETE /api/v1/collections/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-188 · API DELETE /api/v1/collections/{id} 404 | MTI-FN-349 | 2026-11-11 |
| 438 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{account_id}/collections 를 토큰 없이 부른다 | GET /api/v1/accounts/{account_id}/collections 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-189 · API GET /api/v1/accounts/{account_id}/collections 200 | MTI-FN-350 | 2026-11-11 |
| 439 | 예외 | 토큰이 없다 | GET /api/v1/accounts/{account_id}/collections 를 없는 번호로 부른다 | GET /api/v1/accounts/{account_id}/collections 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-189 · API GET /api/v1/accounts/{account_id}/collections 404 | MTI-FN-351 | 2026-11-11 |
| 440 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{account_id}/in_collections 를 일반 회원 토큰으로 부른다 | GET /api/v1/accounts/{account_id}/in_collections 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-190 · API GET /api/v1/accounts/{account_id}/in_collections 200 | MTI-FN-352 | 2026-11-11 |
| 441 | 예외 | 요청에 토큰이 없다 | GET /api/v1/accounts/{account_id}/in_collections 를 토큰 없이 부른다 | GET /api/v1/accounts/{account_id}/in_collections 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-190 · API GET /api/v1/accounts/{account_id}/in_collections 401 | MTI-FN-353 | 2026-11-11 |
| 442 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/accounts/{account_id}/in_collections 를 없는 번호로 부른다 | GET /api/v1/accounts/{account_id}/in_collections 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-190 · API GET /api/v1/accounts/{account_id}/in_collections 404 | MTI-FN-353 | 2026-11-11 |
| 443 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/collections/{collection_id}/items 를 일반 회원 토큰으로 부른다 | POST /api/v1/collections/{collection_id}/items 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-191 · API POST /api/v1/collections/{collection_id}/items 200 | MTI-FN-354 | 2026-11-11 |
| 444 | 예외 | 요청에 토큰이 없다 | POST /api/v1/collections/{collection_id}/items 를 토큰 없이 부른다 | POST /api/v1/collections/{collection_id}/items 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-191 · API POST /api/v1/collections/{collection_id}/items 401 | MTI-FN-355 | 2026-11-11 |
| 445 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/collections/{collection_id}/items 를 없는 번호로 부른다 | POST /api/v1/collections/{collection_id}/items 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-191 · API POST /api/v1/collections/{collection_id}/items 404 | MTI-FN-355 | 2026-11-11 |
| 446 | 정상 | 일반 회원 토큰이 있다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 일반 회원 토큰으로 부른다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-192 · API DELETE /api/v1/collections/{collection_id}/items/{id} 200 | MTI-FN-356 | 2026-11-11 |
| 447 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 토큰 없이 부른다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-192 · API DELETE /api/v1/collections/{collection_id}/items/{id} 401 | MTI-FN-357 | 2026-11-11 |
| 448 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 없는 번호로 부른다 | DELETE /api/v1/collections/{collection_id}/items/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-192 · API DELETE /api/v1/collections/{collection_id}/items/{id} 404 | MTI-FN-357 | 2026-11-11 |
| 449 | 정상 | 일반 회원 토큰이 있다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 일반 회원 토큰으로 부른다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-193 · API POST /api/v1/collections/{collection_id}/items/{id}/revoke 200 |  | 2026-11-11 |
| 450 | 예외 | 요청에 토큰이 없다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 토큰 없이 부른다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-193 · API POST /api/v1/collections/{collection_id}/items/{id}/revoke 401 | MTI-FN-359 | 2026-11-11 |
| 451 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 없는 번호로 부른다 | POST /api/v1/collections/{collection_id}/items/{id}/revoke 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-193 · API POST /api/v1/collections/{collection_id}/items/{id}/revoke 404 | MTI-FN-359 | 2026-11-11 |
| 452 | 정상 | 토큰이 없다 | GET /api/v2/instance 를 토큰 없이 부른다 | GET /api/v2/instance 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-194 · API GET /api/v2/instance 200 | MTI-FN-360 | 2026-11-11 |
| 453 | 정상 | 토큰이 없다 | GET /api/v1/instance 를 토큰 없이 부른다 | GET /api/v1/instance 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-195 · API GET /api/v1/instance 200 | MTI-FN-361 | 2026-11-11 |
| 454 | 정상 | 토큰이 없다 | GET /api/v1/instance/rules 를 토큰 없이 부른다 | GET /api/v1/instance/rules 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-196 · API GET /api/v1/instance/rules 200 | MTI-FN-362 | 2026-11-11 |
| 455 | 정상 | 토큰이 없다 | GET /api/v1/instance/extended_description 을 토큰 없이 부른다 | GET /api/v1/instance/extended_description 을 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-197 · API GET /api/v1/instance/extended_description 200 | MTI-FN-363 | 2026-11-11 |
| 456 | 정상 | 토큰이 없다 | GET /api/v1/instance/privacy_policy 를 토큰 없이 부른다 | GET /api/v1/instance/privacy_policy 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-198 · API GET /api/v1/instance/privacy_policy 200 | MTI-FN-364 | 2026-11-11 |
| 457 | 정상 | 토큰이 없다 | GET /api/v1/instance/terms_of_service 를 토큰 없이 부른다 | GET /api/v1/instance/terms_of_service 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-199 · API GET /api/v1/instance/terms_of_service 200 | MTI-FN-365 | 2026-11-11 |
| 458 | 정상 | 토큰이 없다 | GET /api/v1/instance/terms_of_service/{date} 를 토큰 없이 부른다 | GET /api/v1/instance/terms_of_service/{date} 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-200 · API GET /api/v1/instance/terms_of_service/{date} 200 | MTI-FN-366 | 2026-11-11 |
| 459 | 예외 | 토큰이 없다 | GET /api/v1/instance/terms_of_service/{date} 를 없는 번호로 부른다 | GET /api/v1/instance/terms_of_service/{date} 를 없는 번호로 부르면 응답 코드가 404 다 | MTI-REQ-200 · API GET /api/v1/instance/terms_of_service/{date} 404 | MTI-FN-367 | 2026-11-11 |
| 460 | 정상 | 토큰이 없다 | GET /api/v1/instance/languages 를 토큰 없이 부른다 | GET /api/v1/instance/languages 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-201 | MTI-FN-368 | 2026-11-11 |
| 461 | 정상 | 토큰이 없다 | GET /api/v1/instance/translation_languages 를 토큰 없이 부른다 | GET /api/v1/instance/translation_languages 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-202 · API GET /api/v1/instance/translation_languages 200 | MTI-FN-369 | 2026-11-11 |
| 462 | 정상 | 토큰이 없다 | GET /api/v1/instance/peers 를 토큰 없이 부른다 | GET /api/v1/instance/peers 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-203 · API GET /api/v1/instance/peers 200 | MTI-FN-370 | 2026-11-11 |
| 463 | 정상 | 토큰이 없다 | GET /api/v1/instance/activity 를 토큰 없이 부른다 | GET /api/v1/instance/activity 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-204 · API GET /api/v1/instance/activity 200 | MTI-FN-371 | 2026-11-11 |
| 464 | 정상 | 토큰이 없다 | GET /health 를 토큰 없이 부른다 | GET /health 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-205 · API GET /health 200 | MTI-FN-372 | 2026-11-11 |
| 465 | 정상 | 토큰이 없다 | GET /api/oembed 를 토큰 없이 부른다 | GET /api/oembed 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-206 · API GET /api/oembed 200 | MTI-FN-373 | 2026-11-11 |
| 466 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/donation_campaigns 를 일반 회원 토큰으로 부른다 | GET /api/v1/donation_campaigns 를 일반 회원 토큰으로 부르면 응답 코드가 200 이나 204 다 | MTI-REQ-207 | MTI-FN-374 | 2026-11-11 |
| 467 | 예외 | 요청에 토큰이 없다 | GET /api/v1/donation_campaigns 를 토큰 없이 부른다 | GET /api/v1/donation_campaigns 를 토큰 없이 부르면 응답 코드가 422 다 | MTI-REQ-207 | MTI-FN-375 | 2026-11-11 |
| 468 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/user 를 토큰 없이 부른다 | GET /api/v1/streaming/user 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-208 · API GET /api/v1/streaming/user 401 | MTI-FN-376 | 2026-11-11 |
| 469 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/user/notification 을 토큰 없이 부른다 | GET /api/v1/streaming/user/notification 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-209 · API GET /api/v1/streaming/user/notification 401 | MTI-FN-377 | 2026-11-11 |
| 470 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/public 를 토큰 없이 부른다 | GET /api/v1/streaming/public 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-210 · API GET /api/v1/streaming/public 401 | MTI-FN-378 | 2026-11-11 |
| 471 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/public/local 을 토큰 없이 부른다 | GET /api/v1/streaming/public/local 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-211 · API GET /api/v1/streaming/public/local 401 | MTI-FN-379 | 2026-11-11 |
| 472 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/public/remote 를 토큰 없이 부른다 | GET /api/v1/streaming/public/remote 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-212 · API GET /api/v1/streaming/public/remote 401 | MTI-FN-380 | 2026-11-11 |
| 473 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/hashtag 를 토큰 없이 부른다 | GET /api/v1/streaming/hashtag 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-213 · API GET /api/v1/streaming/hashtag 401 | MTI-FN-381 | 2026-11-11 |
| 474 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/hashtag/local 을 토큰 없이 부른다 | GET /api/v1/streaming/hashtag/local 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-214 · API GET /api/v1/streaming/hashtag/local 401 | MTI-FN-382 | 2026-11-11 |
| 475 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/list 를 토큰 없이 부른다 | GET /api/v1/streaming/list 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-215 · API GET /api/v1/streaming/list 401 | MTI-FN-383 | 2026-11-11 |
| 476 | 예외 | 요청에 토큰이 없다 | GET /api/v1/streaming/direct 를 토큰 없이 부른다 | GET /api/v1/streaming/direct 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-216 · API GET /api/v1/streaming/direct 401 | MTI-FN-384 | 2026-11-11 |
| 477 | 정상 | 토큰이 없다 | GET /api/v1/streaming/health 를 토큰 없이 부른다 | GET /api/v1/streaming/health 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-217 · API GET /api/v1/streaming/health 200 | MTI-FN-385 | 2026-11-11 |
| 478 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/accounts 를 어드민 키로 부른다 | GET /api/v1/admin/accounts 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-218 · API GET /api/v1/admin/accounts 200 | MTI-FN-386 | 2026-11-11 |
| 479 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/accounts 를 토큰 없이 부른다 | GET /api/v1/admin/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-218 · API GET /api/v1/admin/accounts 401 | MTI-FN-387 | 2026-11-11 |
| 480 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/accounts 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/accounts 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-218 · API GET /api/v1/admin/accounts 403 | MTI-FN-387 | 2026-11-11 |
| 481 | 정상 | 어드민 키가 있다 | GET /api/v2/admin/accounts 를 어드민 키로 부른다 | GET /api/v2/admin/accounts 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-219 · API GET /api/v2/admin/accounts 200 | MTI-FN-388 | 2026-11-11 |
| 482 | 예외 | 요청에 토큰이 없다 | GET /api/v2/admin/accounts 를 토큰 없이 부른다 | GET /api/v2/admin/accounts 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-219 · API GET /api/v2/admin/accounts 401 | MTI-FN-389 | 2026-11-11 |
| 483 | 예외 | 일반 회원 토큰이 있다 | GET /api/v2/admin/accounts 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v2/admin/accounts 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-219 · API GET /api/v2/admin/accounts 403 | MTI-FN-389 | 2026-11-11 |
| 484 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/accounts/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/accounts/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-220 · API GET /api/v1/admin/accounts/{id} 200 | MTI-FN-390 | 2026-11-11 |
| 485 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/accounts/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/accounts/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-220 · API GET /api/v1/admin/accounts/{id} 401 | MTI-FN-391 | 2026-11-11 |
| 486 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/accounts/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/accounts/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-220 · API GET /api/v1/admin/accounts/{id} 403 | MTI-FN-391 | 2026-11-11 |
| 487 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/accounts/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/accounts/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-220 · API GET /api/v1/admin/accounts/{id} 404 | MTI-FN-391 | 2026-11-11 |
| 488 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/action 을 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/action 을 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-221 · API POST /api/v1/admin/accounts/{id}/action 200 | MTI-FN-392 | 2026-11-11 |
| 489 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/action 을 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/action 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-221 · API POST /api/v1/admin/accounts/{id}/action 401 | MTI-FN-393 | 2026-11-11 |
| 490 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/action 을 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/action 을 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-221 · API POST /api/v1/admin/accounts/{id}/action 403 | MTI-FN-393 | 2026-11-11 |
| 491 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/action 을 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/action 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-221 · API POST /api/v1/admin/accounts/{id}/action 404 | MTI-FN-393 | 2026-11-11 |
| 492 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/enable 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/enable 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-222 · API POST /api/v1/admin/accounts/{id}/enable 200 | MTI-FN-394 | 2026-11-11 |
| 493 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/enable 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/enable 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-222 · API POST /api/v1/admin/accounts/{id}/enable 401 | MTI-FN-395 | 2026-11-11 |
| 494 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/enable 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/enable 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-222 · API POST /api/v1/admin/accounts/{id}/enable 403 | MTI-FN-395 | 2026-11-11 |
| 495 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/enable 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/enable 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-222 · API POST /api/v1/admin/accounts/{id}/enable 404 | MTI-FN-395 | 2026-11-11 |
| 496 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-223 · API POST /api/v1/admin/accounts/{id}/unsensitive 200 | MTI-FN-396 | 2026-11-11 |
| 497 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-223 · API POST /api/v1/admin/accounts/{id}/unsensitive 401 | MTI-FN-397 | 2026-11-11 |
| 498 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-223 · API POST /api/v1/admin/accounts/{id}/unsensitive 403 | MTI-FN-397 | 2026-11-11 |
| 499 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/unsensitive 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-223 · API POST /api/v1/admin/accounts/{id}/unsensitive 404 | MTI-FN-397 | 2026-11-11 |
| 500 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsilence 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/unsilence 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-224 · API POST /api/v1/admin/accounts/{id}/unsilence 200 | MTI-FN-398 | 2026-11-11 |
| 501 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/unsilence 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/unsilence 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-224 · API POST /api/v1/admin/accounts/{id}/unsilence 401 | MTI-FN-399 | 2026-11-11 |
| 502 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/unsilence 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/unsilence 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-224 · API POST /api/v1/admin/accounts/{id}/unsilence 403 | MTI-FN-399 | 2026-11-11 |
| 503 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsilence 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/unsilence 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-224 · API POST /api/v1/admin/accounts/{id}/unsilence 404 | MTI-FN-399 | 2026-11-11 |
| 504 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-225 · API POST /api/v1/admin/accounts/{id}/unsuspend 200 | MTI-FN-400 | 2026-11-11 |
| 505 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-225 · API POST /api/v1/admin/accounts/{id}/unsuspend 401 | MTI-FN-401 | 2026-11-11 |
| 506 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-225 · API POST /api/v1/admin/accounts/{id}/unsuspend 403 | MTI-FN-401 | 2026-11-11 |
| 507 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/unsuspend 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-225 · API POST /api/v1/admin/accounts/{id}/unsuspend 404 | MTI-FN-401 | 2026-11-11 |
| 508 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/approve 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-226 · API POST /api/v1/admin/accounts/{id}/approve 200 | MTI-FN-402 | 2026-11-11 |
| 509 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/approve 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/approve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-226 · API POST /api/v1/admin/accounts/{id}/approve 401 | MTI-FN-403 | 2026-11-11 |
| 510 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/approve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/approve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-226 · API POST /api/v1/admin/accounts/{id}/approve 403 | MTI-FN-403 | 2026-11-11 |
| 511 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/approve 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/approve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-226 · API POST /api/v1/admin/accounts/{id}/approve 404 | MTI-FN-403 | 2026-11-11 |
| 512 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/reject 를 어드민 키로 부른다 | POST /api/v1/admin/accounts/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-227 · API POST /api/v1/admin/accounts/{id}/reject 200 | MTI-FN-404 | 2026-11-11 |
| 513 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/accounts/{id}/reject 를 토큰 없이 부른다 | POST /api/v1/admin/accounts/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-227 · API POST /api/v1/admin/accounts/{id}/reject 401 | MTI-FN-405 | 2026-11-11 |
| 514 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/accounts/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/accounts/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-227 · API POST /api/v1/admin/accounts/{id}/reject 403 | MTI-FN-405 | 2026-11-11 |
| 515 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/accounts/{id}/reject 를 없는 번호로 부른다 | POST /api/v1/admin/accounts/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-227 · API POST /api/v1/admin/accounts/{id}/reject 404 | MTI-FN-405 | 2026-11-11 |
| 516 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/accounts/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/accounts/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-228 · API DELETE /api/v1/admin/accounts/{id} 200 | MTI-FN-406 | 2026-11-11 |
| 517 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/accounts/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/accounts/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-228 · API DELETE /api/v1/admin/accounts/{id} 401 | MTI-FN-407 | 2026-11-11 |
| 518 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/accounts/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/accounts/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-228 · API DELETE /api/v1/admin/accounts/{id} 403 | MTI-FN-407 | 2026-11-11 |
| 519 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/accounts/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/accounts/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-228 · API DELETE /api/v1/admin/accounts/{id} 404 | MTI-FN-407 | 2026-11-11 |
| 520 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/reports 를 어드민 키로 부른다 | GET /api/v1/admin/reports 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-229 · API GET /api/v1/admin/reports 200 | MTI-FN-408 | 2026-11-11 |
| 521 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/reports 를 토큰 없이 부른다 | GET /api/v1/admin/reports 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-229 · API GET /api/v1/admin/reports 401 | MTI-FN-409 | 2026-11-11 |
| 522 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/reports 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/reports 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-229 · API GET /api/v1/admin/reports 403 | MTI-FN-409 | 2026-11-11 |
| 523 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/reports/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/reports/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-230 · API GET /api/v1/admin/reports/{id} 200 | MTI-FN-410 | 2026-11-11 |
| 524 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/reports/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/reports/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-230 · API GET /api/v1/admin/reports/{id} 401 | MTI-FN-411 | 2026-11-11 |
| 525 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/reports/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/reports/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-230 · API GET /api/v1/admin/reports/{id} 403 | MTI-FN-411 | 2026-11-11 |
| 526 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/reports/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/reports/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-230 · API GET /api/v1/admin/reports/{id} 404 | MTI-FN-411 | 2026-11-11 |
| 527 | 정상 | 어드민 키가 있다 | PUT /api/v1/admin/reports/{id} 를 어드민 키로 부른다 | PUT /api/v1/admin/reports/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-231 · API PUT /api/v1/admin/reports/{id} 200 | MTI-FN-412 | 2026-11-11 |
| 528 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/admin/reports/{id} 를 토큰 없이 부른다 | PUT /api/v1/admin/reports/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-231 · API PUT /api/v1/admin/reports/{id} 401 | MTI-FN-413 | 2026-11-11 |
| 529 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/admin/reports/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | PUT /api/v1/admin/reports/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-231 · API PUT /api/v1/admin/reports/{id} 403 | MTI-FN-413 | 2026-11-11 |
| 530 | 예외 | 어드민 키가 있다 | PUT /api/v1/admin/reports/{id} 를 없는 번호로 부른다 | PUT /api/v1/admin/reports/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-231 · API PUT /api/v1/admin/reports/{id} 404 | MTI-FN-413 | 2026-11-11 |
| 531 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 어드민 키로 부른다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-232 · API POST /api/v1/admin/reports/{id}/assign_to_self 200 | MTI-FN-414 | 2026-11-11 |
| 532 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 토큰 없이 부른다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-232 · API POST /api/v1/admin/reports/{id}/assign_to_self 401 | MTI-FN-415 | 2026-11-11 |
| 533 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-232 · API POST /api/v1/admin/reports/{id}/assign_to_self 403 | MTI-FN-415 | 2026-11-11 |
| 534 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 없는 번호로 부른다 | POST /api/v1/admin/reports/{id}/assign_to_self 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-232 · API POST /api/v1/admin/reports/{id}/assign_to_self 404 | MTI-FN-415 | 2026-11-11 |
| 535 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/unassign 을 어드민 키로 부른다 | POST /api/v1/admin/reports/{id}/unassign 을 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-233 · API POST /api/v1/admin/reports/{id}/unassign 200 | MTI-FN-416 | 2026-11-11 |
| 536 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/reports/{id}/unassign 을 토큰 없이 부른다 | POST /api/v1/admin/reports/{id}/unassign 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-233 · API POST /api/v1/admin/reports/{id}/unassign 401 | MTI-FN-417 | 2026-11-11 |
| 537 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/reports/{id}/unassign 을 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/reports/{id}/unassign 을 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-233 · API POST /api/v1/admin/reports/{id}/unassign 403 | MTI-FN-417 | 2026-11-11 |
| 538 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/unassign 을 없는 번호로 부른다 | POST /api/v1/admin/reports/{id}/unassign 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-233 · API POST /api/v1/admin/reports/{id}/unassign 404 | MTI-FN-417 | 2026-11-11 |
| 539 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/resolve 를 어드민 키로 부른다 | POST /api/v1/admin/reports/{id}/resolve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-234 · API POST /api/v1/admin/reports/{id}/resolve 200 | MTI-FN-418 | 2026-11-11 |
| 540 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/reports/{id}/resolve 를 토큰 없이 부른다 | POST /api/v1/admin/reports/{id}/resolve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-234 · API POST /api/v1/admin/reports/{id}/resolve 401 | MTI-FN-419 | 2026-11-11 |
| 541 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/reports/{id}/resolve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/reports/{id}/resolve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-234 · API POST /api/v1/admin/reports/{id}/resolve 403 | MTI-FN-419 | 2026-11-11 |
| 542 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/resolve 를 없는 번호로 부른다 | POST /api/v1/admin/reports/{id}/resolve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-234 · API POST /api/v1/admin/reports/{id}/resolve 404 | MTI-FN-419 | 2026-11-11 |
| 543 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/reopen 을 어드민 키로 부른다 | POST /api/v1/admin/reports/{id}/reopen 을 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-235 · API POST /api/v1/admin/reports/{id}/reopen 200 | MTI-FN-420 | 2026-11-11 |
| 544 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/reports/{id}/reopen 을 토큰 없이 부른다 | POST /api/v1/admin/reports/{id}/reopen 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-235 · API POST /api/v1/admin/reports/{id}/reopen 401 | MTI-FN-421 | 2026-11-11 |
| 545 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/reports/{id}/reopen 을 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/reports/{id}/reopen 을 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-235 · API POST /api/v1/admin/reports/{id}/reopen 403 | MTI-FN-421 | 2026-11-11 |
| 546 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/reports/{id}/reopen 을 없는 번호로 부른다 | POST /api/v1/admin/reports/{id}/reopen 을 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-235 · API POST /api/v1/admin/reports/{id}/reopen 404 | MTI-FN-421 | 2026-11-11 |
| 547 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/domain_blocks 를 어드민 키로 부른다 | GET /api/v1/admin/domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-236 · API GET /api/v1/admin/domain_blocks 200 | MTI-FN-422 | 2026-11-11 |
| 548 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/domain_blocks 를 토큰 없이 부른다 | GET /api/v1/admin/domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-236 · API GET /api/v1/admin/domain_blocks 401 | MTI-FN-423 | 2026-11-11 |
| 549 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/domain_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/domain_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-236 · API GET /api/v1/admin/domain_blocks 403 | MTI-FN-423 | 2026-11-11 |
| 550 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-237 · API GET /api/v1/admin/domain_blocks/{id} 200 | MTI-FN-424 | 2026-11-11 |
| 551 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-237 · API GET /api/v1/admin/domain_blocks/{id} 401 | MTI-FN-425 | 2026-11-11 |
| 552 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/domain_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/domain_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-237 · API GET /api/v1/admin/domain_blocks/{id} 403 | MTI-FN-425 | 2026-11-11 |
| 553 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-237 · API GET /api/v1/admin/domain_blocks/{id} 404 | MTI-FN-425 | 2026-11-11 |
| 554 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/domain_blocks 를 어드민 키로 부른다 | POST /api/v1/admin/domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-238 · API POST /api/v1/admin/domain_blocks 200 | MTI-FN-426 | 2026-11-11 |
| 555 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/domain_blocks 를 토큰 없이 부른다 | POST /api/v1/admin/domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-238 · API POST /api/v1/admin/domain_blocks 401 | MTI-FN-427 | 2026-11-11 |
| 556 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/domain_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/domain_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-238 · API POST /api/v1/admin/domain_blocks 403 | MTI-FN-427 | 2026-11-11 |
| 557 | 정상 | 어드민 키가 있다 | PUT /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부른다 | PUT /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-239 · API PUT /api/v1/admin/domain_blocks/{id} 200 | MTI-FN-428 | 2026-11-11 |
| 558 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부른다 | PUT /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-239 · API PUT /api/v1/admin/domain_blocks/{id} 401 | MTI-FN-429 | 2026-11-11 |
| 559 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/admin/domain_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | PUT /api/v1/admin/domain_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-239 · API PUT /api/v1/admin/domain_blocks/{id} 403 | MTI-FN-429 | 2026-11-11 |
| 560 | 예외 | 어드민 키가 있다 | PUT /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른다 | PUT /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-239 · API PUT /api/v1/admin/domain_blocks/{id} 404 | MTI-FN-429 | 2026-11-11 |
| 561 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/domain_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-240 · API DELETE /api/v1/admin/domain_blocks/{id} 200 | MTI-FN-430 | 2026-11-11 |
| 562 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/domain_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-240 · API DELETE /api/v1/admin/domain_blocks/{id} 401 | MTI-FN-431 | 2026-11-11 |
| 563 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/domain_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/domain_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-240 · API DELETE /api/v1/admin/domain_blocks/{id} 403 | MTI-FN-431 | 2026-11-11 |
| 564 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/domain_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-240 · API DELETE /api/v1/admin/domain_blocks/{id} 404 | MTI-FN-431 | 2026-11-11 |
| 565 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/domain_allows 를 어드민 키로 부른다 | GET /api/v1/admin/domain_allows 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-241 · API GET /api/v1/admin/domain_allows 200 | MTI-FN-432 | 2026-11-11 |
| 566 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/domain_allows 를 토큰 없이 부른다 | GET /api/v1/admin/domain_allows 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-241 · API GET /api/v1/admin/domain_allows 401 | MTI-FN-433 | 2026-11-11 |
| 567 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/domain_allows 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/domain_allows 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-241 · API GET /api/v1/admin/domain_allows 403 | MTI-FN-433 | 2026-11-11 |
| 568 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/domain_allows/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/domain_allows/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-242 · API GET /api/v1/admin/domain_allows/{id} 200 | MTI-FN-434 | 2026-11-11 |
| 569 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/domain_allows/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/domain_allows/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-242 · API GET /api/v1/admin/domain_allows/{id} 401 | MTI-FN-435 | 2026-11-11 |
| 570 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/domain_allows/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/domain_allows/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-242 · API GET /api/v1/admin/domain_allows/{id} 403 | MTI-FN-435 | 2026-11-11 |
| 571 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/domain_allows/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/domain_allows/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-242 · API GET /api/v1/admin/domain_allows/{id} 404 | MTI-FN-435 | 2026-11-11 |
| 572 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/domain_allows 를 어드민 키로 부른다 | POST /api/v1/admin/domain_allows 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-243 · API POST /api/v1/admin/domain_allows 200 | MTI-FN-436 | 2026-11-11 |
| 573 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/domain_allows 를 토큰 없이 부른다 | POST /api/v1/admin/domain_allows 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-243 · API POST /api/v1/admin/domain_allows 401 | MTI-FN-437 | 2026-11-11 |
| 574 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/domain_allows 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/domain_allows 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-243 · API POST /api/v1/admin/domain_allows 403 | MTI-FN-437 | 2026-11-11 |
| 575 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/domain_allows/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/domain_allows/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-244 · API DELETE /api/v1/admin/domain_allows/{id} 200 | MTI-FN-438 | 2026-11-11 |
| 576 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/domain_allows/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/domain_allows/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-244 · API DELETE /api/v1/admin/domain_allows/{id} 401 | MTI-FN-439 | 2026-11-11 |
| 577 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/domain_allows/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/domain_allows/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-244 · API DELETE /api/v1/admin/domain_allows/{id} 403 | MTI-FN-439 | 2026-11-11 |
| 578 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/domain_allows/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/domain_allows/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-244 · API DELETE /api/v1/admin/domain_allows/{id} 404 | MTI-FN-439 | 2026-11-11 |
| 579 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/email_domain_blocks 를 어드민 키로 부른다 | GET /api/v1/admin/email_domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-245 · API GET /api/v1/admin/email_domain_blocks 200 | MTI-FN-440 | 2026-11-11 |
| 580 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/email_domain_blocks 를 토큰 없이 부른다 | GET /api/v1/admin/email_domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-245 · API GET /api/v1/admin/email_domain_blocks 401 | MTI-FN-441 | 2026-11-11 |
| 581 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/email_domain_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/email_domain_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-245 · API GET /api/v1/admin/email_domain_blocks 403 | MTI-FN-441 | 2026-11-11 |
| 582 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/email_domain_blocks/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/email_domain_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-246 · API GET /api/v1/admin/email_domain_blocks/{id} 200 | MTI-FN-442 | 2026-11-11 |
| 583 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/email_domain_blocks/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/email_domain_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-246 · API GET /api/v1/admin/email_domain_blocks/{id} 401 | MTI-FN-443 | 2026-11-11 |
| 584 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/email_domain_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/email_domain_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-246 · API GET /api/v1/admin/email_domain_blocks/{id} 403 | MTI-FN-443 | 2026-11-11 |
| 585 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/email_domain_blocks/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/email_domain_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-246 · API GET /api/v1/admin/email_domain_blocks/{id} 404 | MTI-FN-443 | 2026-11-11 |
| 586 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/email_domain_blocks 를 어드민 키로 부른다 | POST /api/v1/admin/email_domain_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-247 · API POST /api/v1/admin/email_domain_blocks 200 | MTI-FN-444 | 2026-11-11 |
| 587 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/email_domain_blocks 를 토큰 없이 부른다 | POST /api/v1/admin/email_domain_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-247 · API POST /api/v1/admin/email_domain_blocks 401 | MTI-FN-445 | 2026-11-11 |
| 588 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/email_domain_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/email_domain_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-247 · API POST /api/v1/admin/email_domain_blocks 403 | MTI-FN-445 | 2026-11-11 |
| 589 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-248 · API DELETE /api/v1/admin/email_domain_blocks/{id} 200 | MTI-FN-446 | 2026-11-11 |
| 590 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-248 · API DELETE /api/v1/admin/email_domain_blocks/{id} 401 | MTI-FN-447 | 2026-11-11 |
| 591 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-248 · API DELETE /api/v1/admin/email_domain_blocks/{id} 403 | MTI-FN-447 | 2026-11-11 |
| 592 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/email_domain_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-248 · API DELETE /api/v1/admin/email_domain_blocks/{id} 404 | MTI-FN-447 | 2026-11-11 |
| 593 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/ip_blocks 를 어드민 키로 부른다 | GET /api/v1/admin/ip_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-249 · API GET /api/v1/admin/ip_blocks 200 | MTI-FN-448 | 2026-11-11 |
| 594 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/ip_blocks 를 토큰 없이 부른다 | GET /api/v1/admin/ip_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-249 · API GET /api/v1/admin/ip_blocks 401 | MTI-FN-449 | 2026-11-11 |
| 595 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/ip_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/ip_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-249 · API GET /api/v1/admin/ip_blocks 403 | MTI-FN-449 | 2026-11-11 |
| 596 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-250 · API GET /api/v1/admin/ip_blocks/{id} 200 | MTI-FN-450 | 2026-11-11 |
| 597 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-250 · API GET /api/v1/admin/ip_blocks/{id} 401 | MTI-FN-451 | 2026-11-11 |
| 598 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/ip_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/ip_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-250 · API GET /api/v1/admin/ip_blocks/{id} 403 | MTI-FN-451 | 2026-11-11 |
| 599 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-250 · API GET /api/v1/admin/ip_blocks/{id} 404 | MTI-FN-451 | 2026-11-11 |
| 600 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/ip_blocks 를 어드민 키로 부른다 | POST /api/v1/admin/ip_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-251 · API POST /api/v1/admin/ip_blocks 200 | MTI-FN-452 | 2026-11-11 |
| 601 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/ip_blocks 를 토큰 없이 부른다 | POST /api/v1/admin/ip_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-251 · API POST /api/v1/admin/ip_blocks 401 | MTI-FN-453 | 2026-11-11 |
| 602 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/ip_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/ip_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-251 · API POST /api/v1/admin/ip_blocks 403 | MTI-FN-453 | 2026-11-11 |
| 603 | 정상 | 어드민 키가 있다 | PUT /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부른다 | PUT /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-252 · API PUT /api/v1/admin/ip_blocks/{id} 200 | MTI-FN-454 | 2026-11-11 |
| 604 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부른다 | PUT /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-252 · API PUT /api/v1/admin/ip_blocks/{id} 401 | MTI-FN-455 | 2026-11-11 |
| 605 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/admin/ip_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | PUT /api/v1/admin/ip_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-252 · API PUT /api/v1/admin/ip_blocks/{id} 403 | MTI-FN-455 | 2026-11-11 |
| 606 | 예외 | 어드민 키가 있다 | PUT /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른다 | PUT /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-252 · API PUT /api/v1/admin/ip_blocks/{id} 404 | MTI-FN-455 | 2026-11-11 |
| 607 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/ip_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-253 · API DELETE /api/v1/admin/ip_blocks/{id} 200 | MTI-FN-456 | 2026-11-11 |
| 608 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/ip_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-253 · API DELETE /api/v1/admin/ip_blocks/{id} 401 | MTI-FN-457 | 2026-11-11 |
| 609 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/ip_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/ip_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-253 · API DELETE /api/v1/admin/ip_blocks/{id} 403 | MTI-FN-457 | 2026-11-11 |
| 610 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/ip_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-253 · API DELETE /api/v1/admin/ip_blocks/{id} 404 | MTI-FN-457 | 2026-11-11 |
| 611 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/canonical_email_blocks 를 어드민 키로 부른다 | GET /api/v1/admin/canonical_email_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-254 · API GET /api/v1/admin/canonical_email_blocks 200 | MTI-FN-458 | 2026-11-11 |
| 612 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/canonical_email_blocks 를 토큰 없이 부른다 | GET /api/v1/admin/canonical_email_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-254 · API GET /api/v1/admin/canonical_email_blocks 401 | MTI-FN-459 | 2026-11-11 |
| 613 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/canonical_email_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/canonical_email_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-254 · API GET /api/v1/admin/canonical_email_blocks 403 | MTI-FN-459 | 2026-11-11 |
| 614 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-255 · API GET /api/v1/admin/canonical_email_blocks/{id} 200 | MTI-FN-460 | 2026-11-11 |
| 615 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-255 · API GET /api/v1/admin/canonical_email_blocks/{id} 401 | MTI-FN-461 | 2026-11-11 |
| 616 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-255 · API GET /api/v1/admin/canonical_email_blocks/{id} 403 | MTI-FN-461 | 2026-11-11 |
| 617 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/canonical_email_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-255 · API GET /api/v1/admin/canonical_email_blocks/{id} 404 | MTI-FN-461 | 2026-11-11 |
| 618 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/canonical_email_blocks 를 어드민 키로 부른다 | POST /api/v1/admin/canonical_email_blocks 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-256 · API POST /api/v1/admin/canonical_email_blocks 200 | MTI-FN-462 | 2026-11-11 |
| 619 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/canonical_email_blocks 를 토큰 없이 부른다 | POST /api/v1/admin/canonical_email_blocks 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-256 · API POST /api/v1/admin/canonical_email_blocks 401 | MTI-FN-463 | 2026-11-11 |
| 620 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/canonical_email_blocks 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/canonical_email_blocks 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-256 · API POST /api/v1/admin/canonical_email_blocks 403 | MTI-FN-463 | 2026-11-11 |
| 621 | 정상 | 어드민 키가 있다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 어드민 키로 부른다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-257 · API DELETE /api/v1/admin/canonical_email_blocks/{id} 200 | MTI-FN-464 | 2026-11-11 |
| 622 | 예외 | 요청에 토큰이 없다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 토큰 없이 부른다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-257 · API DELETE /api/v1/admin/canonical_email_blocks/{id} 401 | MTI-FN-465 | 2026-11-11 |
| 623 | 예외 | 일반 회원 토큰이 있다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-257 · API DELETE /api/v1/admin/canonical_email_blocks/{id} 403 | MTI-FN-465 | 2026-11-11 |
| 624 | 예외 | 어드민 키가 있다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 없는 번호로 부른다 | DELETE /api/v1/admin/canonical_email_blocks/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-257 · API DELETE /api/v1/admin/canonical_email_blocks/{id} 404 | MTI-FN-465 | 2026-11-11 |
| 625 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/canonical_email_blocks/test 를 어드민 키로 부른다 | POST /api/v1/admin/canonical_email_blocks/test 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-258 · API POST /api/v1/admin/canonical_email_blocks/test 200 | MTI-FN-466 | 2026-11-11 |
| 626 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/canonical_email_blocks/test 를 토큰 없이 부른다 | POST /api/v1/admin/canonical_email_blocks/test 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-258 · API POST /api/v1/admin/canonical_email_blocks/test 401 | MTI-FN-467 | 2026-11-11 |
| 627 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/canonical_email_blocks/test 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/canonical_email_blocks/test 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-258 · API POST /api/v1/admin/canonical_email_blocks/test 403 | MTI-FN-467 | 2026-11-11 |
| 628 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/tags 를 어드민 키로 부른다 | GET /api/v1/admin/tags 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-259 | MTI-FN-468 | 2026-11-11 |
| 629 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/tags 를 토큰 없이 부른다 | GET /api/v1/admin/tags 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-259 | MTI-FN-469 | 2026-11-11 |
| 630 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/tags 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/tags 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-259 | MTI-FN-469 | 2026-11-11 |
| 631 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/tags/{id} 를 어드민 키로 부른다 | GET /api/v1/admin/tags/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-260 | MTI-FN-470 | 2026-11-11 |
| 632 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/tags/{id} 를 토큰 없이 부른다 | GET /api/v1/admin/tags/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-260 | MTI-FN-471 | 2026-11-11 |
| 633 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/tags/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/tags/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-260 | MTI-FN-471 | 2026-11-11 |
| 634 | 예외 | 어드민 키가 있다 | GET /api/v1/admin/tags/{id} 를 없는 번호로 부른다 | GET /api/v1/admin/tags/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-260 | MTI-FN-471 | 2026-11-11 |
| 635 | 정상 | 어드민 키가 있다 | PUT /api/v1/admin/tags/{id} 를 어드민 키로 부른다 | PUT /api/v1/admin/tags/{id} 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-261 | MTI-FN-472 | 2026-11-11 |
| 636 | 예외 | 요청에 토큰이 없다 | PUT /api/v1/admin/tags/{id} 를 토큰 없이 부른다 | PUT /api/v1/admin/tags/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-261 | MTI-FN-473 | 2026-11-11 |
| 637 | 예외 | 일반 회원 토큰이 있다 | PUT /api/v1/admin/tags/{id} 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | PUT /api/v1/admin/tags/{id} 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-261 | MTI-FN-473 | 2026-11-11 |
| 638 | 예외 | 어드민 키가 있다 | PUT /api/v1/admin/tags/{id} 를 없는 번호로 부른다 | PUT /api/v1/admin/tags/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-261 | MTI-FN-473 | 2026-11-11 |
| 639 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/trends/tags 를 어드민 키로 부른다 | GET /api/v1/admin/trends/tags 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-262 · API GET /api/v1/admin/trends/tags 200 | MTI-FN-474 | 2026-11-11 |
| 640 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/trends/tags 를 토큰 없이 부른다 | GET /api/v1/admin/trends/tags 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-262 · API GET /api/v1/admin/trends/tags 401 | MTI-FN-475 | 2026-11-11 |
| 641 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/trends/tags 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/trends/tags 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-262 · API GET /api/v1/admin/trends/tags 403 | MTI-FN-475 | 2026-11-11 |
| 642 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/trends/links 를 어드민 키로 부른다 | GET /api/v1/admin/trends/links 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-263 · API GET /api/v1/admin/trends/links 200 | MTI-FN-476 | 2026-11-11 |
| 643 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/trends/links 를 토큰 없이 부른다 | GET /api/v1/admin/trends/links 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-263 · API GET /api/v1/admin/trends/links 401 | MTI-FN-477 | 2026-11-11 |
| 644 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/trends/links 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/trends/links 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-263 · API GET /api/v1/admin/trends/links 403 | MTI-FN-477 | 2026-11-11 |
| 645 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/trends/statuses 를 어드민 키로 부른다 | GET /api/v1/admin/trends/statuses 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-264 · API GET /api/v1/admin/trends/statuses 200 | MTI-FN-478 | 2026-11-11 |
| 646 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/trends/statuses 를 토큰 없이 부른다 | GET /api/v1/admin/trends/statuses 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-264 · API GET /api/v1/admin/trends/statuses 401 | MTI-FN-479 | 2026-11-11 |
| 647 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/trends/statuses 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/trends/statuses 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-264 · API GET /api/v1/admin/trends/statuses 403 | MTI-FN-479 | 2026-11-11 |
| 648 | 정상 | 어드민 키가 있다 | GET /api/v1/admin/trends/links/publishers 를 어드민 키로 부른다 | GET /api/v1/admin/trends/links/publishers 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-265 | MTI-FN-480 | 2026-11-11 |
| 649 | 예외 | 요청에 토큰이 없다 | GET /api/v1/admin/trends/links/publishers 를 토큰 없이 부른다 | GET /api/v1/admin/trends/links/publishers 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-265 | MTI-FN-481 | 2026-11-11 |
| 650 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1/admin/trends/links/publishers 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | GET /api/v1/admin/trends/links/publishers 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-265 | MTI-FN-481 | 2026-11-11 |
| 651 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/tags/{id}/approve 를 어드민 키로 부른다 | POST /api/v1/admin/trends/tags/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-266 | MTI-FN-482 | 2026-11-11 |
| 652 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/tags/{id}/approve 를 토큰 없이 부른다 | POST /api/v1/admin/trends/tags/{id}/approve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-266 | MTI-FN-483 | 2026-11-11 |
| 653 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/tags/{id}/approve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/tags/{id}/approve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-266 | MTI-FN-483 | 2026-11-11 |
| 654 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/tags/{id}/approve 를 없는 번호로 부른다 | POST /api/v1/admin/trends/tags/{id}/approve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-266 | MTI-FN-483 | 2026-11-11 |
| 655 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/tags/{id}/reject 를 어드민 키로 부른다 | POST /api/v1/admin/trends/tags/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-267 | MTI-FN-484 | 2026-11-11 |
| 656 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/tags/{id}/reject 를 토큰 없이 부른다 | POST /api/v1/admin/trends/tags/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-267 | MTI-FN-485 | 2026-11-11 |
| 657 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/tags/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/tags/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-267 | MTI-FN-485 | 2026-11-11 |
| 658 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/tags/{id}/reject 를 없는 번호로 부른다 | POST /api/v1/admin/trends/tags/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-267 | MTI-FN-485 | 2026-11-11 |
| 659 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/{id}/approve 를 어드민 키로 부른다 | POST /api/v1/admin/trends/links/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-268 | MTI-FN-486 | 2026-11-11 |
| 660 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/links/{id}/approve 를 토큰 없이 부른다 | POST /api/v1/admin/trends/links/{id}/approve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-268 | MTI-FN-487 | 2026-11-11 |
| 661 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/links/{id}/approve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/links/{id}/approve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-268 | MTI-FN-487 | 2026-11-11 |
| 662 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/{id}/approve 를 없는 번호로 부른다 | POST /api/v1/admin/trends/links/{id}/approve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-268 | MTI-FN-487 | 2026-11-11 |
| 663 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/{id}/reject 를 어드민 키로 부른다 | POST /api/v1/admin/trends/links/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-269 | MTI-FN-488 | 2026-11-11 |
| 664 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/links/{id}/reject 를 토큰 없이 부른다 | POST /api/v1/admin/trends/links/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-269 | MTI-FN-489 | 2026-11-11 |
| 665 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/links/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/links/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-269 | MTI-FN-489 | 2026-11-11 |
| 666 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/{id}/reject 를 없는 번호로 부른다 | POST /api/v1/admin/trends/links/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-269 | MTI-FN-489 | 2026-11-11 |
| 667 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 어드민 키로 부른다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-270 | MTI-FN-490 | 2026-11-11 |
| 668 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 토큰 없이 부른다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-270 | MTI-FN-491 | 2026-11-11 |
| 669 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-270 | MTI-FN-491 | 2026-11-11 |
| 670 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 없는 번호로 부른다 | POST /api/v1/admin/trends/statuses/{id}/approve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-270 | MTI-FN-491 | 2026-11-11 |
| 671 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 어드민 키로 부른다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-271 | MTI-FN-492 | 2026-11-11 |
| 672 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 토큰 없이 부른다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-271 | MTI-FN-493 | 2026-11-11 |
| 673 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-271 | MTI-FN-493 | 2026-11-11 |
| 674 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 없는 번호로 부른다 | POST /api/v1/admin/trends/statuses/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-271 | MTI-FN-493 | 2026-11-11 |
| 675 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-272 |  | 2026-11-11 |
| 676 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 토큰 없이 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-272 | MTI-FN-495 | 2026-11-11 |
| 677 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-272 | MTI-FN-495 | 2026-11-11 |
| 678 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 없는 번호로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/approve 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-272 | MTI-FN-495 | 2026-11-11 |
| 679 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 어드민 키로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-273 |  | 2026-11-11 |
| 680 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 토큰 없이 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-273 | MTI-FN-497 | 2026-11-11 |
| 681 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-273 | MTI-FN-497 | 2026-11-11 |
| 682 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 없는 번호로 부른다 | POST /api/v1/admin/trends/links/publishers/{id}/reject 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-273 | MTI-FN-497 | 2026-11-11 |
| 683 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/measures 를 어드민 키로 부른다 | POST /api/v1/admin/measures 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-274 · API POST /api/v1/admin/measures 200 | MTI-FN-498 | 2026-11-11 |
| 684 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/measures 를 토큰 없이 부른다 | POST /api/v1/admin/measures 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-274 · API POST /api/v1/admin/measures 401 | MTI-FN-499 | 2026-11-11 |
| 685 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/measures 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/measures 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-274 · API POST /api/v1/admin/measures 403 | MTI-FN-499 | 2026-11-11 |
| 686 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/dimensions 를 어드민 키로 부른다 | POST /api/v1/admin/dimensions 를 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-275 · API POST /api/v1/admin/dimensions 200 | MTI-FN-500 | 2026-11-11 |
| 687 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/dimensions 를 토큰 없이 부른다 | POST /api/v1/admin/dimensions 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-275 · API POST /api/v1/admin/dimensions 401 | MTI-FN-501 | 2026-11-11 |
| 688 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/dimensions 를 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/dimensions 를 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-275 · API POST /api/v1/admin/dimensions 403 | MTI-FN-501 | 2026-11-11 |
| 689 | 정상 | 어드민 키가 있다 | POST /api/v1/admin/retention 을 어드민 키로 부른다 | POST /api/v1/admin/retention 을 어드민 키로 부르면 응답 코드가 200 이다 | MTI-REQ-276 · API POST /api/v1/admin/retention 200 | MTI-FN-502 | 2026-11-11 |
| 690 | 예외 | 요청에 토큰이 없다 | POST /api/v1/admin/retention 을 토큰 없이 부른다 | POST /api/v1/admin/retention 을 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-276 · API POST /api/v1/admin/retention 401 | MTI-FN-503 | 2026-11-11 |
| 691 | 예외 | 일반 회원 토큰이 있다 | POST /api/v1/admin/retention 을 관리 범위가 없는 일반 회원 토큰으로 부른다 | POST /api/v1/admin/retention 을 일반 회원 토큰으로 부른 응답 코드가 403 이다 | MTI-REQ-276 · API POST /api/v1/admin/retention 403 | MTI-FN-503 | 2026-11-11 |
| 692 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1_alpha/async_refreshes/{id} 를 일반 회원 토큰으로 부른다 | GET /api/v1_alpha/async_refreshes/{id} 를 일반 회원 토큰으로 부르면 응답 코드가 200 이다 | MTI-REQ-277 · API GET /api/v1_alpha/async_refreshes/{id} 200 | 제거함(MTI-FN-504) | 2026-11-11 |
| 693 | 예외 | 요청에 토큰이 없다 | GET /api/v1_alpha/async_refreshes/{id} 를 토큰 없이 부른다 | GET /api/v1_alpha/async_refreshes/{id} 를 토큰 없이 부르면 응답 코드가 401 이다 | MTI-REQ-277 · API GET /api/v1_alpha/async_refreshes/{id} 401 | MTI-FN-505 | 2026-11-11 |
| 694 | 예외 | 일반 회원 토큰이 있다 | GET /api/v1_alpha/async_refreshes/{id} 를 없는 번호로 부른다 | GET /api/v1_alpha/async_refreshes/{id} 를 없는 번호로 부른 응답 코드가 404 다 | MTI-REQ-277 · API GET /api/v1_alpha/async_refreshes/{id} 404 | MTI-FN-505 | 2026-11-11 |
| 695 | 정상 | 토큰이 없다 | GET /.well-known/oauth-authorization-server 를 부른다 | GET /.well-known/oauth-authorization-server 를 부르면 Cache-Control 에 max-age=900 이 있다 | MTI-REQ-278 | MTI-FN-506 | 2026-11-11 |
| 696 | 정상 | 토큰이 없다 | scopes 를 빼고 POST /api/v1/apps 로 앱을 등록한다 | scopes 를 빼고 앱을 등록하면 응답의 scopes 가 read 하나다 | MTI-REQ-279 | MTI-FN-507 | 2026-11-11 |
| 697 | 정상 | 일반 회원 토큰이 있다 | Authorization: Bearer 머리에 일반 회원 토큰을 넣어 GET /api/v1/accounts/verify_credentials 를 부른다 | Authorization: Bearer 머리에 일반 회원 토큰을 넣어 부르면 응답의 username 이 qa_user1 이다 | MTI-REQ-282 | MTI-FN-508 | 2026-11-11 |
| 698 | 예외 | 시험 앱이 있다 | grant_type=password 로 POST /oauth/token 을 부른다 | grant_type=password 로 토큰을 청하면 access_token 을 받지 못한다 | MTI-REQ-283 | MTI-FN-509 | 2026-11-11 |
| 699 | 예외 | 시험 앱이 있다 | code_challenge_method=plain 으로 GET /oauth/authorize 를 연다 | code_challenge_method=plain 으로 인가 화면을 열면 응답 코드가 400 이다 | MTI-REQ-284 · API GET /oauth/authorize 400 | MTI-FN-510 | 2026-11-11 |
| 700 | 정상 | 시험 앱이 있다 | client_credentials 로 POST /oauth/token 을 부른다 | client_credentials 로 토큰을 받으면 응답에 expires_in 이 없다 | MTI-REQ-285 | MTI-FN-511 | 2026-11-11 |
| 701 | 정상 | 시험 앱이 있다 | 같은 앱 · 같은 범위로 client_credentials 토큰을 두 번 받는다 | 같은 앱 · 같은 범위로 토큰을 두 번 받으면 두 access_token 이 같다 | MTI-REQ-286 | MTI-FN-512 | 2026-11-11 |
| 702 | 예외 | read 로 등록한 시험 앱이 있다 | read 로 등록한 앱으로 write 범위 토큰을 청한다 | 등록하지 않은 write 범위 토큰을 청하면 응답 코드가 400 이다 | MTI-REQ-287 · API POST /oauth/token 400 | MTI-FN-513 | 2026-11-11 |
| 703 | 예외 | read 로 등록한 시험 앱이 있다 | read 로 등록한 앱으로 write 범위 토큰을 청한다 | 오류가 invalid_scope 다 | MTI-REQ-287 | MTI-FN-513 | 2026-11-11 |
| 704 | 예외 | 시험 앱이 있다 | 틀린 client_secret 으로 POST /oauth/token 을 부른다 | 틀린 client_secret 으로 토큰을 청하면 응답 코드가 401 이다 | MTI-REQ-288 · API POST /oauth/token 401 | MTI-FN-514 | 2026-11-11 |
| 705 | 예외 | 시험 앱이 있다 | 틀린 client_secret 으로 POST /oauth/token 을 부른다 | 오류가 invalid_client 다 | MTI-REQ-288 | MTI-FN-514 | 2026-11-11 |
| 706 | 예외 | 시험 앱이 있다 | 틀린 code 로 grant_type=authorization_code 토큰을 청한다 | 틀린 code 로 토큰을 청하면 응답 코드가 400 이다 | MTI-REQ-289 | MTI-FN-515 | 2026-11-11 |
| 707 | 예외 | 시험 앱이 있다 | 틀린 code 로 grant_type=authorization_code 토큰을 청한다 | 오류가 invalid_grant 다 | MTI-REQ-289 | MTI-FN-515 | 2026-11-11 |
| 708 | 예외 | 토큰이 없다 | redirect_uris 를 비워 POST /api/v1/apps 를 부른다 | redirect_uris 를 비워 앱을 등록하면 서버 오류(5xx) 없이 응답한다 | MTI-REQ-291 | MTI-FN-516 | 2026-11-11 |
| 709 | 정상 | 토큰이 없다 | GET /.well-known/oauth-authorization-server 로 범위 목록을 읽는다 | OAuth 서버 메타데이터를 부르면 scopes_supported 에 read · write · follow · profile · push · admin:read · admin:write 가 모두 있다 | MTI-REQ-293 | MTI-FN-517 | 2026-11-11 |
| 710 | 정상 | read 범위만 가진 시험 앱 토큰이 있다 | read 범위 앱 토큰으로 GET /api/v1/accounts/{id} 를 부른다 | read 범위 앱 토큰으로 GET /api/v1/accounts/{id} 를 부르면 응답 코드가 200 이다 | MTI-REQ-294 | MTI-FN-518 | 2026-11-11 |
| 711 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/statuses/{id} 를 토큰 없이 부르고 일반 회원 토큰으로 다시 부른다 | 같은 글을 토큰 없이 · 일반 회원 토큰으로 부르면 일반 회원 토큰으로 받은 글에만 favourited 가 있다 | MTI-REQ-295 | MTI-FN-519 | 2026-11-11 |
| 712 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public?local=true 를 토큰 없이 부른다 | GET /api/v1/timelines/public?local=true 를 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-296 | MTI-FN-520 | 2026-11-11 |
| 713 | 예외 | 토큰이 없다 | GET /api/v1/timelines/home 을 토큰 없이 부른다 | GET /api/v1/timelines/home 을 토큰 없이 부르면 오류 문구가 「액세스 토큰이 잘못되었습니다.」 다 | MTI-REQ-297 | MTI-FN-521 | 2026-11-11 |
| 714 | 예외 | 잘못된 토큰이 있다 | GET /api/v1/timelines/home 을 잘못된 토큰으로 부른다 | GET /api/v1/timelines/home 을 잘못된 토큰으로 부르면 응답 코드가 401 이다 | MTI-REQ-298 | MTI-FN-522 | 2026-11-11 |
| 715 | 예외 | 잘못된 토큰이 있다 | GET /api/v1/timelines/home 을 잘못된 토큰으로 부른다 | 오류 문구가 「액세스 토큰이 잘못되었습니다.」 다 | MTI-REQ-298 | MTI-FN-522 | 2026-11-11 |
| 716 | 예외 | 시험 앱 토큰을 폐기해 두었다 | 폐기한 토큰으로 GET /api/v1/apps/verify_credentials 를 부른다 | 폐기한 토큰으로 부르면 응답 코드가 401 이다 | MTI-REQ-299 | MTI-FN-523 | 2026-11-11 |
| 717 | 예외 | 시험 앱 토큰을 폐기해 두었다 | 폐기한 토큰으로 GET /api/v1/apps/verify_credentials 를 부른다 | 오류 문구가 「액세스 토큰이 삭제되었습니다.」 다 | MTI-REQ-299 | MTI-FN-523 | 2026-11-11 |
| 718 | 예외 | read 범위만 가진 시험 앱 토큰이 있다 | read 범위 앱 토큰으로 POST /api/v1/lists 를 부른다 | read 범위 앱 토큰으로 POST /api/v1/lists 를 부르면 응답 코드가 403 이다 | MTI-REQ-301 | MTI-FN-524 | 2026-11-11 |
| 719 | 예외 | read 범위만 가진 시험 앱 토큰이 있다 | read 범위 앱 토큰으로 POST /api/v1/lists 를 부른다 | 오류 문구가 「This action is outside the authorized scopes」 다 | MTI-REQ-301 | MTI-FN-524 | 2026-11-11 |
| 720 | 예외 | 토큰이 없다 | GET /api/v1/announcements 를 토큰 없이 부른다 | GET /api/v1/announcements 를 토큰 없이 부르면 오류 문구가 「This method requires an authenticated user」 다 | MTI-REQ-302 | MTI-FN-525 | 2026-11-11 |
| 721 | 예외 | 방금 가입해 이메일을 확인하지 않은 계정이 있다 | 이메일 미확인 계정 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다 | 이메일 미확인 계정 토큰으로 부르면 응답 코드가 403 이다 | MTI-REQ-303 · API GET /api/v1/accounts/verify_credentials 403 | MTI-FN-526 | 2026-11-11 |
| 722 | 예외 | 방금 가입해 이메일을 확인하지 않은 계정이 있다 | 이메일 미확인 계정 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다 | 오류 문구가 「Your login is missing a confirmed e-mail address」 다 | MTI-REQ-303 | MTI-FN-526 | 2026-11-11 |
| 723 | 예외 | 두 번째 사용자를 관리 API 로 비활성으로 바꿔 두었다 | 비활성인 두 번째 사용자 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다 | 비활성 계정 토큰으로 부르면 응답 코드가 403 이다 | MTI-REQ-305 | MTI-FN-527 | 2026-11-11 |
| 724 | 예외 | 두 번째 사용자를 관리 API 로 비활성으로 바꿔 두었다 | 비활성인 두 번째 사용자 토큰으로 GET /api/v1/accounts/verify_credentials 를 부른다 | 오류 문구가 「Your login is currently disabled」 다 | MTI-REQ-305 | MTI-FN-527 | 2026-11-11 |
| 725 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 POST /api/v1/accounts 를 부른다 | 일반 회원 토큰으로 가입을 부르면 응답 코드가 403 이다 | MTI-REQ-306 | MTI-FN-528 | 2026-11-11 |
| 726 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 POST /api/v1/accounts 를 부른다 | 오류 문구가 「This method requires an client credentials authentication」 다 | MTI-REQ-306 | MTI-FN-528 | 2026-11-11 |
| 727 | 정상 | 일반 회원 토큰이 있다 | 폼 본문으로 POST /api/v1/lists 를 보내 리스트를 만든다 | 폼 본문으로 리스트를 만들면 응답 코드가 200 이다 | MTI-REQ-307 | MTI-FN-529 | 2026-11-11 |
| 728 | 정상 | 일반 회원 토큰이 있다 | JSON 본문으로 POST /api/v1/lists 를 보내 리스트를 만든다 | JSON 본문으로 리스트를 만들면 응답 코드가 200 이다 | MTI-REQ-308 | MTI-FN-530 | 2026-11-11 |
| 729 | 정상 | 토큰이 없다 | GET /api/v1/accounts?id[]=…&id[]=… 로 시드 계정 둘을 부른다 | id[] 를 두 번 붙여 계정을 부르면 계정 2개가 온다 | MTI-REQ-309 | MTI-FN-531 | 2026-11-11 |
| 730 | 정상 | 토큰이 없다 | GET /api/v2/instance 를 부른다 | GET /api/v2/instance 를 부르면 Content-Type 이 application/json 이다 | MTI-REQ-310 | MTI-FN-532 | 2026-11-11 |
| 731 | 정상 | 일반 회원이 만든 리스트가 있다 | DELETE /api/v1/lists/{id} 로 만든 리스트를 지운다 | 만든 리스트를 지우면 본문 없는 성공으로 {} 가 온다 | MTI-REQ-311 | MTI-FN-533 | 2026-11-11 |
| 732 | 정상 | 토큰이 없다 | GET /api/v1/accounts/{id} 로 시드 계정을 부른다 | 계정을 부르면 id 가 숫자로만 된 문자열이다 | MTI-REQ-312 | MTI-FN-534 | 2026-11-11 |
| 733 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 글 둘을 차례로 쓴다 | 글 둘을 차례로 쓰면 나중 글의 id 가 더 크다 | MTI-REQ-313 | MTI-FN-535 | 2026-11-11 |
| 734 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public 의 응답 머리를 읽는다 | 공개 타임라인을 부르면 응답 머리의 Vary 에 Authorization 이 있다 | MTI-REQ-314 | MTI-FN-536 | 2026-11-11 |
| 735 | 예외 | 토큰이 없다 | GET /api/v1/instance.json 을 부른다 | GET /api/v1/instance.json 을 부르면 응답 코드가 200 이 아니다 | MTI-REQ-315 | MTI-FN-537 | 2026-11-11 |
| 736 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public?limit=1 을 부른다 | GET /api/v1/timelines/public?limit=1 을 부르면 Link 헤더에 rel="next" 가 있다 | MTI-REQ-316 | MTI-FN-538 | 2026-11-11 |
| 737 | 정상 | 토큰이 없다 | 공개 타임라인 첫 글 번호를 max_id 로 GET /api/v1/timelines/public 을 다시 부른다 | max_id 로 공개 타임라인을 부르면 모든 글 번호가 max_id 보다 작다 | MTI-REQ-317 | MTI-FN-539 | 2026-11-11 |
| 738 | 정상 | 토큰이 없다 | 공개 타임라인 셋째 글 번호를 since_id 로 GET /api/v1/timelines/public 을 다시 부른다 | since_id 로 공개 타임라인을 부르면 모든 글 번호가 since_id 보다 크다 | MTI-REQ-318 | MTI-FN-540 | 2026-11-11 |
| 739 | 정상 | 토큰이 없다 | 공개 타임라인 셋째 글 번호를 min_id 로 limit=1 로 다시 부른다 | min_id 로 limit=1 을 부르면 min_id 바로 다음 글이 온다 | MTI-REQ-319 | MTI-FN-541 | 2026-11-11 |
| 740 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public?limit=-2 를 부른다 | limit=-2 로 공개 타임라인을 부르면 글이 2개 온다 | MTI-REQ-320 | MTI-FN-542 | 2026-11-11 |
| 741 | 정상 | 토큰이 없다 | GET /api/v1/directory?limit=2 와 ?offset=1&limit=1 을 부른다 | offset=1 로 디렉터리를 부르면 첫 계정이 offset 없이 받은 둘째 계정과 같다 | MTI-REQ-321 | MTI-FN-543 | 2026-11-11 |
| 742 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=hana&offset=-1 을 부른다 | 검색에 음수 offset 을 보내면 응답 코드가 400 이다 | MTI-REQ-322 | MTI-FN-544 | 2026-11-11 |
| 743 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=hana&offset=-1 을 부른다 | 음수 offset 오류 문구가 「Pagination values for」 로 시작한다 | MTI-REQ-322 | MTI-FN-544 | 2026-11-11 |
| 744 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=hana&limit=-1 을 부른다 | 음수 limit 검색의 응답 코드가 400 이다 | MTI-REQ-322 | MTI-FN-544 | 2026-11-11 |
| 745 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/blocks?limit=80 을 부른다 | 차단 목록을 limit=80 으로 부르면 Link 헤더에 rel="next" 가 없다 | MTI-REQ-323 | MTI-FN-545 | 2026-11-11 |
| 746 | 경계 | 토큰이 없다 | GET /api/v1/timelines/public?limit=40 을 부른다 | 공개 타임라인을 limit=40 으로 부르면 글이 40개 이하로 온다 | MTI-REQ-324 | MTI-FN-546 | 2026-11-11 |
| 747 | 경계 | 토큰이 없다 | GET /api/v1/timelines/public?limit=41 을 부른다 | 공개 타임라인 limit=41 응답의 글이 40개 이하다 | MTI-REQ-324 | MTI-FN-546 | 2026-11-11 |
| 748 | 경계 | 토큰이 없다 | GET /api/v1/directory?limit=80 을 부른다 | 디렉터리를 limit=80 으로 부르면 계정이 80개 이하로 온다 | MTI-REQ-325 | MTI-FN-547 | 2026-11-11 |
| 749 | 경계 | 토큰이 없다 | GET /api/v1/directory?limit=81 을 부른다 | 디렉터리 limit=81 응답의 계정이 80개 이하다 | MTI-REQ-325 | MTI-FN-547 | 2026-11-11 |
| 750 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/notifications?limit=80 을 부른다 | 알림을 limit=80 으로 부르면 80개 이하로 온다 | MTI-REQ-326 | MTI-FN-548 | 2026-11-11 |
| 751 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/notifications?limit=81 을 부른다 | 알림 limit=81 응답의 알림이 80개 이하다 | MTI-REQ-326 | MTI-FN-548 | 2026-11-11 |
| 752 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/notifications/unread_count?limit=1000 을 부른다 | 안 읽은 알림 수를 limit=1000 으로 부르면 count 가 1,000 이하다 | MTI-REQ-327 | MTI-FN-549 | 2026-11-11 |
| 753 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/notifications/unread_count?limit=1001 을 부른다 | 안 읽은 알림 수 limit=1001 응답의 count 가 1,000 이하다 | MTI-REQ-327 | MTI-FN-549 | 2026-11-11 |
| 754 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=a&type=accounts&limit=40 을 부른다 | 계정 검색을 limit=40 으로 부르면 40개 이하로 온다 | MTI-REQ-328 | MTI-FN-550 | 2026-11-11 |
| 755 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=a&type=accounts&limit=41 을 부른다 | 계정 검색 limit=41 응답이 40개 이하다 | MTI-REQ-328 | MTI-FN-550 | 2026-11-11 |
| 756 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/conversations?limit=40 을 부른다 | 대화 목록을 limit=40 으로 부르면 40개 이하로 온다 | MTI-REQ-329 | MTI-FN-551 | 2026-11-11 |
| 757 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/conversations?limit=41 을 부른다 | 대화 목록 limit=41 응답이 40개 이하다 | MTI-REQ-329 | MTI-FN-551 | 2026-11-11 |
| 758 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/followed_tags?limit=200 을 부른다 | 팔로우한 태그를 limit=200 으로 부르면 200개 이하로 온다 | MTI-REQ-330 | MTI-FN-552 | 2026-11-11 |
| 759 | 경계 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/followed_tags?limit=201 을 부른다 | 팔로우한 태그 limit=201 응답의 태그가 200개 이하다 | MTI-REQ-330 | MTI-FN-552 | 2026-11-11 |
| 760 | 경계 | 토큰이 없다 | GET /api/v1/accounts/{qa_user1}/collections?limit=100 을 부른다 | 컬렉션 목록을 limit=100 으로 부르면 100개 이하로 온다 | MTI-REQ-331 | MTI-FN-553 | 2026-11-11 |
| 761 | 경계 | 토큰이 없다 | GET /api/v1/accounts/{qa_user1}/collections?limit=101 을 부른다 | 컬렉션 목록 limit=101 응답이 100개 이하다 | MTI-REQ-331 | MTI-FN-553 | 2026-11-11 |
| 762 | 경계 | 토큰이 없다 | GET /api/v1/trends/tags?limit=20 을 부른다 | 인기 태그를 limit=20 으로 부르면 20개 이하로 온다 | MTI-REQ-332 | MTI-FN-554 | 2026-11-11 |
| 763 | 경계 | 토큰이 없다 | GET /api/v1/trends/tags?limit=21 을 부른다 | 인기 태그 limit=21 응답의 태그가 20개 이하다 | MTI-REQ-332 | MTI-FN-554 | 2026-11-11 |
| 764 | 경계 | 어드민 키가 있다 | GET /api/v1/admin/accounts?limit=200 을 부른다 | 관리 계정 목록을 limit=200 으로 부르면 200개 이하로 온다 | MTI-REQ-333 | MTI-FN-555 | 2026-11-11 |
| 765 | 경계 | 어드민 키가 있다 | GET /api/v1/admin/accounts?limit=201 을 부른다 | 관리 계정 목록 limit=201 응답이 200개 이하다 | MTI-REQ-333 | MTI-FN-555 | 2026-11-11 |
| 766 | 경계 | 어드민 키가 있다 | GET /api/v1/admin/domain_blocks?limit=500 을 부른다 | 관리 도메인 차단 목록을 limit=500 으로 부르면 500개 이하로 온다 | MTI-REQ-334 | MTI-FN-556 | 2026-11-11 |
| 767 | 경계 | 어드민 키가 있다 | GET /api/v1/admin/domain_blocks?limit=501 을 부른다 | 관리 도메인 차단 목록 limit=501 응답이 500개 이하다 | MTI-REQ-334 | MTI-FN-556 | 2026-11-11 |
| 768 | 예외 | 토큰이 없다 | 글 번호 21개로 GET /api/v1/statuses?id[]= 를 부른다 | 글 번호 21개로 여러 글을 부르면 응답 코드가 422 다 | MTI-REQ-335 · API GET /api/v1/statuses 422 | MTI-FN-557 | 2026-11-11 |
| 769 | 예외 | 토큰이 없다 | 계정 번호 41개로 GET /api/v1/accounts?id[]= 를 부른다 | 계정 번호 41개로 여러 계정을 부르면 응답 코드가 422 다 | MTI-REQ-336 · API GET /api/v1/accounts 422 | MTI-FN-558 | 2026-11-11 |
| 770 | 예외 | 토큰이 없다 | GET /api/v1/statuses/999999999 를 부른다 | 없는 글을 부르면 본문의 error 가 문자열이다 | MTI-REQ-337 | MTI-FN-559 | 2026-11-11 |
| 771 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search 를 q 없이 부른다 | q 없이 검색하면 응답 코드가 400 이다 | MTI-REQ-338 | MTI-FN-560 | 2026-11-11 |
| 772 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search 를 q 없이 부른다 | 오류 문구가 「param is missing or the value is empty or invalid: q」 다 | MTI-REQ-338 | MTI-FN-560 | 2026-11-11 |
| 773 | 예외 | 토큰이 없다 | GET /api/v1/accounts/999999999 를 부른다 | 없는 계정을 부르면 오류 문구가 「Record not found」 다 | MTI-REQ-339 | MTI-FN-561 | 2026-11-11 |
| 774 | 예외 | 두 번째 사용자만 볼 수 있는 yuna_locked 의 팔로워 공개 글이 있다 | 일반 회원 토큰으로 그 글을 GET /api/v1/statuses/{id} 로 부른다 | 볼 수 없는 글을 일반 회원 토큰으로 부르면 응답 코드가 404 다 | MTI-REQ-340 · API GET /api/v1/statuses/{id} 404 | MTI-FN-562 | 2026-11-11 |
| 775 | 예외 | 일반 회원 토큰이 있다 | title 을 비워 POST /api/v1/lists 를 부른다 | 제목 없이 리스트를 만들면 응답 코드가 422 다 | MTI-REQ-341 · API POST /api/v1/lists 422 | MTI-FN-563 | 2026-11-11 |
| 776 | 예외 | 어드민 키가 있다 | POST /api/v1/admin/domain_blocks 로 같은 도메인을 두 번 더한다 | 같은 도메인 차단을 두 번 더하면 두 번째 응답 코드가 422 다 | MTI-REQ-342 · API POST /api/v1/admin/domain_blocks 422 | MTI-FN-564 | 2026-11-11 |
| 777 | 예외 | 두 번째 사용자 토큰이 있다 | display_name 을 41자로 PATCH /api/v1/accounts/update_credentials 를 부른다 | 표시 이름 41자로 프로필을 고치면 details.display_name 첫 오류가 ERR_TOO_LONG 이다 | MTI-REQ-344 · API PATCH /api/v1/accounts/update_credentials 422 | MTI-FN-565 | 2026-11-11 |
| 778 | 예외 | 토큰이 없다 | Accept-Language: ko 머리로 GET /api/v1/statuses/999999999 를 부른다 | Accept-Language: ko 로 없는 글을 부르면 오류 문구가 「Record not found」 다 | MTI-REQ-345 | MTI-FN-566 | 2026-11-11 |
| 779 | 예외 | 일반 회원 토큰이 있다 | ?lang=ko 로 501자 글을 POST /api/v1/statuses 로 쓴다 | 한국어로 501자 글을 쓰면 오류 문구에 「최대 500자」 가 있다 | MTI-REQ-346 | MTI-FN-567 | 2026-11-11 |
| 780 | 예외 | 일반 회원 토큰이 있다 | Accept-Language 없이 501자 글을 쓴다 | 요청 언어 없이 501자 글을 쓰면 오류 문구에 한글이 있다 | MTI-REQ-347 | MTI-FN-568 | 2026-11-11 |
| 781 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/timelines/home 을 부른다 | 한도 안에서 홈 타임라인을 부르면 X-RateLimit-Limit 헤더가 있다 | MTI-REQ-348 | MTI-FN-569 | 2026-11-11 |
| 782 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/timelines/home 을 부른다 | X-RateLimit-Remaining 헤더가 있다 | MTI-REQ-348 | MTI-FN-569 | 2026-11-11 |
| 783 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/timelines/home 을 부른다 | X-RateLimit-Reset 헤더가 있다 | MTI-REQ-348 | MTI-FN-569 | 2026-11-11 |
| 784 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 POST /api/v1/statuses 로 글을 쓴다 | 글을 쓰면 응답에 X-RateLimit-Limit 헤더가 있다 | MTI-REQ-361 | MTI-FN-570 | 2026-11-11 |
| 785 | 예외 | 일반 회원 토큰이 있다 | 가입한 앱이 아닌 일반 회원 토큰으로 POST /api/v1/emails/confirmations 를 부른다 | 가입한 앱이 아닌 토큰으로 확인 메일을 다시 보내면 응답 코드가 403 이다 | MTI-REQ-363 · API POST /api/v1/emails/confirmations 403 | MTI-FN-571 | 2026-11-11 |
| 786 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 표시 이름을 40자로 PATCH /api/v1/accounts/update_credentials 한다 | 표시 이름을 40자로 고치면 응답 코드가 200 이다 | MTI-REQ-364 | MTI-FN-572 | 2026-11-11 |
| 787 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 표시 이름을 41자로 PATCH /api/v1/accounts/update_credentials 한다 | 표시 이름 41자 수정의 응답 코드가 422 다 | MTI-REQ-364 | MTI-FN-572 | 2026-11-11 |
| 788 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 자기소개를 500자로 고친다 | 자기소개를 500자로 고치면 응답 코드가 200 이다 | MTI-REQ-365 | MTI-FN-573 | 2026-11-11 |
| 789 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 자기소개를 501자로 고친다 | 자기소개 501자 수정의 응답 코드가 422 다 | MTI-REQ-365 | MTI-FN-573 | 2026-11-11 |
| 790 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 추가 정보를 4개로 고친다 | 프로필 추가 정보를 4개로 고치면 응답 코드가 200 이다 | MTI-REQ-366 | MTI-FN-574 | 2026-11-11 |
| 791 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 추가 정보를 5개로 고친다 | 추가 정보 5개 수정 뒤 추가 정보가 4개 이하다 | MTI-REQ-366 | MTI-FN-574 | 2026-11-11 |
| 792 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 추가 정보 이름을 255자로 고친다 | 추가 정보 이름을 255자로 고치면 응답 코드가 200 이다 | MTI-REQ-367 | MTI-FN-575 | 2026-11-11 |
| 793 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 추가 정보 이름을 256자로 고친다 | 추가 정보 이름 256자 수정의 응답 코드가 422 다 | MTI-REQ-367 | MTI-FN-575 | 2026-11-11 |
| 794 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 사진 설명을 150자로 고친다 | 프로필 사진 설명을 150자로 고치면 응답 코드가 200 이다 | MTI-REQ-368 | MTI-FN-576 | 2026-11-11 |
| 795 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자 프로필 사진 설명을 151자로 고친다 | 프로필 사진 설명 151자 수정의 응답 코드가 422 다 | MTI-REQ-368 | MTI-FN-576 | 2026-11-11 |
| 796 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 사용자명 30자로 POST /api/v1/accounts 를 부른다 | 사용자명 30자로 가입하면 응답 코드가 200 이다 | MTI-REQ-369 | MTI-FN-577 | 2026-11-11 |
| 797 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 사용자명 31자로 POST /api/v1/accounts 를 부른다 | 사용자명 31자 가입의 응답 코드가 422 다 | MTI-REQ-369 | MTI-FN-577 | 2026-11-11 |
| 798 | 예외 | 쓰기 범위 시험 앱 토큰이 있다 | 사용자명에 「-」를 넣어 POST /api/v1/accounts 를 부른다 | 사용자명에 「-」를 넣어 가입하면 details.username 첫 오류가 ERR_INVALID 다 | MTI-REQ-370 | MTI-FN-578 | 2026-11-11 |
| 799 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 비밀번호 7자로 가입한다 | 비밀번호 7자로 가입하면 응답 코드가 422 다 | MTI-REQ-371 | MTI-FN-579 | 2026-11-11 |
| 800 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 비밀번호 8자로 가입한다 | 비밀번호 8자 가입의 응답 코드가 200 이다 | MTI-REQ-371 | MTI-FN-579 | 2026-11-11 |
| 801 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 비밀번호 72자로 가입한다 | 비밀번호 72자 가입의 응답 코드가 200 이다 | MTI-REQ-371 | MTI-FN-579 | 2026-11-11 |
| 802 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 비밀번호 73자로 가입한다 | 비밀번호 73자 가입의 응답 코드가 422 다 | MTI-REQ-371 | MTI-FN-579 | 2026-11-11 |
| 803 | 예외 | 쓰기 범위 시험 앱 토큰이 있다 | 비밀번호 7자로 POST /api/v1/accounts 를 부른다 | 비밀번호 7자로 가입하면 details.password 첫 오류가 ERR_TOO_SHORT 다 | MTI-REQ-371 | MTI-FN-580 | 2026-11-11 |
| 804 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 이메일 320자로 가입한다 | 이메일 320자로 가입하면 응답 코드가 200 이다 | MTI-REQ-372 | MTI-FN-581 | 2026-11-11 |
| 805 | 경계 | 쓰기 범위 시험 앱 토큰이 있다 | 이메일 321자로 가입한다 | 이메일 321자 가입의 응답 코드가 422 다 | MTI-REQ-372 | MTI-FN-581 | 2026-11-11 |
| 806 | 예외 | 가입이 닫힌 서버다 | 가입이 닫힌 서버에 POST /api/v1/accounts 를 부른다 | 가입이 닫힌 서버에 가입하면 응답 코드가 403 이다 | MTI-REQ-373 · 보류 — 가입 닫기 설정 | 제거함(MTI-FN-582) | 2026-11-11 |
| 807 | 예외 | 쓰기 범위 시험 앱 토큰이 있다 | 이미 있는 사용자명 qa_user1 로 가입한다 | 이미 있는 사용자명으로 가입하면 details.username 첫 오류가 ERR_TAKEN 이다 | MTI-REQ-374 · API POST /api/v1/accounts 422 | MTI-FN-583 | 2026-11-11 |
| 808 | 예외 | 쓰기 범위 시험 앱 토큰이 있다 | 예약어 사용자명 admin 으로 가입한다 | 예약어 사용자명으로 가입하면 details.username 첫 오류가 ERR_RESERVED 다 | MTI-REQ-375 | MTI-FN-584 | 2026-11-11 |
| 809 | 예외 | 쓰기 범위 시험 앱 토큰이 있다 | agreement 를 false 로 가입한다 | agreement 를 false 로 가입하면 details.agreement 첫 오류가 ERR_ACCEPTED 다 | MTI-REQ-376 | MTI-FN-585 | 2026-11-11 |
| 810 | 정상 | 쓰기 범위 시험 앱 토큰이 있다 | reason 없이 POST /api/v1/accounts 로 가입한다 | reason 없이 가입하면 응답에 access_token 이 있다 | MTI-REQ-377 | MTI-FN-586 | 2026-11-11 |
| 811 | 정상 | 방금 가입한 계정이 있다 | 방금 가입한 계정 토큰으로 GET /api/v1/timelines/home 을 부른다 | 방금 가입한 계정 토큰으로 홈 타임라인을 부르면 서버 오류(5xx) 없이 응답한다 | MTI-REQ-378 | MTI-FN-587 | 2026-11-11 |
| 812 | 정상 | 두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다 | 두 번째 사용자 토큰으로 GET /api/v1/accounts/{yuna_locked}/statuses 를 부른다 | 팔로워 토큰으로 yuna_locked 글 목록을 부르면 private 글이 1개 이상 있다 | MTI-REQ-379 | MTI-FN-588 | 2026-11-11 |
| 813 | 정상 | 두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다 | 토큰 없이 GET /api/v1/accounts/{yuna_locked}/statuses 를 부른다 | 토큰 없이 받은 yuna_locked 글 목록에는 private 글이 없다 | MTI-REQ-379 | MTI-FN-588 | 2026-11-11 |
| 814 | 정상 | 두 번째 사용자 토큰이 있다 | duration=0 으로 두 번째 사용자가 noisy_cho 를 뮤트한다 | duration=0 으로 뮤트하면 뮤트 목록의 mute_expires_at 이 null 이다 | MTI-REQ-380 | MTI-FN-589 | 2026-11-11 |
| 815 | 예외 | 토큰이 없다 | GET /api/v1/accounts/999999999 로 없는 계정을 부른다 | 없는 계정을 조회하면 응답 코드가 404 다 | MTI-REQ-381 · API GET /api/v1/accounts/{id} 404 | MTI-FN-590 | 2026-11-11 |
| 816 | 예외 | 어드민 키가 있다 | 승인 대기 계정 newbie_wait 를 GET /api/v1/accounts/{id} 로 부른다 | 승인 대기 계정 조회의 응답 코드가 404 다 | MTI-REQ-381 | MTI-FN-590 | 2026-11-11 |
| 817 | 예외 | 일반 회원 토큰이 있다 | 일반 회원이 자기 계정을 POST /api/v1/accounts/{id}/follow 로 팔로우한다 | 나 자신을 팔로우하면 응답 코드가 403 이다 | MTI-REQ-382 · API POST /api/v1/accounts/{id}/follow 403 | MTI-FN-591 | 2026-11-11 |
| 818 | 예외 | 일반 회원 토큰이 있다 | 일반 회원이 자기 계정을 POST /api/v1/accounts/{id}/follow 로 팔로우한다 | 오류 문구가 「본인의 계정을 팔로우할 수는 없습니다」 다 | MTI-REQ-382 | MTI-FN-591 | 2026-11-11 |
| 819 | 예외 | 팔로잉이 7,500명인 계정이 있다 | 팔로잉 7,500명인 계정으로 POST /api/v1/accounts/{id}/follow 를 부른다 | 팔로잉 7,500명에서 팔로우하면 응답 코드가 422 다 | MTI-REQ-383 · API POST /api/v1/accounts/{id}/follow 422 · 보류 — 팔로잉 7,500명 | 제거함(MTI-FN-592) | 2026-11-11 |
| 820 | 예외 | 일반 회원이 troll_kim 을 차단해 두었다 | 일반 회원 토큰으로 GET /api/v1/accounts/{troll_kim}/statuses 를 부른다 | 차단한 상대의 글 목록을 부르면 404 이거나 빈 목록이다 | MTI-REQ-384 | MTI-FN-593 | 2026-11-11 |
| 821 | 정상 | 두 번째 사용자가 잠긴 계정 yuna_locked 의 승인된 팔로워다 | 두 번째 사용자 토큰으로 yuna_locked 의 private 글을 GET /api/v1/statuses/{id} 로 부른다 | 팔로워 토큰으로 private 글을 부르면 응답 코드가 200 이다 | MTI-REQ-385 | MTI-FN-594 | 2026-11-11 |
| 822 | 정상 | 일반 회원이 쓴 글이 있다 | DELETE /api/v1/statuses/{id} 로 글을 지운다 | 글을 지우면 응답의 text 가 쓴 글과 같다 | MTI-REQ-386 | MTI-FN-595 | 2026-11-11 |
| 823 | 정상 | 일반 회원이 그림을 붙여 쓴 글이 있다 | delete_media=true 로 DELETE /api/v1/statuses/{id} 를 부른다 | delete_media=true 로 지우면 붙어 있던 미디어를 조회할 때 404 다 | MTI-REQ-387 | MTI-FN-596 | 2026-11-11 |
| 824 | 경계 | 일반 회원 토큰이 있다 | 500자 글을 POST /api/v1/statuses 로 쓴다 | 500자 글을 쓰면 응답 코드가 200 이다 | MTI-REQ-390 | MTI-FN-597 | 2026-11-11 |
| 825 | 경계 | 일반 회원 토큰이 있다 | 501자 글을 POST /api/v1/statuses 로 쓴다 | 501자 글의 응답 코드가 422 다 | MTI-REQ-390 · API POST /api/v1/statuses 422 | MTI-FN-597 | 2026-11-11 |
| 826 | 예외 | 일반 회원 토큰이 있다 | spoiler_text 와 합쳐 501자가 되게 글을 쓴다 | 공개 경고문과 합쳐 500자를 넘는 글을 쓰면 응답 코드가 422 다 | MTI-REQ-390 | MTI-FN-598 | 2026-11-11 |
| 827 | 정상 | 일반 회원 토큰이 있다 | 476자 본문 뒤에 공백과 긴 URL 하나를 붙여 쓴다 | 476자 본문에 긴 URL 을 붙여 쓰면 URL 을 23자로 세어 응답 코드가 200 이다 | MTI-REQ-391 | MTI-FN-599 | 2026-11-11 |
| 828 | 정상 | 일반 회원 토큰이 있다 | status 를 비우고 설문만 붙여 글을 쓴다 | status 없이 설문만 붙여 글을 쓰면 응답 코드가 200 이다 | MTI-REQ-392 | MTI-FN-600 | 2026-11-11 |
| 829 | 예외 | 일반 회원 토큰이 있다 | status 를 비우고 첨부 · 설문 · 인용 없이 글을 쓴다 | status 도 첨부 · 설문 · 인용도 없이 글을 쓰면 응답 코드가 422 다 | MTI-REQ-393 | MTI-FN-601 | 2026-11-11 |
| 830 | 정상 | 일반 회원 토큰이 있다 | visibility 없이 글을 쓴다 | visibility 없이 글을 쓰면 visibility 가 GET /api/v1/preferences 의 posting:default:visibility 와 같다 | MTI-REQ-394 | MTI-FN-602 | 2026-11-11 |
| 831 | 정상 | 두 번째 사용자를 관리 API 로 제한해 두었다 | 제한된 두 번째 사용자가 visibility=public 으로 글을 쓴다 | 제한된 계정이 public 글을 쓰면 visibility 가 unlisted 다 | MTI-REQ-395 | MTI-FN-603 | 2026-11-11 |
| 832 | 예외 | 일반 회원 토큰이 있다 | in_reply_to_id 를 없는 번호로 글을 쓴다 | 없는 글에 답장하면 응답 코드가 404 다 | MTI-REQ-396 · API POST /api/v1/statuses 404 | MTI-FN-604 | 2026-11-11 |
| 833 | 예외 | 일반 회원 토큰이 있다 | in_reply_to_id 를 없는 번호로 글을 쓴다 | 오류 문구가 「답장하려는 게시물이 존재하지 않습니다.」 다 | MTI-REQ-396 | MTI-FN-604 | 2026-11-11 |
| 834 | 예외 | 일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다 | in_reply_to_id 를 볼 수 없는 글로 글을 쓴다 | 볼 수 없는 글에 단 답장의 응답 코드가 404 다 | MTI-REQ-396 | MTI-FN-604 | 2026-11-11 |
| 835 | 정상 | 두 번째 사용자가 볼 수 있는 private 글이 있다 | 두 번째 사용자가 quoted_status_id 로 private 글을 인용해 public 글을 쓴다 | private 글을 인용해 public 글을 쓰면 visibility 가 private 이다 | MTI-REQ-397 | MTI-FN-605 | 2026-11-11 |
| 836 | 예외 | 일반 회원 토큰이 있다 | 멘션하지 않은 hana_photo 의 글을 visibility=direct 로 인용해 쓴다 | 멘션하지 않은 사용자의 글을 direct 로 인용하면 응답 코드가 200 이 아니다 | MTI-REQ-398 | MTI-FN-606 | 2026-11-11 |
| 837 | 정상 | 일반 회원 토큰이 있다 | spoiler_text 를 넣고 sensitive 없이 글을 쓴다 | 공개 경고문을 넣어 글을 쓰면 sensitive 가 true 다 | MTI-REQ-399 | MTI-FN-607 | 2026-11-11 |
| 838 | 정상 | 일반 회원 토큰이 있다 | language=en 으로 글을 쓴다 | language=en 으로 글을 쓰면 글의 language 가 en 이다 | MTI-REQ-400 | MTI-FN-608 | 2026-11-11 |
| 839 | 경계 | 일반 회원 토큰이 있다 | 미디어 4개를 붙여 글을 쓴다 | 미디어 4개를 붙여 글을 쓰면 응답 코드가 200 이다 | MTI-REQ-401 | MTI-FN-609 | 2026-11-11 |
| 840 | 경계 | 일반 회원 토큰이 있다 | 미디어 5개를 붙여 글을 쓴다 | 미디어 5개 글의 응답 코드가 422 다 | MTI-REQ-401 | MTI-FN-609 | 2026-11-11 |
| 841 | 예외 | 일반 회원 토큰이 있다 | 미디어 5개를 붙여 POST /api/v1/statuses 를 부른다 | 미디어 5개를 붙여 쓰면 오류 문구가 「최대 4개까지 첨부할 수 있습니다」 다 | MTI-REQ-401 | MTI-FN-610 | 2026-11-11 |
| 842 | 예외 | 일반 회원 토큰이 있다 | 사진과 동영상을 함께 붙여 글을 쓴다 | 사진과 동영상을 섞어 붙이면 응답 코드가 422 다 | MTI-REQ-402 · 보류 — 시험 동영상 파일 |  | 2026-11-11 |
| 843 | 예외 | 일반 회원 토큰이 있다 | 처리가 끝나지 않은 미디어를 붙여 글을 쓴다 | 처리 중인 미디어를 붙이면 응답 코드가 422 다 | MTI-REQ-403 · 보류 — 처리 중 미디어 | 제거함(MTI-FN-612) | 2026-11-11 |
| 844 | 예외 | 일반 회원 토큰이 있다 | 미디어와 설문을 함께 붙여 글을 쓴다 | 미디어와 설문을 함께 붙이면 응답 코드가 200 이 아니다 | MTI-REQ-404 | MTI-FN-613 | 2026-11-11 |
| 845 | 예외 | 일반 회원 토큰이 있다 | 없는 media_ids 로 글을 쓴다 | 없는 미디어를 붙이면 응답 코드가 422 다 | MTI-REQ-405 | MTI-FN-614 | 2026-11-11 |
| 846 | 예외 | 두 번째 사용자가 올린 미디어가 있다 | 일반 회원이 남의 media_ids 로 글을 쓴다 | 남의 미디어를 붙인 글의 오류 문구에 「찾을 수 없거나 이미 다른 게시물에 첨부되었습니다」 가 있다 | MTI-REQ-405 | MTI-FN-614 | 2026-11-11 |
| 847 | 경계 | 일반 회원 토큰이 있다 | 항목 1개로 설문 글을 쓴다 | 설문 항목 1개로 글을 쓰면 응답 코드가 422 다 | MTI-REQ-406 | MTI-FN-615 | 2026-11-11 |
| 848 | 경계 | 일반 회원 토큰이 있다 | 항목 2개로 설문 글을 쓴다 | 설문 항목 2개 글의 응답 코드가 200 이다 | MTI-REQ-406 | MTI-FN-615 | 2026-11-11 |
| 849 | 경계 | 일반 회원 토큰이 있다 | 항목 4개로 설문 글을 쓴다 | 설문 항목 4개 글의 응답 코드가 200 이다 | MTI-REQ-406 | MTI-FN-615 | 2026-11-11 |
| 850 | 경계 | 일반 회원 토큰이 있다 | 항목 5개로 설문 글을 쓴다 | 설문 항목 5개 글의 응답 코드가 422 다 | MTI-REQ-406 | MTI-FN-615 | 2026-11-11 |
| 851 | 경계 | 일반 회원 토큰이 있다 | 50자 항목으로 설문 글을 쓴다 | 설문 항목 50자로 글을 쓰면 응답 코드가 200 이다 | MTI-REQ-407 | MTI-FN-616 | 2026-11-11 |
| 852 | 경계 | 일반 회원 토큰이 있다 | 51자 항목으로 설문 글을 쓴다 | 설문 항목 51자 글의 응답 코드가 422 다 | MTI-REQ-407 | MTI-FN-616 | 2026-11-11 |
| 853 | 예외 | 일반 회원 토큰이 있다 | 같은 항목 둘로 설문 글을 쓴다 | 같은 설문 항목 둘로 글을 쓰면 응답 코드가 422 다 | MTI-REQ-408 | MTI-FN-617 | 2026-11-11 |
| 854 | 경계 | 일반 회원 토큰이 있다 | poll[expires_in]=299 로 설문 글을 쓴다 | 설문 마감 299초로 글을 쓰면 응답 코드가 422 다 | MTI-REQ-409 | MTI-FN-618 | 2026-11-11 |
| 855 | 경계 | 일반 회원 토큰이 있다 | poll[expires_in]=300 으로 설문 글을 쓴다 | 설문 마감 300초 글의 응답 코드가 200 이다 | MTI-REQ-409 | MTI-FN-618 | 2026-11-11 |
| 856 | 경계 | 일반 회원 토큰이 있다 | poll[expires_in]=2629746 으로 설문 글을 쓴다 | 설문 마감 2,629,746초 글의 응답 코드가 200 이다 | MTI-REQ-409 | MTI-FN-618 | 2026-11-11 |
| 857 | 경계 | 일반 회원 토큰이 있다 | poll[expires_in]=2629747 로 설문 글을 쓴다 | 설문 마감 2,629,747초 글의 응답 코드가 422 다 | MTI-REQ-409 | MTI-FN-618 | 2026-11-11 |
| 858 | 정상 | 일반 회원 토큰이 있다 | multiple · hide_totals 없이 설문 글을 쓴다 | multiple 없이 설문 글을 쓰면 poll.multiple 이 false 다 | MTI-REQ-410 | MTI-FN-619 | 2026-11-11 |
| 859 | 경계 | 일반 회원 토큰이 있다 | scheduled_at 을 지금부터 5분 뒤로 글을 쓴다 | 예약 시각을 5분 뒤로 쓰면 응답 코드가 422 다 | MTI-REQ-411 | MTI-FN-620 | 2026-11-11 |
| 860 | 경계 | 일반 회원 토큰이 있다 | scheduled_at 을 지금부터 6분 뒤로 글을 쓴다 | 예약 시각 6분 뒤 글의 응답 코드가 200 이다 | MTI-REQ-411 | MTI-FN-620 | 2026-11-11 |
| 861 | 예외 | 일반 회원 토큰이 있다 | scheduled_at 을 지금부터 1분 뒤로 POST /api/v1/statuses 를 부른다 | 예약 시각이 5분 이내면 오류 문구에 「미래의 날짜여야 합니다」 가 있다 | MTI-REQ-411 | MTI-FN-621 | 2026-11-11 |
| 862 | 정상 | 일반 회원 토큰이 있다 | scheduled_at 을 40일 뒤로 글을 쓴다 | scheduled_at 을 주고 글을 쓰면 응답에 scheduled_at 과 params 가 있다 | MTI-REQ-412 | MTI-FN-622 | 2026-11-11 |
| 863 | 경계 | 일반 회원 토큰이 있다 | 같은 날 예약 글을 25개째 쓴다 | 같은 날 예약 글 25개째를 쓰면 응답 코드가 200 이다 | MTI-REQ-413 | MTI-FN-623 | 2026-11-11 |
| 864 | 경계 | 일반 회원 토큰이 있다 | 같은 날 예약 글을 26개째 쓴다 | 같은 날 예약 글 26개째의 응답 코드가 422 다 | MTI-REQ-413 | MTI-FN-623 | 2026-11-11 |
| 865 | 예외 | 일반 회원 토큰이 있다 | allowed_mentions[] 에 hana_photo 만 넣고 @qa_user2 를 멘션한 글을 쓴다 | 예상하지 않은 계정을 멘션하면 응답 코드가 422 다 | MTI-REQ-415 | MTI-FN-624 | 2026-11-11 |
| 866 | 예외 | 일반 회원 토큰이 있다 | allowed_mentions[] 에 hana_photo 만 넣고 @qa_user2 를 멘션한 글을 쓴다 | 오류 문구가 「Post would be sent to unexpected accounts」 다 | MTI-REQ-415 | MTI-FN-624 | 2026-11-11 |
| 867 | 정상 | 일반 회원 토큰이 있다 | 같은 Idempotency-Key 로 POST /api/v1/statuses 를 두 번 부른다 | 같은 Idempotency-Key 로 두 번 쓰면 두 응답의 id 가 같다 | MTI-REQ-416 | MTI-FN-625 | 2026-11-11 |
| 868 | 예외 | 일반 회원이 볼 수 없는 yuna_locked 의 팔로워 공개 글이 있다 | 일반 회원 토큰으로 그 글을 즐겨찾기한다 | 볼 수 없는 글을 즐겨찾기하면 응답 코드가 404 다 | MTI-REQ-417 · API POST /api/v1/statuses/{id}/favourite 404 | MTI-FN-626 | 2026-11-11 |
| 869 | 예외 | 일반 회원이 쓴 글이 있다 | 두 번째 사용자 토큰으로 일반 회원의 글을 PUT /api/v1/statuses/{id} 로 고친다 | 남의 글을 고치면 응답 코드가 404 다 | MTI-REQ-418 · API PUT /api/v1/statuses/{id} 404 | MTI-FN-627 | 2026-11-11 |
| 870 | 예외 | 일반 회원이 쓴 글이 있다 | 두 번째 사용자 토큰으로 일반 회원의 글을 DELETE /api/v1/statuses/{id} 로 지운다 | 남의 글 삭제의 응답 코드가 404 다 | MTI-REQ-418 · API DELETE /api/v1/statuses/{id} 404 | MTI-FN-627 | 2026-11-11 |
| 871 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 다섯째 글을 고정한다 | 고정 글 5개째를 고정하면 응답 코드가 200 이다 | MTI-REQ-419 | MTI-FN-628 | 2026-11-11 |
| 872 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 여섯째 글을 고정한다 | 고정 글 6개째 고정의 응답 코드가 422 다 | MTI-REQ-419 | MTI-FN-628 | 2026-11-11 |
| 873 | 예외 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 부스트한 글을 POST /api/v1/statuses/{id}/pin 으로 고정한다 | 부스트를 고정하면 응답 코드가 422 다 | MTI-REQ-420 · API POST /api/v1/statuses/{id}/pin 422 | MTI-FN-629 | 2026-11-11 |
| 874 | 예외 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 direct 글을 고정한다 | 직접 메시지를 고정하면 응답 코드가 422 다 | MTI-REQ-421 | MTI-FN-630 | 2026-11-11 |
| 875 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 공개 글을 POST /api/v1/statuses/{id}/translate 로 번역한다 | 번역이 꺼진 서버에서 글을 번역하면 응답 코드가 404 다 | MTI-REQ-422 | MTI-FN-631 | 2026-11-11 |
| 876 | 정상 | 일반 회원 토큰이 있다 | POST /api/v2/media 로 작은 그림을 올린다 | v2 로 그림을 올리면 응답 코드가 200 이나 202 다 | MTI-REQ-424 · API POST /api/v2/media 202 | MTI-FN-632 | 2026-11-11 |
| 877 | 정상 | 일반 회원 토큰이 있다 | focus=1.0,-1.0 으로 그림을 올린다 | 초점을 1.0,-1.0 으로 올리면 meta.focus 가 x 1 · y -1 이다 | MTI-REQ-425 | MTI-FN-633 | 2026-11-11 |
| 878 | 경계 | 일반 회원 토큰이 있다 | 설명 10,000자로 그림을 올린다 | 설명 10,000자로 그림을 올리면 응답 코드가 200 이다 | MTI-REQ-426 | MTI-FN-634 | 2026-11-11 |
| 879 | 경계 | 일반 회원 토큰이 있다 | 설명 10,001자로 그림을 올린다 | 설명 10,001자 그림 올리기의 응답 코드가 422 다 | MTI-REQ-426 | MTI-FN-634 | 2026-11-11 |
| 880 | 예외 | 일반 회원 토큰이 있다 | 16 MiB 를 넘는 그림 파일을 올린다 | 16 MiB 를 넘는 그림을 올리면 응답 코드가 200 이 아니다 | MTI-REQ-427 | MTI-FN-635 | 2026-11-11 |
| 881 | 예외 | 일반 회원 토큰이 있다 | 해상도 곱이 33,177,600 을 넘는 그림을 올린다 | 해상도 곱이 33,177,600 을 넘는 그림을 올리면 응답 코드가 200 이 아니다 | MTI-REQ-428 · 보류 — 큰 해상도 그림 |  | 2026-11-11 |
| 882 | 예외 | 일반 회원 토큰이 있다 | 99 MiB 를 넘는 동영상을 올린다 | 99 MiB 를 넘는 동영상을 올리면 응답 코드가 200 이 아니다 | MTI-REQ-429 · 보류 — 시험 동영상 파일 |  | 2026-11-11 |
| 883 | 예외 | 일반 회원 토큰이 있다 | 글자 파일을 POST /api/v1/media 로 올린다 | 지원하지 않는 형식을 올리면 응답 코드가 422 다 | MTI-REQ-430 · API POST /api/v1/media 422 | MTI-FN-638 | 2026-11-11 |
| 884 | 예외 | 일반 회원 토큰이 있다 | 글자 파일을 POST /api/v1/media 로 올린다 | 오류 문구가 「File type of uploaded media could not be verified」 다 | MTI-REQ-430 | MTI-FN-638 | 2026-11-11 |
| 885 | 예외 | 일반 회원 토큰이 있다 | 썸네일 처리에 실패하는 파일을 올린다 | 썸네일 처리가 실패하면 응답 코드가 500 이다 | MTI-REQ-431 · 보류 — 썸네일 실패 | 제거함(MTI-FN-639) | 2026-11-11 |
| 886 | 예외 | 일반 회원 토큰이 있다 | 글에 붙은 미디어를 DELETE /api/v1/media/{id} 로 지운다 | 글에 붙은 미디어를 지우면 응답 코드가 422 다 | MTI-REQ-432 · API DELETE /api/v1/media/{id} 422 | MTI-FN-640 | 2026-11-11 |
| 887 | 예외 | 일반 회원 토큰이 있다 | 글에 붙은 미디어를 DELETE /api/v1/media/{id} 로 지운다 | 오류 문구가 「Media attachment is currently used by a status」 다 | MTI-REQ-432 | MTI-FN-640 | 2026-11-11 |
| 888 | 예외 | 일반 회원 토큰이 있다 | 처리에 실패한 미디어를 조회한다 | 처리에 실패한 미디어를 조회하면 응답 코드가 422 다 | MTI-REQ-433 · 보류 — 처리 실패 미디어 | 제거함(MTI-FN-641) | 2026-11-11 |
| 889 | 예외 | 일반 회원이 올린 미디어가 있다 | 두 번째 사용자 토큰으로 남의 미디어를 GET /api/v1/media/{id} 로 부른다 | 남의 미디어를 조회하면 응답 코드가 404 다 | MTI-REQ-434 · API GET /api/v1/media/{id} 404 | MTI-FN-642 | 2026-11-11 |
| 890 | 예외 | 일반 회원이 글에 붙인 미디어가 있다 | 글에 붙은 미디어를 PUT /api/v1/media/{id} 로 고친다 | 글에 붙은 미디어 수정의 응답 코드가 404 다 | MTI-REQ-434 · API PUT /api/v1/media/{id} 404 | MTI-FN-642 | 2026-11-11 |
| 891 | 예외 | 일반 회원이 쓴 단일 선택 설문에 두 번째 사용자가 투표해 두었다 | 두 번째 사용자가 같은 설문에 다시 투표한다 | 단일 선택 설문에 다시 투표하면 응답 코드가 422 다 | MTI-REQ-435 · API POST /api/v1/polls/{id}/votes 422 | MTI-FN-643 | 2026-11-11 |
| 892 | 예외 | 일반 회원이 쓴 단일 선택 설문에 두 번째 사용자가 투표해 두었다 | 두 번째 사용자가 같은 설문에 다시 투표한다 | 오류 문구가 「이미 참여한 설문」 이다 | MTI-REQ-435 | MTI-FN-643 | 2026-11-11 |
| 893 | 예외 | 일반 회원이 쓴 항목 2개 설문이 있다 | 두 번째 사용자가 choices[]=5 로 투표한다 | 범위 밖 항목에 투표하면 응답 코드가 422 다 | MTI-REQ-437 | MTI-FN-644 | 2026-11-11 |
| 894 | 예외 | 일반 회원이 쓴 항목 2개 설문이 있다 | 두 번째 사용자가 choices[]=5 로 투표한다 | 오류 문구가 「선택한 투표 항목이 존재하지 않음」 이다 | MTI-REQ-437 | MTI-FN-644 | 2026-11-11 |
| 895 | 예외 | 일반 회원이 쓴 설문이 있다 | 일반 회원이 자기 설문에 투표한다 | 내 설문에 투표하면 응답 코드가 422 다 | MTI-REQ-438 | MTI-FN-645 | 2026-11-11 |
| 896 | 예외 | 일반 회원이 쓴 설문이 있다 | 일반 회원이 자기 설문에 투표한다 | 오류 문구가 「자신이 만든 설문에는 투표할 수 없음」 이다 | MTI-REQ-438 | MTI-FN-645 | 2026-11-11 |
| 897 | 예외 | 일반 회원이 쓴 설문이 있다 | 두 번째 사용자가 choices 없이 투표한다 | choices 없이 투표하면 응답 코드가 400 이다 | MTI-REQ-439 | MTI-FN-646 | 2026-11-11 |
| 898 | 예외 | 일반 회원이 direct 로 쓴 설문 글이 있다 | 두 번째 사용자가 볼 수 없는 그 설문에 투표한다 | 보이지 않는 글의 설문에 투표하면 응답 코드가 404 다 | MTI-REQ-440 · API POST /api/v1/polls/{id}/votes 404 | MTI-FN-647 | 2026-11-11 |
| 899 | 정상 | 토큰이 없다 | GET /api/v1/timelines/public?remote=true 를 토큰 없이 부른다 | 연합 타임라인을 토큰 없이 부르면 응답 코드가 200 이다 | MTI-REQ-441 | MTI-FN-648 | 2026-11-11 |
| 900 | 정상 | 토큰이 없다 | GET /api/v1/timelines/tag/오늘의사진?local=true 를 토큰 없이 부른다 | 토큰 없이 받은 로컬 해시태그 타임라인의 응답 코드가 200 이다 | MTI-REQ-441 | MTI-FN-648 | 2026-11-11 |
| 901 | 예외 | 일반 회원 토큰이 있다 | 같은 마커를 동시에 두 번 저장한다 | 마커 저장이 충돌하면 응답 코드가 409 다 | MTI-REQ-442 · 보류 — 마커 충돌 | 제거함(MTI-FN-649) | 2026-11-11 |
| 902 | 경계 | 홈 타임라인이 빈 계정 토큰이 있다 | 홈 타임라인이 빈 계정으로 GET /api/v1/timelines/home 을 부른다 | 홈 타임라인이 비어 있으면 200 과 빈 배열이 온다 | MTI-REQ-443 · 보류 — 홈이 빈 계정 |  | 2026-11-11 |
| 903 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/notifications?limit=80 을 부른다 | 알림 목록을 부르면 모든 알림의 type 이 정해진 종류 가운데 하나다 | MTI-REQ-444 | MTI-FN-651 | 2026-11-11 |
| 904 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 푸시 구독을 두 번 만든다 | 푸시 구독을 두 번 만들면 조회한 구독의 endpoint 가 두 번째 것이다 | MTI-REQ-445 | MTI-FN-652 | 2026-11-11 |
| 905 | 예외 | 두 번째 사용자 토큰이 있다 | 구독이 없는 두 번째 사용자 토큰으로 GET /api/v1/push/subscription 을 부른다 | 구독이 없는데 조회하면 응답 코드가 404 다 | MTI-REQ-446 · API GET /api/v1/push/subscription 404 | MTI-FN-653 | 2026-11-11 |
| 906 | 예외 | 두 번째 사용자 토큰이 있다 | 구독이 없는 두 번째 사용자 토큰으로 PUT /api/v1/push/subscription 을 부른다 | 구독이 없을 때 구독 수정의 응답 코드가 404 다 | MTI-REQ-446 · API PUT /api/v1/push/subscription 404 | MTI-FN-653 | 2026-11-11 |
| 907 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 푸시 구독을 만든다 | 푸시 구독을 만들면 server_key 가 인스턴스 정보의 configuration.vapid.public_key 와 같다 | MTI-REQ-447 | MTI-FN-654 | 2026-11-11 |
| 908 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=hana&offset=1 을 부른다 | 일반 회원 토큰으로 offset 을 쓴 검색을 부르면 응답 코드가 200 이다 | MTI-REQ-448 | MTI-FN-655 | 2026-11-11 |
| 909 | 예외 | 토큰이 없다 | GET /api/v2/search?q=hana&offset=1 을 토큰 없이 부른다 | 토큰 없이 offset 을 쓴 검색을 부르면 응답 코드가 401 이다 | MTI-REQ-449 · API GET /api/v2/search 401 | MTI-FN-656 | 2026-11-11 |
| 910 | 예외 | 토큰이 없다 | GET /api/v2/search?q=hana&offset=1 을 토큰 없이 부른다 | 오류 문구가 「Search queries pagination is not supported without authentication」 이다 | MTI-REQ-449 | MTI-FN-656 | 2026-11-11 |
| 911 | 예외 | 토큰이 없다 | GET /api/v2/search?q=hana&resolve=true 를 토큰 없이 부른다 | 토큰 없이 resolve=true 검색을 부르면 응답 코드가 401 이다 | MTI-REQ-450 | MTI-FN-657 | 2026-11-11 |
| 912 | 예외 | 토큰이 없다 | GET /api/v2/search?q=hana&resolve=true 를 토큰 없이 부른다 | 오류 문구가 「Search queries that resolve remote resources are not supported without authentication」 이다 | MTI-REQ-450 | MTI-FN-657 | 2026-11-11 |
| 913 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v2/search?q=from: 을 부른다 | 문법이 틀린 검색어로 검색하면 응답 코드가 422 다 | MTI-REQ-451 · API GET /api/v2/search 422 | MTI-FN-658 | 2026-11-11 |
| 914 | 예외 | 토큰이 없다 | GET /api/v1/tags/mti-bad-name 을 부른다 | 형식에 맞지 않는 해시태그 이름으로 부르면 응답 코드가 404 다 | MTI-REQ-452 · API GET /api/v1/tags/{name} 404 | MTI-FN-659 | 2026-11-11 |
| 915 | 정상 | 토큰이 없다 | 아직 없는 태그 이름으로 GET /api/v1/tags/{name} 을 부른다 | 존재하지 않는 태그 이름으로 부르면 응답 코드가 200 이다 | MTI-REQ-453 | MTI-FN-660 | 2026-11-11 |
| 916 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 추천 해시태그 10개째를 더한다 | 추천 해시태그 10개째를 더하면 응답 코드가 200 이다 | MTI-REQ-454 | MTI-FN-661 | 2026-11-11 |
| 917 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 추천 해시태그 11개째를 더한다 | 추천 해시태그 11개째 더하기의 응답 코드가 422 다 | MTI-REQ-454 · API POST /api/v1/featured_tags 422 | MTI-FN-661 | 2026-11-11 |
| 918 | 예외 | 두 번째 사용자 토큰이 있다 | 추천 해시태그가 10개일 때 POST /api/v1/featured_tags 를 부른다 | 추천 해시태그가 10개일 때 더하면 오류 문구가 「추천 해시태그 최대 개수를 초과합니다」 다 | MTI-REQ-454 | MTI-FN-662 | 2026-11-11 |
| 919 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 hana_photo 글의 낱말로 type=statuses 검색을 부른다 | 상호작용하지 않은 글의 낱말로 글을 검색하면 statuses 가 비어 있다 | MTI-REQ-455 | MTI-FN-663 | 2026-11-11 |
| 920 | 예외 | 일반 회원이 만든 리스트가 있다 | 팔로우하지 않는 spam_shop 을 리스트에 넣는다 | 팔로우하지 않는 계정을 리스트에 넣으면 응답 코드가 422 다 | MTI-REQ-456 · API POST /api/v1/lists/{id}/accounts 422 | MTI-FN-664 | 2026-11-11 |
| 921 | 경계 | 일반 회원 토큰이 있다 | 제목 256자로 리스트를 만든다 | 리스트 제목 256자로 만들면 응답 코드가 200 이다 | MTI-REQ-457 | MTI-FN-665 | 2026-11-11 |
| 922 | 경계 | 일반 회원 토큰이 있다 | 제목 257자로 리스트를 만든다 | 리스트 제목 257자 만들기의 응답 코드가 422 다 | MTI-REQ-457 | MTI-FN-665 | 2026-11-11 |
| 923 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 리스트 50개째를 만든다 | 리스트 50개째를 만들면 응답 코드가 200 이다 | MTI-REQ-458 | MTI-FN-666 | 2026-11-11 |
| 924 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 리스트 51개째를 만든다 | 리스트 51개째 만들기의 응답 코드가 422 다 | MTI-REQ-458 | MTI-FN-666 | 2026-11-11 |
| 925 | 예외 | 두 번째 사용자 토큰이 있다 | 리스트가 50개일 때 POST /api/v1/lists 를 부른다 | 리스트가 50개일 때 만들면 오류 문구가 「리스트 최대 개수를 초과합니다」 다 | MTI-REQ-458 | MTI-FN-667 | 2026-11-11 |
| 926 | 경계 | 일반 회원 토큰이 있다 | 제목 256자로 필터를 만든다 | 필터 제목 256자로 만들면 응답 코드가 200 이다 | MTI-REQ-459 | MTI-FN-668 | 2026-11-11 |
| 927 | 경계 | 일반 회원 토큰이 있다 | 제목 257자로 필터를 만든다 | 필터 제목 257자 만들기의 응답 코드가 422 다 | MTI-REQ-459 · API POST /api/v2/filters 422 | MTI-FN-668 | 2026-11-11 |
| 928 | 경계 | 일반 회원 토큰이 있다 | 키워드 512자로 필터 키워드를 더한다 | 필터 키워드 512자로 더하면 응답 코드가 200 이다 | MTI-REQ-460 | MTI-FN-669 | 2026-11-11 |
| 929 | 경계 | 일반 회원 토큰이 있다 | 키워드 513자로 필터 키워드를 더한다 | 필터 키워드 513자 더하기의 응답 코드가 422 다 | MTI-REQ-460 · API POST /api/v2/filters/{filter_id}/keywords 422 | MTI-FN-669 | 2026-11-11 |
| 930 | 예외 | 일반 회원 토큰이 있다 | context 를 비워 필터를 만든다 | context 없이 필터를 만들면 응답 코드가 422 다 | MTI-REQ-461 | MTI-FN-670 | 2026-11-11 |
| 931 | 예외 | 일반 회원 토큰이 있다 | context 에 mti 를 넣어 필터를 만든다 | 모르는 context 필터 만들기의 응답 코드가 422 다 | MTI-REQ-461 | MTI-FN-670 | 2026-11-11 |
| 932 | 정상 | 일반 회원 토큰이 있다 | expires_in=3600 으로 필터를 만든다 | expires_in=3600 으로 필터를 만들면 expires_at 이 지금부터 3,600초 뒤 1분 안쪽이다 | MTI-REQ-462 | MTI-FN-671 | 2026-11-11 |
| 933 | 경계 | 일반 회원 토큰이 있다 | comment 1,000자로 spam_shop 을 신고한다 | 신고 comment 1,000자로 신고하면 응답 코드가 200 이다 | MTI-REQ-463 | MTI-FN-672 | 2026-11-11 |
| 934 | 경계 | 일반 회원 토큰이 있다 | comment 1,001자로 spam_shop 을 신고한다 | 신고 comment 1,001자 신고의 응답 코드가 422 다 | MTI-REQ-463 · API POST /api/v1/reports 422 | MTI-FN-672 | 2026-11-11 |
| 935 | 정상 | 일반 회원 토큰이 있다 | category=spam 으로 rule_ids[] 를 넣어 신고한다 | violation 이 아닌 신고에 rule_ids 를 넣으면 신고의 rule_ids 가 비어 있다 | MTI-REQ-464 | MTI-FN-673 | 2026-11-11 |
| 936 | 예외 | 일반 회원의 리스트 「개발 소식」이 있다 | 두 번째 사용자 토큰으로 일반 회원의 리스트를 GET /api/v1/lists/{id} 로 부른다 | 남의 리스트를 부르면 응답 코드가 404 다 | MTI-REQ-465 · API GET /api/v1/lists/{id} 404 | MTI-FN-674 | 2026-11-11 |
| 937 | 예외 | 일반 회원의 필터 「스포일러」가 있다 | 두 번째 사용자 토큰으로 일반 회원의 필터를 GET /api/v2/filters/{id} 로 부른다 | 남의 필터 조회의 응답 코드가 404 다 | MTI-REQ-465 · API GET /api/v2/filters/{id} 404 | MTI-FN-674 | 2026-11-11 |
| 938 | 예외 | 컬렉션 주인에게 차단당한 계정 토큰이 있다 | 차단당한 계정 토큰으로 GET /api/v1/collections/{id} 를 부른다 | 주인에게 차단당한 계정이 컬렉션을 조회하면 응답 코드가 403 이다 | MTI-REQ-466 · 보류 — 차단당한 계정 |  | 2026-11-11 |
| 939 | 정상 | 토큰이 없다 | 토큰 없이 GET /api/v1/accounts/{qa_user1}/collections 를 부른다 | 본인이 아닌 채로 컬렉션 목록을 부르면 모든 컬렉션의 discoverable 이 true 다 | MTI-REQ-467 | MTI-FN-676 | 2026-11-11 |
| 940 | 경계 | 일반 회원 토큰이 있다 | 이름 40자로 컬렉션을 만든다 | 컬렉션 이름 40자로 만들면 응답 코드가 200 이다 | MTI-REQ-468 | MTI-FN-677 | 2026-11-11 |
| 941 | 경계 | 일반 회원 토큰이 있다 | 이름 41자로 컬렉션을 만든다 | 컬렉션 이름 41자 만들기의 응답 코드가 422 다 | MTI-REQ-468 · API POST /api/v1/collections 422 | MTI-FN-677 | 2026-11-11 |
| 942 | 경계 | 일반 회원 토큰이 있다 | 설명 100자로 컬렉션을 만든다 | 컬렉션 설명 100자로 만들면 응답 코드가 200 이다 | MTI-REQ-469 | MTI-FN-678 | 2026-11-11 |
| 943 | 경계 | 일반 회원 토큰이 있다 | 설명 101자로 컬렉션을 만든다 | 컬렉션 설명 101자 만들기의 응답 코드가 422 다 | MTI-REQ-469 | MTI-FN-678 | 2026-11-11 |
| 944 | 경계 | 컬렉션에 넣을 계정이 26개 있다 | 컬렉션에 26번째 계정을 더한다 | 컬렉션에 계정 26개째를 더하면 응답 코드가 422 다 | MTI-REQ-470 · API POST /api/v1/collections/{collection_id}/items 422 · 보류 — 넣을 계정 26개 |  | 2026-11-11 |
| 945 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 컬렉션 10개째를 만든다 | 컬렉션 10개째를 만들면 응답 코드가 200 이다 | MTI-REQ-471 | MTI-FN-680 | 2026-11-11 |
| 946 | 경계 | 두 번째 사용자 토큰이 있다 | 두 번째 사용자가 컬렉션 11개째를 만든다 | 컬렉션 11개째 만들기의 응답 코드가 422 다 | MTI-REQ-471 | MTI-FN-680 | 2026-11-11 |
| 947 | 정상 | 토큰이 없다 | GET /api/v1_alpha/collections/{id} 를 토큰 없이 부른다 | 옛 경로 /api/v1_alpha/collections/{id} 를 부르면 응답 코드가 200 이다 | MTI-REQ-472 | MTI-FN-681 | 2026-11-11 |
| 948 | 예외 | 일반 회원 토큰이 있다 | 이름 41자로 POST /api/v1/collections 를 부른다 | 컬렉션 검증이 실패하면 error 가 객체다 | MTI-REQ-473 | MTI-FN-682 | 2026-11-11 |
| 949 | 예외 | 토큰이 없다 | GET /api/v1/instance/domain_blocks 를 부른다 | 도메인 차단 공개가 꺼진 서버에서 차단 서버 목록을 부르면 응답 코드가 404 다 | MTI-REQ-474 · API GET /api/v1/instance/domain_blocks 404 | MTI-FN-683 | 2026-11-11 |
| 950 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 서버 판을 읽는다 | 인스턴스 정보를 부르면 version 이 4.7.5 다 | MTI-REQ-475 | MTI-FN-684 | 2026-11-11 |
| 951 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 서버 판을 읽는다 | api_versions.mastodon 이 11 이다 | MTI-REQ-475 | MTI-FN-684 | 2026-11-11 |
| 952 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 계정 제한값을 읽는다 | 인스턴스 정보를 부르면 configuration.accounts.max_display_name_length 가 40 이다 | MTI-REQ-476 | MTI-FN-685 | 2026-11-11 |
| 953 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 글 제한값을 읽는다 | 인스턴스 정보를 부르면 configuration.statuses.max_characters 가 500 이다 | MTI-REQ-477 | MTI-FN-686 | 2026-11-11 |
| 954 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 미디어 제한값을 읽는다 | 인스턴스 정보를 부르면 configuration.media_attachments.description_limit 이 10000 이다 | MTI-REQ-478 | MTI-FN-687 | 2026-11-11 |
| 955 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 설문 제한값을 읽는다 | 인스턴스 정보를 부르면 configuration.polls.max_options 가 4 다 | MTI-REQ-479 | MTI-FN-688 | 2026-11-11 |
| 956 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 가입 설정을 읽는다 | 인스턴스 정보를 부르면 registrations.enabled 가 true 다 | MTI-REQ-480 | MTI-FN-689 | 2026-11-11 |
| 957 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 번역 설정을 읽는다 | 인스턴스 정보를 부르면 configuration.translation.enabled 가 false 다 | MTI-REQ-481 | MTI-FN-690 | 2026-11-11 |
| 958 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 타임라인 접근 설정을 읽는다 | 인스턴스 정보를 부르면 configuration.timelines_access.live_feeds.local 이 public 이다 | MTI-REQ-482 | MTI-FN-691 | 2026-11-11 |
| 959 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 도메인과 언어를 읽는다 | 인스턴스 정보를 부르면 domain 이 mastodon.maxihan.com 이다 | MTI-REQ-483 | MTI-FN-692 | 2026-11-11 |
| 960 | 정상 | 토큰이 없다 | GET /api/v2/instance 로 스트리밍 주소를 읽는다 | 인스턴스 정보를 부르면 configuration.urls.streaming 이 wss://mastodon.maxihan.com 이다 | MTI-REQ-484 | MTI-FN-693 | 2026-11-11 |
| 961 | 정상 | 일반 회원 토큰이 있다 | GET /api/v1/streaming 으로 WebSocket 을 열고 user 스트림을 구독한다 | WebSocket 을 열어 user 스트림을 구독하면 연결이 열린다 | MTI-REQ-485 · 보류 — WebSocket 도구 | 제거함(MTI-FN-694) | 2026-11-11 |
| 962 | 예외 | read:accounts 범위만 가진 시험 앱 토큰이 있다 | read:accounts 범위 토큰으로 GET /api/v1/streaming/public 을 부른다 | 범위가 모자란 토큰으로 스트림을 열면 오류 문구가 「Access token does not have the required scopes」 다 | MTI-REQ-488 | MTI-FN-695 | 2026-11-11 |
| 963 | 정상 | 토큰이 없다 | GET /api/v1/streaming/health 의 본문을 읽는다 | GET /api/v1/streaming/health 를 부르면 본문이 OK 다 | MTI-REQ-490 | MTI-FN-696 | 2026-11-11 |
| 964 | 예외 | 토큰이 없다 | 토큰 없이 GET /api/v1/streaming/public 을 연다 | 토큰 없이 공개 스트림을 열면 응답 코드가 401 이다 | MTI-REQ-491 | MTI-FN-697 | 2026-11-11 |
| 965 | 예외 | 일반 회원 토큰이 있다 | 관리 범위가 없는 일반 회원 토큰으로 GET /api/v1/admin/accounts 를 부른다 | 관리 범위 없이 관리 API 를 부르면 오류 문구가 「This action is outside the authorized scopes」 다 | MTI-REQ-493 | MTI-FN-698 | 2026-11-11 |
| 966 | 예외 | 어드민 키가 있다 | ip 를 not-an-ip 로 POST /api/v1/admin/ip_blocks 를 부른다 | ip 형식이 틀린 IP 차단을 더하면 응답 코드가 422 다 | MTI-REQ-497 · API POST /api/v1/admin/ip_blocks 422 | MTI-FN-699 | 2026-11-11 |
| 967 | 예외 | 토큰이 없다 | GET /api/v1/statuses/{id}/card 를 부른다 | 부록 B 의 GET /api/v1/statuses/{id}/card 를 부르면 응답 코드가 404 다 | MTI-REQ-498 | MTI-FN-700 | 2026-11-11 |
| 968 | 예외 | 토큰이 없다 | GET /api/v1/search?q=hana 를 부른다 | GET /api/v1/search 의 응답 코드가 404 다 | MTI-REQ-498 | MTI-FN-700 | 2026-11-11 |
| 969 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/timelines/direct 를 부른다 | GET /api/v1/timelines/direct 의 응답 코드가 404 다 | MTI-REQ-498 | MTI-FN-700 | 2026-11-11 |
| 970 | 예외 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 POST /api/v1/accounts/{hana_photo}/email_subscriptions 를 부른다 | 이메일 구독을 부르면 서버 오류(5xx) 없이 응답한다 | MTI-REQ-499 | MTI-FN-701 | 2026-11-11 |
| 971 | 정상 | 일반 회원 토큰이 있다 | 일반 회원 토큰으로 GET /api/v1/timelines/direct 를 부른다 | API 문서대로 GET /api/v1/timelines/direct 를 부르면 응답 코드가 200 이다 | API GET /api/v1/timelines/direct 200 · 보류 — 자료 어긋남 |  | 2026-11-11 |

## 제외

| 요구 | 종류 | 사유 |
|------|------|------|
| MTI-REQ-280 | 계정 미등록 | 웹 로그인 회원 |
| MTI-REQ-281 | 계정 미등록 | 웹 로그인 회원 |
| MTI-REQ-290 | 환경 한계 | 호출 한도 채우기 — 앱 등록을 10분에 6번 부르면 같은 IP 를 쓰는 다른 케이스의 앱 등록이 막힌다 |
| MTI-REQ-292 | 계정 미등록 | 폐기해도 되는 사용자 토큰 |
| MTI-REQ-300 | 환경 한계 | 시계 넘기기 — 토큰이 만료되지 않아 만료된 토큰을 만들 수 없다 |
| MTI-REQ-304 | 계정 미등록 | 승인 대기 회원 |
| MTI-REQ-343 | 환경 한계 | 바깥 서비스 — 원격 서버 · 저장소 장애를 일부러 낼 수 없다 |
| MTI-REQ-349 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| MTI-REQ-350 | 환경 한계 | 호출 한도 채우기 — 5분에 1,500번을 불러야 하고 그동안 다른 케이스가 막힌다 |
| MTI-REQ-351 | 환경 한계 | 호출 한도 채우기 — 토큰 하나로 5분에 300번을 불러야 하고 그 토큰을 쓰는 다른 케이스가 막힌다 |
| MTI-REQ-352 | 환경 한계 | 호출 한도 채우기 — IP 하나로 5분에 300번을 불러야 하고 같은 IP 의 다른 케이스가 막힌다 |
| MTI-REQ-353 | 환경 한계 | 호출 한도 채우기 — 15분에 300번을 불러야 하고 그동안 다른 케이스가 막힌다 |
| MTI-REQ-354 | 환경 한계 | 호출 한도 채우기 — 30분에 30번 올려야 하고 그 계정의 다른 업로드가 막힌다 |
| MTI-REQ-355 | 환경 한계 | 호출 한도 채우기 — 30분에 30번 지워야 하고 그 계정의 다른 삭제가 막힌다 |
| MTI-REQ-356 | 환경 한계 | 호출 한도 채우기 — 30분에 5번 넘게 가입해야 하고 같은 IP 의 가입이 막힌다 |
| MTI-REQ-357 | 환경 한계 | 호출 한도 채우기 — 확인 메일을 5분에 25번 보내야 한다 |
| MTI-REQ-358 | 환경 한계 | 호출 한도 채우기 — 3시간에 300번 써야 하고 그 계정의 글쓰기가 막힌다 |
| MTI-REQ-359 | 환경 한계 | 호출 한도 채우기 — 24시간에 400번 팔로우해야 하고 그 계정의 팔로우가 막힌다 |
| MTI-REQ-360 | 환경 한계 | 호출 한도 채우기 — 24시간에 400번 신고해야 한다 |
| MTI-REQ-362 | 되돌릴 수 없음 | 러너 IP 를 no_access 로 막으면 막기를 풀 요청도 막힌다 |
| MTI-REQ-388 | 환경 한계 | 케이스 한도를 넘는 기다림 — 깊이 20 · 위 40 을 넘는 답글 사슬을 만들고 지우는 데 케이스 한도(30초)를 넘는다 |
| MTI-REQ-389 | 환경 한계 | 케이스 한도를 넘는 기다림 — 4,096 개 넘는 답글을 만들 수 없다 |
| MTI-REQ-414 | 환경 한계 | 케이스 한도를 넘는 기다림 — 예약 글 300개를 만들고 지우는 데 케이스 한도(30초)를 넘는다 |
| MTI-REQ-423 | 환경 한계 | 호출 한도 채우기 — 3시간에 300번 쓰거나 30분에 30번 지워야 하고 그 계정의 다른 케이스가 막힌다 |
| MTI-REQ-436 | 환경 한계 | 케이스 한도를 넘는 기다림 — 설문이 끝나려면 최소 300초를 기다려야 한다 |
| MTI-REQ-486 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| MTI-REQ-487 | 환경 한계 | 케이스 한도를 넘는 기다림 — 이벤트를 받으려면 끝나지 않는 스트림을 열어 둬야 한다 |
| MTI-REQ-489 | 환경 한계 | 케이스 한도를 넘는 기다림 — 15초마다 오는 줄을 보려면 끝나지 않는 스트림을 열어 둬야 한다 |
| MTI-REQ-492 | 환경 한계 | 케이스 한도를 넘는 기다림 — 비로그인 공개 스트림이 열리면 본문이 끝나지 않는다 |
| MTI-REQ-494 | 계정 미등록 | 관리 범위를 받은 일반 회원 |
| MTI-REQ-495 | 자료 없음 | 운영툴 기획서의 역할 표가 이번 요청에 없다 |
| MTI-REQ-496 | 환경 한계 | 바깥 서비스 — 원격 계정을 만들 다른 연합 서버가 없다 |
| API GET /health 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /health 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /health 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /health 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /health 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /health 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/oembed 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/oembed 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/oembed 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/oembed 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/oembed 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/oembed 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/apps 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API POST /api/v1/apps 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/apps 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/apps 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/apps 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/apps 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /oauth/token 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /oauth/token 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /oauth/token 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /oauth/token 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /oauth/token 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/lists 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/lists 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/lists 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/lists 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/lists 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/lists 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/lists 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/lists 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/lists 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/media 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/media 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/media 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/media 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/mutes 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/mutes 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/mutes 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/mutes 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/mutes 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/media 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v2/media 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v2/media 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v2/media 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v2/media 500 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/media 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /oauth/revoke 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API POST /oauth/revoke 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /oauth/revoke 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /oauth/revoke 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /oauth/revoke 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /oauth/revoke 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /oauth/revoke 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/search 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/search 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/search 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/search 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/filters 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/filters 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/filters 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/filters 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/filters 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/filters 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/filters 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/filters 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/filters 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/filters 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/markers 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/markers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/markers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/markers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/markers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/markers 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/markers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/markers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/markers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/markers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/profile 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/profile 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/profile 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/profile 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/profile 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PATCH /api/v1/profile 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API PATCH /api/v1/profile 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PATCH /api/v1/profile 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PATCH /api/v1/profile 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PATCH /api/v1/profile 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/reports 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/reports 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/reports 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/reports 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/filters 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/filters 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v2/filters 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v2/filters 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v2/filters 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /oauth/userinfo 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API GET /oauth/userinfo 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /oauth/userinfo 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /oauth/userinfo 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /oauth/userinfo 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /oauth/userinfo 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/instance 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v2/instance 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/instance 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/instance 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/instance 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/instance 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /oauth/authorize 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /oauth/authorize 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /oauth/authorize 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /oauth/authorize 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /oauth/authorize 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /oauth/authorize 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/bookmarks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/bookmarks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/bookmarks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/bookmarks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/bookmarks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/directory 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/directory 404 | 만들 수 없는 응답 | 서버 설정을 꺼야 나오는데 API 로 서버 설정을 바꿀 수 없다 |
| API GET /api/v1/directory 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/directory 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/directory 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/directory 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/favourites 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/favourites 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/favourites 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/favourites 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/favourites 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/lists/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/lists/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/lists/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/lists/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/lists/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/lists/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/lists/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/lists/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/lists/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/lists/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/lists/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/lists/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/media/{id} 206 | 만들 수 없는 응답 | 미디어가 처리 중인 순간을 일부러 붙잡을 수 없다 |
| API GET /api/v1/media/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/media/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/media/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/media/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/media/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/media/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/media/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/media/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/media/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/media/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/media/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/polls/{id} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/polls/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/polls/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/polls/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/polls/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/collections 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/collections 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/collections 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/collections 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/preferences 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/preferences 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/preferences 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/preferences 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/preferences 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/suggestions 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/suggestions 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/suggestions 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/suggestions 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/suggestions 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/tags/{name} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/tags/{name} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/tags/{name} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/tags/{name} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/tags/{name} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/trends/tags 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/trends/tags 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/trends/tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/trends/tags 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/trends/tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/trends/tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/suggestions 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/suggestions 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/suggestions 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/suggestions 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/suggestions 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/endorsements 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/endorsements 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/endorsements 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/endorsements 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/endorsements 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/trends/links 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/trends/links 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/trends/links 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/trends/links 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/trends/links 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/trends/links 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v2/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v2/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v2/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v2/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v2/filters/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v2/filters/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v2/filters/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v2/filters/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/reports 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/reports 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/reports 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/reports 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/reports 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/announcements 401 | 만들 수 없는 응답 | 사용자만 필요한 API 는 토큰이 없으면 422 를 낸다고 기획서에 적혀 있다 |
| API GET /api/v1/announcements 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/announcements 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/announcements 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/announcements 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/conversations 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/conversations 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/conversations 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/conversations 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/conversations 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/custom_emojis 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/custom_emojis 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/custom_emojis 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/custom_emojis 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/custom_emojis 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/custom_emojis 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/featured_tags 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/featured_tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/featured_tags 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/featured_tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/featured_tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/featured_tags 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/featured_tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/featured_tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/featured_tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/followed_tags 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/followed_tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/followed_tags 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/followed_tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/followed_tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/notifications 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/notifications 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/notifications 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/notifications 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/notifications 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/notifications 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/accounts 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/accounts 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/measures 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/measures 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/measures 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/measures 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/measures 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/annual_reports 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/annual_reports 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/annual_reports 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/annual_reports 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/annual_reports 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/peers 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/peers 404 | 만들 수 없는 응답 | 서버 설정을 꺼야 나오는데 API 로 서버 설정을 바꿀 수 없다 |
| API GET /api/v1/instance/peers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/peers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/peers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/peers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/rules 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/rules 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance/rules 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/rules 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/rules 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/rules 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/profile/avatar 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/profile/avatar 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/profile/avatar 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/profile/avatar 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/profile/avatar 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/profile/header 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/profile/header 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/profile/header 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/profile/header 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/profile/header 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/list 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/list 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/list 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/list 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/list 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/list 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/user 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/user 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/user 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/user 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/user 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/user 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/home 206 | 자료 없음 | 이 API 가 206 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/home 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/home 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/home 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/home 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/home 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/link 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/timelines/link 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/link 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/link 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/link 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/link 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/admin/accounts 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/admin/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/admin/accounts 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/admin/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/admin/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/lookup 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/lookup 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts/lookup 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/lookup 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/lookup 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/lookup 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/search 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts/search 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/search 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/search 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/search 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/ip_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/ip_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/ip_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/ip_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/ip_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/ip_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/ip_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/ip_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/ip_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/retention 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/retention 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/retention 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/retention 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/retention 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/follow_requests 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/follow_requests 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/follow_requests 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/follow_requests 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/follow_requests 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/trends/statuses 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/trends/statuses 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/trends/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/trends/statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/trends/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/trends/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/dimensions 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/dimensions 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/dimensions 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/dimensions 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/dimensions 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/collections/{id} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/collections/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/collections/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/collections/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/collections/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/collections/{id} 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/collections/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/collections/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/collections/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/collections/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PATCH /api/v1/collections/{id} 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API PATCH /api/v1/collections/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PATCH /api/v1/collections/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PATCH /api/v1/collections/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PATCH /api/v1/collections/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/polls/{id}/votes 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/polls/{id}/votes 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/polls/{id}/votes 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/direct 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/direct 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/direct 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/direct 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/direct 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/direct 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/health 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/streaming/health 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/health 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/health 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/health 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/health 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/public 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/public 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/public 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/public 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/public 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/public 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/direct 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/timelines/direct 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/direct 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/direct 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/direct 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/direct 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/public 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/timelines/public 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/public 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/public 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/public 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/public 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/pin 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/pin 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/pin 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/pin 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/pin 500 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/pin 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/trends/tags 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/trends/tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/trends/tags 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/trends/tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/trends/tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/activity 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/activity 404 | 만들 수 없는 응답 | 서버 설정을 꺼야 나오는데 API 로 서버 설정을 바꿀 수 없다 |
| API GET /api/v1/instance/activity 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/activity 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/activity 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/activity 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/push/subscription 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/push/subscription 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/push/subscription 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/push/subscription 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/push/subscription 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/push/subscription 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/push/subscription 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/push/subscription 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/push/subscription 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/push/subscription 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/push/subscription 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/push/subscription 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/push/subscription 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/push/subscription 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/push/subscription 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/push/subscription 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/push/subscription 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/push/subscription 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/pin 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/pin 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/pin 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/hashtag 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/hashtag 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/hashtag 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/hashtag 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/hashtag 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/hashtag 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/tags/{id}/feature 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/tags/{id}/feature 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/tags/{id}/feature 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/tags/{id}/feature 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/mute 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/mute 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/mute 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/mute 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/note 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/note 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/note 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/note 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/reports/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/reports/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/reports/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/reports/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/admin/reports/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/admin/reports/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/admin/reports/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/admin/reports/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/trends/links 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/trends/links 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/trends/links 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/trends/links 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/trends/links 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/conversations/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/conversations/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/conversations/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/conversations/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/featured_tags/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/featured_tags/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/featured_tags/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/featured_tags/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/scheduled_statuses 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/scheduled_statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/scheduled_statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/scheduled_statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/scheduled_statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/mute 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/mute 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/mute 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/mute 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/tags/{name}/follow 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/tags/{name}/follow 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/tags/{name}/follow 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/tags/{name}/follow 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/block 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/block 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/block 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/block 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/lists 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/lists 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/lists 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/lists 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/unpin 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unpin 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unpin 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/unpin 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/accounts/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/accounts/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/accounts/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/accounts/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/accounts/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/accounts/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/accounts/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/accounts/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/domain_allows 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/domain_allows 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/domain_allows 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/domain_allows 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/domain_allows 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/domain_allows 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/domain_allows 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/domain_allows 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/domain_allows 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/domain_allows 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/lists/{id}/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/lists/{id}/accounts 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/lists/{id}/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/lists/{id}/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/lists/{id}/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/lists/{id}/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/lists/{id}/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/lists/{id}/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/lists/{id}/accounts 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/lists/{id}/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/lists/{id}/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/clear 200 | 되돌릴 수 없음 | 알림을 전부 지우면 시드 알림이 사라지고 쓸 수 있는 일회용 계정이 없다 |
| API POST /api/v1/notifications/clear 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/notifications/clear 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/clear 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/clear 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/clear 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/unpin 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unpin 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unpin 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/unpin 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/tags/{id}/unfeature 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/tags/{id}/unfeature 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/tags/{id}/unfeature 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/tags/{id}/unfeature 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/follow 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/follow 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/follow 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/unmute 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unmute 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unmute 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/unmute 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/ip_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/ip_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/ip_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/ip_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/admin/ip_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/admin/ip_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/admin/ip_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/admin/ip_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/ip_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/ip_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/ip_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/ip_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/emails/confirmations 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/emails/confirmations 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/emails/confirmations 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/emails/confirmations 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/emails/confirmations 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/quotes 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/quotes 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/quotes 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/quotes 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/reblog 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/reblog 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/reblog 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/reblog 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/source 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/source 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/source 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/source 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/unmute 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unmute 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unmute 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/unmute 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/tags/{name}/unfollow 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/tags/{name}/unfollow 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/tags/{name}/unfollow 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/tags/{name}/unfollow 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/notifications/policy 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/notifications/policy 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/notifications/policy 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/notifications/policy 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/notifications/policy 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PATCH /api/v2/notifications/policy 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API PATCH /api/v2/notifications/policy 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PATCH /api/v2/notifications/policy 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PATCH /api/v2/notifications/policy 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PATCH /api/v2/notifications/policy 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/endorse 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/endorse 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/endorse 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/endorse 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/endorse 500 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/endorse 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/unblock 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unblock 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unblock 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/unblock 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/trends/statuses 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/trends/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/trends/statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/trends/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/trends/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/annual_reports/{year} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/annual_reports/{year} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/annual_reports/{year} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/annual_reports/{year} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/context 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses/{id}/context 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/context 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/context 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/context 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/history 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses/{id}/history 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/history 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/history 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/history 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters/keywords/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters/keywords/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters/keywords/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters/keywords/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v2/filters/keywords/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v2/filters/keywords/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v2/filters/keywords/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v2/filters/keywords/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v2/filters/keywords/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v2/filters/keywords/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v2/filters/keywords/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v2/filters/keywords/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters/statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters/statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters/statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters/statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v2/filters/statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v2/filters/statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v2/filters/statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v2/filters/statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/relationships 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts/relationships 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/relationships 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/relationships 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/relationships 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/statuses 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id}/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/unfollow 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unfollow 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unfollow 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/unfollow 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/domain_blocks 200 | 만들 수 없는 응답 | 우리 서버는 도메인 차단 공개가 꺼져 있어 404 다 — 200 을 낼 길이 없다 |
| API GET /api/v1/instance/domain_blocks 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications/requests 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/notifications/requests 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications/requests 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications/requests 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications/requests 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/bookmark 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/bookmark 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/bookmark 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/bookmark 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/unreblog 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unreblog 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unreblog 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/unreblog 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/public/local 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/public/local 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/public/local 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/public/local 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/public/local 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/public/local 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/followers 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id}/followers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/followers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/followers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/followers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/following 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id}/following 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/following 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/following 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/following 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/unendorse 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unendorse 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/unendorse 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/unendorse 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/apps/verify_credentials 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/apps/verify_credentials 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/apps/verify_credentials 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/apps/verify_credentials 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/apps/verify_credentials 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/conversations/{id}/read 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/conversations/{id}/read 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/conversations/{id}/read 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/conversations/{id}/read 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/privacy_policy 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/privacy_policy 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance/privacy_policy 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/privacy_policy 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/privacy_policy 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/privacy_policy 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/scheduled_statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/scheduled_statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/scheduled_statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/scheduled_statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/scheduled_statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/scheduled_statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/scheduled_statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/scheduled_statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/scheduled_statuses/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/scheduled_statuses/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/scheduled_statuses/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/scheduled_statuses/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/favourite 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/favourite 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/favourite 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/favourite 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/translate 200 | 환경 한계 | 바깥 서비스 — 우리 서버는 번역 서비스가 꺼져 있다 |
| API POST /api/v1/statuses/{id}/translate 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/translate 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/translate 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/translate 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/translate 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/hashtag/local 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/hashtag/local 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/hashtag/local 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/hashtag/local 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/hashtag/local 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/hashtag/local 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/public/remote 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/public/remote 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/public/remote 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/public/remote 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/public/remote 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/public/remote 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/tag/{hashtag} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/timelines/tag/{hashtag} 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/timelines/tag/{hashtag} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/tag/{hashtag} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/tag/{hashtag} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/tag/{hashtag} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/domain_allows/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/domain_allows/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/domain_allows/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/domain_allows/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/domain_allows/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/domain_allows/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/domain_allows/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/domain_allows/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/domain_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/domain_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/domain_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/domain_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/admin/domain_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/admin/domain_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/admin/domain_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/admin/domain_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/domain_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/domain_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/domain_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/domain_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/unbookmark 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unbookmark 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unbookmark 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/unbookmark 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/suggestions/{account_id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/suggestions/{account_id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/suggestions/{account_id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/suggestions/{account_id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/timelines/list/{list_id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/timelines/list/{list_id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/timelines/list/{list_id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/timelines/list/{list_id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/email_domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/email_domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/email_domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/email_domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/email_domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/email_domain_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/email_domain_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/email_domain_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/email_domain_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/email_domain_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/reports/{id}/reopen 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/reopen 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/reopen 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/reports/{id}/reopen 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/featured_tags/suggestions 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/featured_tags/suggestions 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/featured_tags/suggestions 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/featured_tags/suggestions 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/featured_tags/suggestions 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/terms_of_service 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/terms_of_service 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance/terms_of_service 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/terms_of_service 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/terms_of_service 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/terms_of_service 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/unfavourite 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unfavourite 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/unfavourite 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/unfavourite 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/notifications/{group_key} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/notifications/{group_key} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/notifications/{group_key} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/notifications/{group_key} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/endorsements 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id}/endorsements 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/endorsements 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/endorsements 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/endorsements 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/action 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/action 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/action 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/action 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/enable 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/enable 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/enable 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/enable 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/reject 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/reject 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/reject 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/reject 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/reports/{id}/resolve 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/resolve 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/resolve 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/reports/{id}/resolve 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/announcements/{id}/dismiss 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/announcements/{id}/dismiss 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/announcements/{id}/dismiss 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/announcements/{id}/dismiss 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/annual_reports/{year}/read 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/annual_reports/{year}/read 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/annual_reports/{year}/read 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/annual_reports/{year}/read 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications/unread_count 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/notifications/unread_count 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications/unread_count 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications/unread_count 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications/unread_count 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/{id}/dismiss 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/{id}/dismiss 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/{id}/dismiss 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/{id}/dismiss 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/reblogged_by 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses/{id}/reblogged_by 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/reblogged_by 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/reblogged_by 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/reblogged_by 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1_alpha/async_refreshes/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1_alpha/async_refreshes/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1_alpha/async_refreshes/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1_alpha/async_refreshes/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/notifications/unread_count 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v2/notifications/unread_count 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/notifications/unread_count 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/notifications/unread_count 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/notifications/unread_count 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/familiar_followers 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts/familiar_followers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/familiar_followers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/familiar_followers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/familiar_followers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PATCH /api/v1/accounts/update_credentials 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API PATCH /api/v1/accounts/update_credentials 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PATCH /api/v1/accounts/update_credentials 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PATCH /api/v1/accounts/update_credentials 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/verify_credentials 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/accounts/verify_credentials 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/verify_credentials 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/verify_credentials 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/verify_credentials 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/featured_tags 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{id}/featured_tags 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/featured_tags 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{id}/featured_tags 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/featured_tags 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/approve 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/approve 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/approve 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/approve 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/reports/{id}/unassign 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/unassign 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/unassign 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/reports/{id}/unassign 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/annual_reports/{year}/state 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/annual_reports/{year}/state 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/annual_reports/{year}/state 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/annual_reports/{year}/state 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications/requests/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications/requests/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications/requests/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications/requests/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/statuses/{id}/favourited_by 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/statuses/{id}/favourited_by 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/statuses/{id}/favourited_by 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/statuses/{id}/favourited_by 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/statuses/{id}/favourited_by 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/streaming/user/notification 200 | 환경 한계 | 케이스 한도를 넘는 기다림 — 끝나지 않는 SSE 본문을 요청 도구가 다 받지 못한다 |
| API GET /api/v1/streaming/user/notification 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/streaming/user/notification 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/streaming/user/notification 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/streaming/user/notification 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/streaming/user/notification 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/canonical_email_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/admin/canonical_email_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/canonical_email_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/canonical_email_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/canonical_email_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/canonical_email_blocks 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/canonical_email_blocks 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters/{filter_id}/keywords 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters/{filter_id}/keywords 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters/{filter_id}/keywords 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters/{filter_id}/keywords 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/filters/{filter_id}/keywords 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v2/filters/{filter_id}/keywords 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v2/filters/{filter_id}/keywords 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/filters/{filter_id}/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/filters/{filter_id}/statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/filters/{filter_id}/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/filters/{filter_id}/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/filters/{filter_id}/statuses 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v2/filters/{filter_id}/statuses 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v2/filters/{filter_id}/statuses 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v2/filters/{filter_id}/statuses 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{id}/identity_proofs 401 | 만들 수 없는 응답 | 사용자만 필요한 API 는 토큰이 없으면 422 를 낸다고 기획서에 적혀 있다 |
| API GET /api/v1/accounts/{id}/identity_proofs 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{id}/identity_proofs 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{id}/identity_proofs 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/unsilence 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsilence 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsilence 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/unsilence 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/unsuspend 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsuspend 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsuspend 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/unsuspend 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/extended_description 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/extended_description 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance/extended_description 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/extended_description 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/extended_description 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/extended_description 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/requests/accept 200 | 되돌릴 수 없음 | 시드 알림 요청을 수락 · 버리면 되돌릴 수 없고 걸러지는 알림을 새로 만들 계정이 없다 |
| API POST /api/v1/notifications/requests/accept 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/notifications/requests/accept 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/requests/accept 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/requests/accept 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/requests/accept 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/notifications/requests/merged 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/notifications/requests/merged 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/notifications/requests/merged 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/notifications/requests/merged 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/notifications/requests/merged 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/email_domain_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/email_domain_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/email_domain_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/email_domain_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/email_domain_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/email_domain_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/email_domain_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/email_domain_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/annual_reports/{year}/generate 202 | 자료 없음 | 이 API 가 202 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/annual_reports/{year}/generate 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/annual_reports/{year}/generate 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/annual_reports/{year}/generate 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/annual_reports/{year}/generate 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/translation_languages 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/translation_languages 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /api/v1/instance/translation_languages 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/translation_languages 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/translation_languages 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/translation_languages 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/requests/dismiss 200 | 되돌릴 수 없음 | 시드 알림 요청을 수락 · 버리면 되돌릴 수 없고 걸러지는 알림을 새로 만들 계정이 없다 |
| API POST /api/v1/notifications/requests/dismiss 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/notifications/requests/dismiss 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/requests/dismiss 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/requests/dismiss 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/requests/dismiss 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /.well-known/oauth-authorization-server 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /.well-known/oauth-authorization-server 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API GET /.well-known/oauth-authorization-server 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /.well-known/oauth-authorization-server 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /.well-known/oauth-authorization-server 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /.well-known/oauth-authorization-server 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/accounts/{id}/unsensitive 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsensitive 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/accounts/{id}/unsensitive 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/accounts/{id}/unsensitive 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/instance/terms_of_service/{date} 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/instance/terms_of_service/{date} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/instance/terms_of_service/{date} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/instance/terms_of_service/{date} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/instance/terms_of_service/{date} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/statuses/{id}/interaction_policy 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/statuses/{id}/interaction_policy 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/statuses/{id}/interaction_policy 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/statuses/{id}/interaction_policy 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{account_id}/collections 401 | 만들 수 없는 응답 | 공개 API 라 토큰이 없거나 틀려도 응답한다 — 기획서는 401 을 범위가 적힌 API 에만 적었다 |
| API GET /api/v1/accounts/{account_id}/collections 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{account_id}/collections 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{account_id}/collections 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{account_id}/collections 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/canonical_email_blocks/test 404 | 자료 없음 | 이 API 가 404 를 내는 조건이 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks/test 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks/test 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/canonical_email_blocks/test 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/canonical_email_blocks/test 500 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/canonical_email_blocks/test 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/admin/canonical_email_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/admin/canonical_email_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/admin/canonical_email_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/admin/canonical_email_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/admin/canonical_email_blocks/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/admin/canonical_email_blocks/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/admin/canonical_email_blocks/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/admin/canonical_email_blocks/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/admin/reports/{id}/assign_to_self 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/assign_to_self 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/admin/reports/{id}/assign_to_self 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/admin/reports/{id}/assign_to_self 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/collections/{collection_id}/items 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/collections/{collection_id}/items 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/collections/{collection_id}/items 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/collections/{collection_id}/items 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v2/notifications/{group_key}/dismiss 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v2/notifications/{group_key}/dismiss 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v2/notifications/{group_key}/dismiss 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v2/notifications/{group_key}/dismiss 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/requests/{id}/accept 200 | 되돌릴 수 없음 | 시드 알림 요청을 수락 · 버리면 되돌릴 수 없고 걸러지는 알림을 새로 만들 계정이 없다 |
| API POST /api/v1/notifications/requests/{id}/accept 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/requests/{id}/accept 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/requests/{id}/accept 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/requests/{id}/accept 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v2/notifications/{group_key}/accounts 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v2/notifications/{group_key}/accounts 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v2/notifications/{group_key}/accounts 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v2/notifications/{group_key}/accounts 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/accounts/{id}/remove_from_followers 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/accounts/{id}/remove_from_followers 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/accounts/{id}/remove_from_followers 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/accounts/{id}/remove_from_followers 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API PUT /api/v1/announcements/{id}/reactions/{name} 400 | 자료 없음 | 이 API 가 400 를 내는 조건이 기획서에 없다 |
| API PUT /api/v1/announcements/{id}/reactions/{name} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API PUT /api/v1/announcements/{id}/reactions/{name} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API PUT /api/v1/announcements/{id}/reactions/{name} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API PUT /api/v1/announcements/{id}/reactions/{name} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/announcements/{id}/reactions/{name} 400 | 자료 없음 | 이 API 가 400 를 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/announcements/{id}/reactions/{name} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/announcements/{id}/reactions/{name} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/announcements/{id}/reactions/{name} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/announcements/{id}/reactions/{name} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/follow_requests/{account_id}/reject 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/follow_requests/{account_id}/reject 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/follow_requests/{account_id}/reject 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/follow_requests/{account_id}/reject 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/notifications/requests/{id}/dismiss 200 | 되돌릴 수 없음 | 시드 알림 요청을 수락 · 버리면 되돌릴 수 없고 걸러지는 알림을 새로 만들 계정이 없다 |
| API POST /api/v1/notifications/requests/{id}/dismiss 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/notifications/requests/{id}/dismiss 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/notifications/requests/{id}/dismiss 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/notifications/requests/{id}/dismiss 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API GET /api/v1/accounts/{account_id}/in_collections 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API GET /api/v1/accounts/{account_id}/in_collections 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API GET /api/v1/accounts/{account_id}/in_collections 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API GET /api/v1/accounts/{account_id}/in_collections 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API DELETE /api/v1/collections/{collection_id}/items/{id} 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API DELETE /api/v1/collections/{collection_id}/items/{id} 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API DELETE /api/v1/collections/{collection_id}/items/{id} 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API DELETE /api/v1/collections/{collection_id}/items/{id} 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API DELETE /api/v1/collections/{collection_id}/items/{id} 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/follow_requests/{account_id}/authorize 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/follow_requests/{account_id}/authorize 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/follow_requests/{account_id}/authorize 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/follow_requests/{account_id}/authorize 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/collections/{collection_id}/items/{id}/revoke 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/collections/{collection_id}/items/{id}/revoke 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/collections/{collection_id}/items/{id}/revoke 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/collections/{collection_id}/items/{id}/revoke 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/collections/{collection_id}/items/{id}/revoke 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |
| API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 403 | 자료 없음 | 이 API 가 403 을 내는 조건이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 410 | 자료 없음 | 410 을 내는 경우가 기획서에 없다 |
| API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 422 | 자료 없음 | 이 API 가 422 를 내는 입력이 기획서에 없다 |
| API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 429 | 환경 한계 | 호출 한도 채우기 — 한도를 넘기면 같은 서버를 쓰는 다른 케이스가 막힌다 |
| API POST /api/v1/statuses/{id}/quotes/{quoting_status_id}/revoke 503 | 만들 수 없는 응답 | 서버 · 저장소 장애를 일부러 낼 수 없다 |

## 설계 거절

| 요구 | 축 | 까닭 |
|------|----|------|
| MTI-REQ-477 | 경계 | 「최대 글자 500」은 인스턴스 정보가 돌려주는 설정값이다 — 입력 한도가 아니다 |
| MTI-REQ-479 | 경계 | 「최소 300」 · 「최대 2629746」은 인스턴스 정보가 돌려주는 설정값이다 — 입력 한도가 아니다 |
| MTI-REQ-453 | 예외 | 「존재하지 않는 태그도 정보를 돌려준다」는 정상 동작이다 — 틀린 입력 묶음이 아니다 |
