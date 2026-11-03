**덮는 범위** — 원장: 요구 210 → 케이스 21 · 제외 189(환경 한계 4 · 계정 미등록 175 · 자료 없음 10) · 빠짐 0 · 번호 가족 ASA-NEW 150 · API 60

## 요구사항

| 요구 | 축 | 전제 | 조작 | 결과 | 출처 | tcId | 작성 시점 |
|------|----|------|------|------|------|------|----------|
| 1 | 경계 | 가입하지 않은 새 아이디다 | 아이디를 3자로 적어 가입한다 | 아이디를 3자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다 | ASA-REQ-001 | ASA-FN-002 | 2026-11-03 |
| 2 | 경계 | 가입하지 않은 새 아이디다 | 아이디를 4자로 적어 가입한다 | 아이디를 4자로 적어 가입하면 「accountId」가 돌아온다 | ASA-REQ-001 | ASA-FN-002 | 2026-11-03 |
| 3 | 경계 | 가입하지 않은 새 아이디다 | 아이디를 16자로 적어 가입한다 | 아이디를 16자로 적어 가입하면 「accountId」가 돌아온다 | ASA-REQ-001 | ASA-FN-002 | 2026-11-03 |
| 4 | 경계 | 가입하지 않은 새 아이디다 | 아이디를 17자로 적어 가입한다 | 아이디를 17자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다 | ASA-REQ-001 | ASA-FN-002 | 2026-11-03 |
| 5 | 예외 | 가입하지 않은 새 아이디다 | 아이디에 영문 대문자를 넣어 가입한다 | 아이디에 영문 대문자를 넣어 가입하면 400 「VALIDATION_FAILED」로 막힌다 | ASA-REQ-002 | ASA-FN-006 | 2026-11-03 |
| 6 | 경계 | 가입하지 않은 새 아이디다 | 비밀번호를 5자로 적어 가입한다 | 비밀번호를 5자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다 | ASA-REQ-003 | ASA-FN-008 | 2026-11-03 |
| 7 | 경계 | 가입하지 않은 새 아이디다 | 비밀번호를 6자로 적어 가입한다 | 비밀번호를 6자로 적어 가입하면 「accountId」가 돌아온다 | ASA-REQ-003 | ASA-FN-008 | 2026-11-03 |
| 8 | 경계 | 가입하지 않은 새 아이디다 | 비밀번호를 64자로 적어 가입한다 | 비밀번호를 64자로 적어 가입하면 「accountId」가 돌아온다 | ASA-REQ-003 | ASA-FN-008 | 2026-11-03 |
| 9 | 경계 | 가입하지 않은 새 아이디다 | 비밀번호를 65자로 적어 가입한다 | 비밀번호를 65자로 적어 가입하면 400 「VALIDATION_FAILED」로 막힌다 | ASA-REQ-003 | ASA-FN-008 | 2026-11-03 |
| 10 | 정상 | 가입하지 않은 새 아이디다 | 새 아이디와 비밀번호로 가입한다 | 새 아이디로 가입하면 응답 코드가 기대값과 같다 | ASA-REQ-004 · API POST /auth/signup 200 · 보류 — 가입 응답 코드 자료 어긋남 | ASA-FN-631 | 2026-11-03 |
| 11 | 예외 | 가입한 아이디가 하나 있다 | 같은 아이디로 다시 가입한다 | 이미 있는 아이디로 다시 가입하면 409 「USERNAME_TAKEN」으로 막힌다 | ASA-REQ-005 | ASA-FN-015 | 2026-11-03 |
| 12 | 정상 | 가입한 아이디가 하나 있다 | 가입한 아이디와 비밀번호로 로그인한다 | 맞는 아이디와 비밀번호로 로그인하면 200 과 「accessToken」이 돌아온다 | ASA-REQ-006 · API POST /auth/login 200 | ASA-FN-016 | 2026-11-03 |
| 13 | 예외 | 가입하지 않은 아이디다 | 가입하지 않은 아이디로 로그인한다 | 가입하지 않은 아이디로 로그인하면 401 「INVALID_CREDENTIALS」로 막힌다 | ASA-REQ-007 | ASA-FN-021 | 2026-11-03 |
| 14 | 예외 | 가입한 아이디가 하나 있다 | 가입한 아이디에 틀린 비밀번호로 로그인한다 | 틀린 비밀번호로 로그인하면 401 「INVALID_CREDENTIALS」로 막힌다 | ASA-REQ-007 | ASA-FN-021 | 2026-11-03 |
| 15 | 정상 | 로그인해 받은 리프레시 토큰이 있다 | 리프레시 토큰으로 갱신한다 | 리프레시 토큰으로 갱신하면 200 과 새 「refreshToken」이 돌아온다 | ASA-REQ-008 · API POST /auth/refresh 200 | ASA-FN-022 | 2026-11-03 |
| 16 | 정상 | 한 번 갱신해 쓴 리프레시 토큰이 있다 | 이미 쓴 리프레시 토큰으로 다시 갱신한다 | 이미 쓴 리프레시 토큰으로 다시 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다 | ASA-REQ-009 | ASA-FN-025 | 2026-11-03 |
| 17 | 예외 | 받은 적 없는 리프레시 토큰이다 | 받은 적 없는 글자를 리프레시 토큰으로 보낸다 | 받은 적 없는 리프레시 토큰으로 갱신하면 401 「INVALID_REFRESH_TOKEN」으로 막힌다 | ASA-REQ-010 | ASA-FN-030 | 2026-11-03 |
| 18 | 정상 | 가입한 아이디가 하나 있다 | 로그인해 「expiresInSeconds」를 읽는다 | 로그인하면 「expiresInSeconds」가 1800(30분)이다 | ASA-REQ-011 | ASA-FN-031 | 2026-11-03 |
| 19 | 예외 | 가입하지 않은 아이디다 | 가입하지 않은 아이디로 로그인해 오류 응답을 읽는다 | 로그인이 막히면 오류 응답의 칸이 「code」 · 「message」 둘이다 | ASA-REQ-013 | ASA-FN-039 | 2026-11-03 |
| 20 | 예외 | 가입하지 않은 새 아이디다 | 아이디에 빈칸을 넣어 가입한다 | 아이디에 빈칸을 넣어 가입하면 400 「VALIDATION_FAILED」다 | ASA-REQ-014 | ASA-FN-042 | 2026-11-03 |
| 21 | 정상 | 가입한 아이디가 하나 있다 | 로그인해 응답 칸 이름을 읽는다 | 로그인하면 응답 칸 이름이 「accessToken」 · 「expiresInSeconds」 · 「refreshToken」이다 | ASA-REQ-015 | ASA-FN-043 | 2026-11-03 |
| 22 | 예외 | 토큰이 없다 | 토큰 없이 GET /bots 요청을 보낸다 | 토큰 없이 GET /bots 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 23 | 예외 | 토큰이 없다 | 토큰 없이 POST /enhance 요청을 보낸다 | 토큰 없이 POST /enhance 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 24 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/gold 요청을 보낸다 | 토큰 없이 POST /gm/gold 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 25 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/item 요청을 보낸다 | 토큰 없이 POST /gm/item 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 26 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/level 요청을 보낸다 | 토큰 없이 POST /gm/level 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 27 | 예외 | 토큰이 없다 | 토큰 없이 POST /shop/buy 요청을 보낸다 | 토큰 없이 POST /shop/buy 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 28 | 예외 | 토큰이 없다 | 토큰 없이 GET /gm/config 요청을 보낸다 | 토큰 없이 GET /gm/config 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 29 | 예외 | 토큰이 없다 | 토큰 없이 POST /shop/sell 요청을 보낸다 | 토큰 없이 POST /shop/sell 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 30 | 예외 | 토큰이 없다 | 토큰 없이 GET /characters 요청을 보낸다 | 토큰 없이 GET /characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 31 | 예외 | 토큰이 없다 | 토큰 없이 POST /characters 요청을 보낸다 | 토큰 없이 POST /characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-051 | 2026-11-03 |
| 32 | 예외 | 토큰이 없다 | 토큰 없이 GET /shop/items 요청을 보낸다 | 토큰 없이 GET /shop/items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 33 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/alignment 요청을 보낸다 | 토큰 없이 POST /gm/alignment 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 34 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/bot/reset 요청을 보낸다 | 토큰 없이 POST /gm/bot/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 35 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/drop-rate 요청을 보낸다 | 토큰 없이 POST /gm/drop-rate 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 36 | 예외 | 토큰이 없다 | 토큰 없이 GET /world/spawns 요청을 보낸다 | 토큰 없이 GET /world/spawns 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 37 | 예외 | 토큰이 없다 | 토큰 없이 GET /characters/1 요청을 보낸다 | 토큰 없이 GET /characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 38 | 예외 | 토큰이 없다 | 토큰 없이 DELETE /characters/1 요청을 보낸다 | 토큰 없이 DELETE /characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 39 | 예외 | 토큰이 없다 | 토큰 없이 POST /combat/bot-kill 요청을 보낸다 | 토큰 없이 POST /combat/bot-kill 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 40 | 예외 | 토큰이 없다 | 토큰 없이 GET /currency/ledger 요청을 보낸다 | 토큰 없이 GET /currency/ledger 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 41 | 예외 | 토큰이 없다 | 토큰 없이 POST /gm/enhance-rate 요청을 보낸다 | 토큰 없이 POST /gm/enhance-rate 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-632 | 2026-11-03 |
| 42 | 예외 | 토큰이 없다 | 토큰 없이 POST /combat/pk-attack 요청을 보낸다 | 토큰 없이 POST /combat/pk-attack 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 43 | 예외 | 토큰이 없다 | 토큰 없이 GET /world/ground-items 요청을 보낸다 | 토큰 없이 GET /world/ground-items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 44 | 예외 | 토큰이 없다 | 토큰 없이 POST /combat/monster-kill 요청을 보낸다 | 토큰 없이 POST /combat/monster-kill 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 45 | 예외 | 토큰이 없다 | 토큰 없이 POST /combat/player-death 요청을 보낸다 | 토큰 없이 POST /combat/player-death 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 46 | 예외 | 토큰이 없다 | 토큰 없이 POST /characters/1/equip 요청을 보낸다 | 토큰 없이 POST /characters/1/equip 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 47 | 예외 | 토큰이 없다 | 토큰 없이 POST /characters/1/unequip 요청을 보낸다 | 토큰 없이 POST /characters/1/unequip 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 48 | 예외 | 토큰이 없다 | 토큰 없이 PUT /characters/1/position 요청을 보낸다 | 토큰 없이 PUT /characters/1/position 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 49 | 예외 | 토큰이 없다 | 토큰 없이 POST /characters/1/use-item 요청을 보낸다 | 토큰 없이 POST /characters/1/use-item 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 50 | 예외 | 토큰이 없다 | 토큰 없이 GET /characters/1/inventory 요청을 보낸다 | 토큰 없이 GET /characters/1/inventory 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 51 | 예외 | 토큰이 없다 | 토큰 없이 GET /characters/1/pk-history 요청을 보낸다 | 토큰 없이 GET /characters/1/pk-history 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-633 | 2026-11-03 |
| 52 | 예외 | 토큰이 없다 | 토큰 없이 POST /world/ground-items/1/pickup 요청을 보낸다 | 토큰 없이 POST /world/ground-items/1/pickup 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-017 | ASA-FN-634 | 2026-11-03 |
| 53 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/config 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/config 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 54 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/forced 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 55 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/forced 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 56 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 DELETE /admin/forced 요청을 보낸다 | 틀린 「X-Admin-Key」로 DELETE /admin/forced 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 57 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/spawns 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/spawns 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 58 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/cleanup 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/cleanup 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 59 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/accounts 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/accounts 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 60 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 61 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/pk-records 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/pk-records 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 62 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 PUT /admin/spawns/1 요청을 보낸다 | 틀린 「X-Admin-Key」로 PUT /admin/spawns/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-069 | 2026-11-03 |
| 63 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 DELETE /admin/spawns/1 요청을 보낸다 | 틀린 「X-Admin-Key」로 DELETE /admin/spawns/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 64 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/world/reset 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/world/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 65 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/spawns/reset 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/spawns/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 66 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/item-templates 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/item-templates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 67 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 68 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 PATCH /admin/characters/1 요청을 보낸다 | 틀린 「X-Admin-Key」로 PATCH /admin/characters/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 69 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 PUT /admin/config/drop-rates 요청을 보낸다 | 틀린 「X-Admin-Key」로 PUT /admin/config/drop-rates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 70 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 PUT /admin/config/enhance-rates 요청을 보낸다 | 틀린 「X-Admin-Key」로 PUT /admin/config/enhance-rates 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 71 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/characters/1/items 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/characters/1/items 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 72 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 POST /admin/characters/1/reset 요청을 보낸다 | 틀린 「X-Admin-Key」로 POST /admin/characters/1/reset 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-635 | 2026-11-03 |
| 73 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/ledger 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/ledger 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-636 | 2026-11-03 |
| 74 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/summary 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/summary 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-636 | 2026-11-03 |
| 75 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/inventory 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/inventory 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-636 | 2026-11-03 |
| 76 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 DELETE /admin/characters/1/items/1 요청을 보낸다 | 틀린 「X-Admin-Key」로 DELETE /admin/characters/1/items/1 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-636 | 2026-11-03 |
| 77 | 예외 | 「X-Admin-Key」가 틀렸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/enhance-history 요청을 보낸다 | 틀린 「X-Admin-Key」로 GET /admin/characters/1/enhance-history 요청을 보내면 401 「UNAUTHORIZED」로 막힌다 | ASA-REQ-023 | ASA-FN-636 | 2026-11-03 |
| 78 | 정상 | 대상 서버에 접근할 수 있다 | GET /backoffice 를 연다 | GET /backoffice 를 열면 200 과 HTML 화면이 돌아온다 | ASA-REQ-026 | ASA-FN-076 | 2026-11-03 |
| 79 | 정상 | 대상 서버에 접근할 수 있다 | GET /health 요청을 보낸다 | GET /health 요청을 보내면 200 이 돌아온다 | API GET /health 200 | ASA-FN-454 | 2026-11-03 |

## 제외

| 요구 | 종류 | 사유 |
|------|------|------|
| ASA-REQ-012 | 환경 한계 | 시계 넘기기 — 14일 뒤 만료를 보려면 서버 시계를 넘겨야 한다 |
| ASA-REQ-016 | 계정 미등록 | 플레이어 |
| ASA-REQ-018 | 계정 미등록 | 플레이어 |
| ASA-REQ-019 | 계정 미등록 | 플레이어 |
| ASA-REQ-020 | 계정 미등록 | 플레이어 |
| ASA-REQ-021 | 자료 없음 | QA 가 아닌 대상 서버가 이번 요청에 없다 — 대상 서버는 qa 하나다 |
| ASA-REQ-022 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-024 | 자료 없음 | QA 가 아닌 대상 서버가 이번 요청에 없다 — 대상 서버는 qa 하나다 |
| ASA-REQ-025 | 계정 미등록 | 어드민 |
| ASA-REQ-027 | 계정 미등록 | 플레이어 |
| ASA-REQ-028 | 계정 미등록 | 플레이어 |
| ASA-REQ-029 | 계정 미등록 | 플레이어 |
| ASA-REQ-030 | 계정 미등록 | 플레이어 |
| ASA-REQ-031 | 계정 미등록 | 플레이어 |
| ASA-REQ-032 | 계정 미등록 | 플레이어 |
| ASA-REQ-033 | 계정 미등록 | 플레이어 |
| ASA-REQ-034 | 계정 미등록 | 플레이어 |
| ASA-REQ-035 | 계정 미등록 | 플레이어 |
| ASA-REQ-036 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-037 | 계정 미등록 | 플레이어 |
| ASA-REQ-038 | 계정 미등록 | 플레이어 |
| ASA-REQ-039 | 계정 미등록 | 플레이어 |
| ASA-REQ-040 | 계정 미등록 | 플레이어 |
| ASA-REQ-041 | 계정 미등록 | 플레이어 |
| ASA-REQ-042 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-043 | 계정 미등록 | 플레이어 |
| ASA-REQ-044 | 계정 미등록 | 플레이어 |
| ASA-REQ-045 | 계정 미등록 | 플레이어 |
| ASA-REQ-046 | 계정 미등록 | 플레이어 |
| ASA-REQ-047 | 계정 미등록 | 플레이어 |
| ASA-REQ-048 | 계정 미등록 | 플레이어 |
| ASA-REQ-049 | 계정 미등록 | 플레이어 |
| ASA-REQ-050 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-051 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-052 | 계정 미등록 | 플레이어 |
| ASA-REQ-053 | 계정 미등록 | 플레이어 |
| ASA-REQ-054 | 계정 미등록 | 플레이어 |
| ASA-REQ-055 | 계정 미등록 | 플레이어 |
| ASA-REQ-056 | 계정 미등록 | 플레이어 |
| ASA-REQ-057 | 계정 미등록 | 플레이어 |
| ASA-REQ-058 | 계정 미등록 | 플레이어 |
| ASA-REQ-059 | 계정 미등록 | 플레이어 |
| ASA-REQ-060 | 계정 미등록 | 플레이어 |
| ASA-REQ-061 | 계정 미등록 | 플레이어 |
| ASA-REQ-062 | 계정 미등록 | 플레이어 |
| ASA-REQ-063 | 계정 미등록 | 플레이어 |
| ASA-REQ-064 | 계정 미등록 | 플레이어 |
| ASA-REQ-065 | 계정 미등록 | 플레이어 |
| ASA-REQ-066 | 계정 미등록 | 플레이어 |
| ASA-REQ-067 | 계정 미등록 | 플레이어 |
| ASA-REQ-068 | 계정 미등록 | 플레이어 |
| ASA-REQ-069 | 계정 미등록 | 플레이어 |
| ASA-REQ-070 | 계정 미등록 | 플레이어 |
| ASA-REQ-071 | 계정 미등록 | 플레이어 |
| ASA-REQ-072 | 계정 미등록 | 플레이어 |
| ASA-REQ-073 | 계정 미등록 | 플레이어 |
| ASA-REQ-074 | 계정 미등록 | 플레이어 |
| ASA-REQ-075 | 계정 미등록 | 플레이어 |
| ASA-REQ-076 | 계정 미등록 | 플레이어 |
| ASA-REQ-077 | 계정 미등록 | 플레이어 |
| ASA-REQ-078 | 계정 미등록 | 플레이어 |
| ASA-REQ-079 | 계정 미등록 | 플레이어 |
| ASA-REQ-080 | 계정 미등록 | 플레이어 |
| ASA-REQ-081 | 계정 미등록 | 플레이어 |
| ASA-REQ-082 | 계정 미등록 | 플레이어 |
| ASA-REQ-083 | 계정 미등록 | 플레이어 |
| ASA-REQ-084 | 계정 미등록 | 플레이어 |
| ASA-REQ-085 | 계정 미등록 | 플레이어 |
| ASA-REQ-086 | 계정 미등록 | 플레이어 |
| ASA-REQ-087 | 계정 미등록 | 플레이어 |
| ASA-REQ-088 | 계정 미등록 | 플레이어 |
| ASA-REQ-089 | 계정 미등록 | 플레이어 |
| ASA-REQ-090 | 계정 미등록 | 플레이어 |
| ASA-REQ-091 | 계정 미등록 | 플레이어 |
| ASA-REQ-092 | 계정 미등록 | 플레이어 |
| ASA-REQ-093 | 계정 미등록 | 플레이어 |
| ASA-REQ-094 | 계정 미등록 | 플레이어 |
| ASA-REQ-095 | 계정 미등록 | 플레이어 |
| ASA-REQ-096 | 계정 미등록 | 플레이어 |
| ASA-REQ-097 | 계정 미등록 | 플레이어 |
| ASA-REQ-098 | 계정 미등록 | 플레이어 |
| ASA-REQ-099 | 계정 미등록 | 플레이어 |
| ASA-REQ-100 | 계정 미등록 | 플레이어 |
| ASA-REQ-101 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-102 | 계정 미등록 | 플레이어 |
| ASA-REQ-103 | 계정 미등록 | 플레이어 |
| ASA-REQ-104 | 계정 미등록 | 플레이어 |
| ASA-REQ-105 | 계정 미등록 | 플레이어 |
| ASA-REQ-106 | 계정 미등록 | 플레이어 |
| ASA-REQ-107 | 계정 미등록 | 플레이어 |
| ASA-REQ-108 | 계정 미등록 | 플레이어 |
| ASA-REQ-109 | 계정 미등록 | 플레이어 |
| ASA-REQ-110 | 계정 미등록 | 플레이어 |
| ASA-REQ-111 | 계정 미등록 | 플레이어 |
| ASA-REQ-112 | 계정 미등록 | 플레이어 |
| ASA-REQ-113 | 계정 미등록 | 플레이어 |
| ASA-REQ-114 | 계정 미등록 | 플레이어 |
| ASA-REQ-115 | 환경 한계 | 게임 서버 다시 켜기 — 서버를 다시 켜야 확인되는 규칙이다 |
| ASA-REQ-116 | 계정 미등록 | 플레이어 |
| ASA-REQ-117 | 계정 미등록 | 플레이어 |
| ASA-REQ-118 | 계정 미등록 | 플레이어 |
| ASA-REQ-119 | 계정 미등록 | 플레이어 |
| ASA-REQ-120 | 계정 미등록 | 플레이어 |
| ASA-REQ-121 | 계정 미등록 | 플레이어 |
| ASA-REQ-122 | 계정 미등록 | 플레이어 |
| ASA-REQ-123 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-124 | 계정 미등록 | 플레이어 |
| ASA-REQ-125 | 계정 미등록 | 플레이어 |
| ASA-REQ-126 | 계정 미등록 | 플레이어 |
| ASA-REQ-127 | 계정 미등록 | 플레이어 |
| ASA-REQ-128 | 계정 미등록 | 플레이어 |
| ASA-REQ-129 | 계정 미등록 | 플레이어 |
| ASA-REQ-130 | 계정 미등록 | 플레이어 |
| ASA-REQ-131 | 계정 미등록 | 플레이어 |
| ASA-REQ-132 | 계정 미등록 | 플레이어 |
| ASA-REQ-133 | 계정 미등록 | 플레이어 |
| ASA-REQ-134 | 계정 미등록 | 플레이어 |
| ASA-REQ-135 | 계정 미등록 | 플레이어 |
| ASA-REQ-136 | 계정 미등록 | 플레이어 |
| ASA-REQ-137 | 자료 없음 | 게임 클라이언트 화면이 이번 요청에 없다 — API 로는 볼 수 없는 규칙이다 |
| ASA-REQ-138 | 계정 미등록 | 어드민 |
| ASA-REQ-139 | 계정 미등록 | 어드민 |
| ASA-REQ-140 | 계정 미등록 | 어드민 |
| ASA-REQ-141 | 계정 미등록 | 어드민 |
| ASA-REQ-142 | 계정 미등록 | 어드민 |
| ASA-REQ-143 | 계정 미등록 | 어드민 |
| ASA-REQ-144 | 계정 미등록 | 어드민 |
| ASA-REQ-145 | 계정 미등록 | 어드민 |
| ASA-REQ-146 | 계정 미등록 | 어드민 |
| ASA-REQ-147 | 계정 미등록 | 어드민 |
| ASA-REQ-148 | 계정 미등록 | 어드민 |
| ASA-REQ-149 | 환경 한계 | 게임 서버 다시 켜기 — 서버를 다시 켜야 확인되는 규칙이다 |
| ASA-REQ-150 | 환경 한계 | 게임 서버 다시 켜기 — 서버를 다시 켜야 확인되는 규칙이다 |
| API GET /bots 200 | 계정 미등록 | 플레이어 |
| API POST /enhance 200 | 계정 미등록 | 플레이어 |
| API POST /gm/gold 200 | 계정 미등록 | 플레이어 |
| API POST /gm/item 200 | 계정 미등록 | 플레이어 |
| API POST /gm/level 200 | 계정 미등록 | 플레이어 |
| API POST /shop/buy 200 | 계정 미등록 | 플레이어 |
| API GET /gm/config 200 | 계정 미등록 | 플레이어 |
| API POST /shop/sell 200 | 계정 미등록 | 플레이어 |
| API GET /characters 200 | 계정 미등록 | 플레이어 |
| API POST /characters 200 | 계정 미등록 | 플레이어 |
| API GET /shop/items 200 | 계정 미등록 | 플레이어 |
| API GET /admin/config 200 | 계정 미등록 | 어드민 |
| API GET /admin/forced 200 | 계정 미등록 | 어드민 |
| API POST /admin/forced 200 | 계정 미등록 | 어드민 |
| API DELETE /admin/forced 200 | 계정 미등록 | 어드민 |
| API GET /admin/spawns 200 | 계정 미등록 | 어드민 |
| API POST /gm/alignment 200 | 계정 미등록 | 플레이어 |
| API POST /gm/bot/reset 200 | 계정 미등록 | 플레이어 |
| API POST /gm/drop-rate 200 | 계정 미등록 | 플레이어 |
| API GET /world/spawns 200 | 계정 미등록 | 플레이어 |
| API POST /admin/cleanup 200 | 계정 미등록 | 어드민 |
| API GET /admin/accounts 200 | 계정 미등록 | 어드민 |
| API GET /characters/{id} 200 | 계정 미등록 | 플레이어 |
| API DELETE /characters/{id} 200 | 계정 미등록 | 플레이어 |
| API POST /combat/bot-kill 200 | 계정 미등록 | 플레이어 |
| API GET /currency/ledger 200 | 계정 미등록 | 플레이어 |
| API POST /gm/enhance-rate 200 | 계정 미등록 | 플레이어 |
| API GET /admin/characters 200 | 계정 미등록 | 어드민 |
| API GET /admin/pk-records 200 | 계정 미등록 | 어드민 |
| API POST /combat/pk-attack 200 | 계정 미등록 | 플레이어 |
| API PUT /admin/spawns/{id} 200 | 계정 미등록 | 어드민 |
| API DELETE /admin/spawns/{id} 200 | 계정 미등록 | 어드민 |
| API POST /admin/world/reset 200 | 계정 미등록 | 어드민 |
| API POST /admin/spawns/reset 200 | 계정 미등록 | 어드민 |
| API GET /world/ground-items 200 | 계정 미등록 | 플레이어 |
| API POST /combat/monster-kill 200 | 계정 미등록 | 플레이어 |
| API POST /combat/player-death 200 | 계정 미등록 | 플레이어 |
| API GET /admin/item-templates 200 | 계정 미등록 | 어드민 |
| API GET /admin/characters/{id} 200 | 계정 미등록 | 어드민 |
| API PATCH /admin/characters/{id} 200 | 계정 미등록 | 어드민 |
| API POST /characters/{id}/equip 200 | 계정 미등록 | 플레이어 |
| API PUT /admin/config/drop-rates 200 | 계정 미등록 | 어드민 |
| API POST /characters/{id}/unequip 200 | 계정 미등록 | 플레이어 |
| API PUT /characters/{id}/position 200 | 계정 미등록 | 플레이어 |
| API POST /characters/{id}/use-item 200 | 계정 미등록 | 플레이어 |
| API GET /characters/{id}/inventory 200 | 계정 미등록 | 플레이어 |
| API PUT /admin/config/enhance-rates 200 | 계정 미등록 | 어드민 |
| API GET /characters/{id}/pk-history 200 | 계정 미등록 | 플레이어 |
| API POST /admin/characters/{id}/items 200 | 계정 미등록 | 어드민 |
| API POST /admin/characters/{id}/reset 200 | 계정 미등록 | 어드민 |
| API GET /admin/characters/{id}/ledger 200 | 계정 미등록 | 어드민 |
| API GET /admin/characters/{id}/summary 200 | 계정 미등록 | 어드민 |
| API POST /world/ground-items/{id}/pickup 200 | 계정 미등록 | 플레이어 |
| API GET /admin/characters/{id}/inventory 200 | 계정 미등록 | 어드민 |
| API DELETE /admin/characters/{id}/items/{itemId} 200 | 계정 미등록 | 어드민 |
| API GET /admin/characters/{id}/enhance-history 200 | 계정 미등록 | 어드민 |
