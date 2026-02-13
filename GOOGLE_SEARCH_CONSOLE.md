# Google Search Console 설정 가이드

## 📊 Google Search Console이란?

Google Search Console은 웹사이트가 Google 검색 결과에 어떻게 표시되는지 모니터링하고 최적화할 수 있는 무료 도구입니다.

## 🚀 설정 단계

### 1단계: Google Search Console 접속

1. [Google Search Console](https://search.google.com/search-console) 접속
2. Google 계정으로 로그인
3. **속성 추가** 클릭

### 2단계: 속성 유형 선택

**도메인** 방식 선택 (권장):
- 입력: `amazonreach.com`
- 모든 서브도메인과 프로토콜(http/https)을 자동으로 포함

**또는 URL 접두어** 방식:
- 입력: `https://amazonreach.com`
- 정확한 URL만 추적

### 3단계: 소유권 확인

#### 방법 1: DNS 레코드 (Cloudflare 사용시 권장)

1. Google이 제공하는 TXT 레코드 복사
2. Cloudflare Dashboard → DNS → Records
3. **Add record** 클릭
4. Type: `TXT`
5. Name: `@`
6. Content: Google이 제공한 TXT 레코드 값 붙여넣기
7. **Save** 클릭
8. Google Search Console로 돌아가서 **확인** 클릭

#### 방법 2: HTML 파일 업로드

1. Google이 제공하는 HTML 파일 다운로드
2. `frontend/` 폴더에 업로드
3. `https://amazonreach.com/google[코드].html` 접속 가능한지 확인
4. Google Search Console에서 **확인** 클릭

#### 방법 3: HTML 태그

1. Google이 제공하는 메타 태그 복사
2. `frontend/index.html`의 `<head>` 섹션에 추가:
```html
<meta name="google-site-verification" content="여기에_코드" />
```
3. 변경사항 커밋 및 배포
4. Google Search Console에서 **확인** 클릭

### 4단계: Sitemap 제출

소유권 확인 후:

1. Google Search Console → **Sitemaps** 메뉴
2. **새 사이트맵 추가** 입력란에 입력:
```
https://amazonreach.com/sitemap.xml
```
3. **제출** 클릭

**결과**: 
- 상태: "성공" 표시
- Google이 자동으로 사이트맵을 크롤링하고 색인 생성

### 5단계: 블로그 포스트 개별 색인 요청

#### 자동 색인 (권장)
Sitemap에 블로그 URL이 포함되어 있으면 자동으로 색인됩니다.

#### 수동 색인 (빠른 색인 원할 때)

1. Google Search Console → **URL 검사** (상단 검색창)
2. 블로그 URL 입력:
```
https://amazonreach.com/blog/post-1.html
https://amazonreach.com/blog/post-2.html
https://amazonreach.com/blog/post-3.html
```
3. **색인 생성 요청** 클릭
4. 각 블로그 포스트마다 반복

**참고**: 하루에 제출할 수 있는 URL 수에 제한이 있을 수 있습니다.

## 📈 모니터링 및 최적화

### 색인 상태 확인

1. **색인 생성** → **페이지** 메뉴
2. 색인된 페이지 수 확인
3. 색인되지 않은 페이지가 있다면 이유 확인

### 검색 성능 확인

1. **실적** 메뉴
2. 다음 지표 확인:
   - **총 클릭수**: 사용자가 검색 결과에서 사이트를 클릭한 횟수
   - **총 노출수**: 검색 결과에 사이트가 표시된 횟수
   - **평균 CTR**: 클릭률 (클릭수/노출수)
   - **평균 게재순위**: 검색 결과에서의 평균 순위

### 검색어 분석

1. **실적** → **검색어** 탭
2. 어떤 키워드로 사용자가 유입되는지 확인
3. 높은 노출수지만 낮은 CTR인 키워드 → 제목/설명 개선 필요

## 🔧 블로그 자동 색인 설정

### Sitemap 자동 업데이트 확인

현재 `scripts/blog_manager.js`가 새 블로그 포스트를 `sitemap.xml`에 자동으로 추가합니다.

**확인 방법**:
```bash
cat frontend/sitemap.xml
```

블로그 URL이 포함되어 있는지 확인:
```xml
<url>
    <loc>https://amazonreach.com/blog/post-1.html</loc>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
</url>
```

### Google에 Sitemap 업데이트 알림

새 블로그 포스트가 추가될 때마다:

1. **자동** (권장): Google이 주기적으로 sitemap을 크롤링 (보통 며칠 소요)
2. **수동**: Google Search Console → Sitemaps → 사이트맵 URL 클릭 → **다시 제출**

## ✅ 체크리스트

- [ ] Google Search Console 속성 추가
- [ ] 소유권 확인 (DNS/HTML 파일/메타 태그)
- [ ] Sitemap 제출 (`sitemap.xml`)
- [ ] 기존 블로그 포스트 URL 검사 및 색인 요청
- [ ] 색인 상태 모니터링
- [ ] 검색 성능 데이터 확인

## 🎯 예상 결과

- **24-48시간 내**: 소유권 확인 및 sitemap 제출 완료
- **1-2주 내**: 주요 페이지 색인 생성
- **2-4주 내**: 검색 결과에 페이지 표시 시작
- **1-3개월 내**: 검색 순위 안정화 및 트래픽 증가

## 💡 추가 팁

### 구조화된 데이터 (Schema Markup)

블로그 포스트에 이미 Schema.org 마크업이 포함되어 있습니다:
```html
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "...",
  "datePublished": "...",
  "author": { "@type": "Organization", "name": "AmazonReach Team" }
}
</script>
```

이는 Google이 콘텐츠를 더 잘 이해하고 리치 결과(Rich Results)로 표시하는 데 도움이 됩니다.

### robots.txt 확인

`frontend/robots.txt` 파일이 블로그를 차단하지 않는지 확인:
```
User-agent: *
Allow: /
Sitemap: https://amazonreach.com/sitemap.xml
```

---

**참고**: Google Search Console 데이터는 실시간이 아니며 1-2일 지연될 수 있습니다.
