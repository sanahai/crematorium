# 전국 화장장 안내 서비스

전국 화장장의 **위치·운영시간·필요서류·예약 안내**를 한 곳에서 제공하고,
카카오톡으로 필요 서류 체크리스트를 공유할 수 있는 기능형 웹사이트입니다.

---

## 📁 프로젝트 구조

```
index.html      – 화장장 목록 / 지역 필터 / 검색
detail.html     – 화장장 상세 (서류·시간표·예약·사용료 탭)
admin.html      – 관리자 (화장장 CRUD)
css/style.css   – 전체 공통 스타일 (반응형)
js/main.js      – 목록 페이지 JS (검색, 필터, 카카오 공유)
js/detail.js    – 상세 페이지 JS (체크리스트, 탭, 카카오 공유)
js/admin.js     – 관리자 JS (추가/수정/삭제)
```

---

## ✅ 현재 구현된 기능

### 화장장 목록 (index.html)
- 전국 19개 화장장 데이터 수록 (서울·경기·부산·대전·대구·인천·광주·울산·세종·강원·충북·전북·전남·경북·경남·제주)
- 시도별 지역 필터 버튼
- 이름·지역·주소 실시간 검색
- 각 카드에서 **"카카오 공유" 빠른 버튼** 제공
- e하늘 장사정보시스템 외부 링크 연결

### 화장장 상세 (detail.html)
- 화장장 명칭·지역·주소·전화번호 표시
- **지도 보기** (카카오맵 링크)
- **공식 정보 링크** (각 시설 공식 홈페이지)
- 공지사항 배너
- **4개 탭**: 필요 서류 / 운영 시간표 / 예약 안내 / 사용료
- 사망 유형 선택 (병사·외인사·개장유골·외국인 국내사망)
- 서류별 **체크리스트** (클릭으로 체크/해제)
- **카카오톡 공유 모달**: 화장장 정보 + 서류 목록 전송

### 카카오톡 공유
- 카카오 SDK 초기화 시: `Kakao.Share.sendDefault()` 직접 발송
- SDK 미초기화 시: **클립보드 자동 복사 → 카카오톡 붙여넣기** 안내 (fallback)
- 공유 내용: 화장장명, 주소, 전화, 운영시간, 선택 사망유형별 서류 목록, 예약처

### 관리자 (admin.html)
- 화장장 목록 조회 (검색 포함)
- **새 화장장 추가** (폼 → POST)
- **기존 정보 수정** (폼 → PUT)
- **삭제** (확인 모달 → DELETE)
- 활성/비활성 상태 관리

---

## 🔗 API 엔드포인트

| 메서드 | URL | 설명 |
|--------|-----|------|
| GET | `tables/crematoriums?limit=200` | 전체 목록 조회 |
| GET | `tables/crematoriums/{id}` | 단건 조회 |
| POST | `tables/crematoriums` | 신규 추가 |
| PUT | `tables/crematoriums/{id}` | 수정 |
| DELETE | `tables/crematoriums/{id}` | 삭제 |

---

## 🗂️ 데이터 스키마 (crematoriums 테이블)

| 필드명 | 타입 | 설명 |
|--------|------|------|
| id | text | 고유 ID |
| name | text | 화장장 명칭 |
| region | text | 시도 |
| city | text | 시군구 |
| address | text | 주소 |
| phone | text | 전화번호 |
| operating_hours | text | 운영시간 요약 |
| schedule | rich_text | 회차별 시간표 (파이프 구분) |
| required_docs | rich_text | 필요 서류 목록 (줄바꿈 구분) |
| reservation_info | rich_text | 예약 안내 |
| fee_info | rich_text | 사용료 안내 |
| source_url | text | 공식 출처 URL |
| map_link | text | 지도 링크 |
| notice | rich_text | 공지사항 |
| is_active | bool | 목록 표시 여부 |

---

## 🚀 카카오 SDK 설정 (운영 배포 시)

```javascript
// js/detail.js 하단 수정
if (window.Kakao && !Kakao.isInitialized()) {
  Kakao.init('YOUR_KAKAO_JAVASCRIPT_KEY'); // 여기에 발급받은 키 입력
}
```

카카오 개발자 콘솔(https://developers.kakao.com)에서 앱 등록 후 JavaScript 키를 발급받아 입력하세요.

---

## ⚠️ 유의사항

- 본 서비스의 화장장 정보는 공식 홈페이지(e하늘 장사정보시스템 등)를 기반으로 구성되었습니다.
- 운영시간·요금·예약 정책은 각 시설별로 변경될 수 있으니, 반드시 [e하늘 장사정보시스템](https://www.15774129.go.kr)에서 최신 정보를 확인하세요.
- 관리자 페이지는 별도 인증 없이 접근 가능합니다. 운영 환경에서는 별도 인증 처리가 권장됩니다.

---

## 📌 향후 개선 권장 사항

- [ ] 카카오 JavaScript SDK 앱 키 등록 및 알림톡 연동
- [ ] 관리자 로그인/인증 기능
- [ ] 화장장 예약 현황 실시간 연동 (e하늘 공개 API)
- [ ] 추가 화장장 데이터 보강 (전국 약 60개소)
- [ ] 지도 API 연동 (카카오맵 지도 표시)
- [ ] 즐겨찾기 기능 (LocalStorage)
