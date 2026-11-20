# My Homebar
https://ddogry.github.io/my-homebar/
## 프로젝트 소개
My Homebar는 웹 기반 홈바 프로젝트입니다.

## 사용 기술
- HTML
- CSS
- JavaScript

## 프로젝트 구조
- index.html : 웹페이지 구조
- style.css : 웹페이지 디자인
- script.js : 웹페이지 동작
- assets/ : 이미지 및 기타 리소스

## 실행 방법
1. 프로젝트 폴더를 엽니다.
2. index.html 파일을 브라우저에서 실행합니다.
# tools/ - 레시피 데이터 도구 (feature/data-recipes, 담당: 태윤)

이 폴더는 **사이트에 포함되지 않는** 데이터 작업용 도구입니다.
`index.html`, `style.css`, `script.js`, `assets/data/recipes.json` 은 건드리지 않았습니다.

## 파일

| 파일 | 용도 |
|---|---|
| `build_recipes.py` | TheCocktailDB 공식 API -> `assets/data/recipes.json` + `assets/images/` 생성 |
| `cocktaildb-api.js` | 브라우저에서 API를 직접 호출해 recipes.json 형식으로 바꿔 주는 모듈 (다한이 `script.js`에 연결) |

## 재료 이름은 한글로 통일

도구는 재료 이름을 한글(`"버번 위스키"`, `"진"`, `"라임"`)로 출력합니다.
내 술장 체크박스는 재료 이름을 글자 그대로 비교하므로, **기존 `recipes.json`의 영문 재료는 먼저 한글로 바꾼 뒤** 도구를 `--merge`로 실행해야 합니다. (영문/한글이 섞이면 같은 재료의 체크박스가 둘로 갈라짐)

## 1) 데이터 만들기 (build_recipes.py)

레포 최상위 폴더(`index.html`이 있는 곳)에서 실행합니다.

```bash
pip install requests
python tools/build_recipes.py --limit 5 --merge     # 먼저 5개만 시험
python tools/build_recipes.py --limit 60 --merge    # 기존 데이터에 이어붙이기
```

- `--merge`: 기존 `recipes.json`을 유지하고 새 항목만 추가 (같은 이름은 건너뜀, id는 이어서 부여)
- `--no-images`: 이미지 다운로드 생략
- `--include-unmapped`: 번역표에 없는 재료가 있어도 포함

실행이 끝나면 "번역 필요한 재료" 목록이 나옵니다. `ING_KO`(build_recipes.py와 cocktaildb-api.js 둘 다)에 한글 이름을 추가하고 다시 실행하면 더 많이 포함됩니다.

## 2) script.js 에서 API 쓰기 (다한용)

`index.html`에 `script.js`보다 먼저 한 줄을 추가합니다.

```html
<script src="tools/cocktaildb-api.js"></script>
<script src="script.js"></script>
```

`script.js` 에서의 사용 예:

```js
const local = await (await fetch("assets/data/recipes.json")).json();
render(local);                                   // 1) 로컬 먼저 즉시 표시

try {
  const api = await CocktailAPI.fetchAllRecipes(); // 2) API 호출 (36회 요청)
  state.recipes = CocktailAPI.mergeRecipes(local, api);
  render();
} catch (e) {
  console.error(e);                              // 3) 실패해도 로컬만으로 동작
}

// 이름 검색만 따로 할 때
const result = await CocktailAPI.searchByName("margarita");
```

## 데이터 규칙 (스키마 고정)

- 키 9개: `id, name, koreanName, category, abv, image, ingredients, description, recipe`
- `ingredients`에는 **재료 이름만, 한글로** (용량은 `recipe` 문장에)
- `category`는 `Whisky | Gin | Rum | Vodka | Liqueur`
- `image`는 `assets/images/파일명.jpg` (API로 불러온 항목은 이미지 URL)

## 알아둘 점

- `abv`는 API에 없어서 재료 비율로 추정한 **근사치**입니다.
- 국문명이 영문 그대로인 항목, 영어로 된 제조법은 팀에서 번역해 주세요.
- 무료 테스트 키 `1`은 개발·교육용입니다. 공개 배포는 프리미엄 키가 필요할 수 있습니다.
- 사이트 하단 등에 **데이터·이미지 출처: TheCocktailDB** 를 표시해 주세요. (UI 담당: 다정/도현)
