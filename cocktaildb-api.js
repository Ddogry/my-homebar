/* TheCocktailDB 공식 API 검색 모듈 (feature/data-recipes 담당: 태윤)
 *
 * - DOM을 전혀 건드리지 않는 "데이터 전용" 모듈이다. UI(index.html, style.css)와 충돌하지 않는다.
 * - 다한(핵심 로직)이 script.js 에서 가져다 쓰도록 만들었다. 사용법은 tools/README.md 참고.
 * - API 응답을 recipes.json 과 똑같은 9개 키 객체로 바꿔 돌려주므로,
 *   script.js 의 기존 검색·필터 코드를 그대로 쓸 수 있다.
 * - 데이터 출처 표시: TheCocktailDB (https://www.thecocktaildb.com)
 */
(function (root) {
  const API_BASE = "https://www.thecocktaildb.com/api/json/v1/1"; // 무료 테스트 키 "1" (개발·교육용)
  const LETTERS = "abcdefghijklmnopqrstuvwxyz0123456789";
  const ALLOWED_CATEGORIES = ["Whisky", "Gin", "Rum", "Vodka", "Liqueur"];

  const ING_KO = {
  "bourbon": "버번 위스키",
  "whiskey": "위스키",
  "whisky": "위스키",
  "scotch": "스카치 위스키",
  "blended whiskey": "위스키",
  "blended scotch": "스카치 위스키",
  "rye whiskey": "라이 위스키",
  "irish whiskey": "아이리시 위스키",
  "gin": "진",
  "vodka": "보드카",
  "light rum": "화이트 럼",
  "white rum": "화이트 럼",
  "dark rum": "다크 럼",
  "rum": "럼",
  "tequila": "데킬라",
  "brandy": "브랜디",
  "triple sec": "트리플 섹",
  "cointreau": "쿠앵트로",
  "campari": "캄파리",
  "aperol": "아페롤",
  "sweet vermouth": "스위트 베르무트",
  "dry vermouth": "드라이 베르무트",
  "kahlua": "커피 리큐르",
  "coffee liqueur": "커피 리큐르",
  "amaretto": "아마레또",
  "baileys irish cream": "베일리스",
  "prosecco": "프로세코",
  "champagne": "샴페인",
  "angostura bitters": "앙고스투라 비터스",
  "lime": "라임",
  "lime juice": "라임",
  "lemon": "레몬",
  "lemon juice": "레몬주스",
  "orange juice": "오렌지주스",
  "cranberry juice": "크랜베리주스",
  "pineapple juice": "파인애플주스",
  "tonic water": "토닉워터",
  "soda water": "탄산수",
  "club soda": "탄산수",
  "ginger beer": "진저비어",
  "ginger ale": "진저에일",
  "cola": "콜라",
  "coca-cola": "콜라",
  "sugar": "설탕",
  "sugar syrup": "심플 시럽",
  "simple syrup": "심플 시럽",
  "mint": "민트",
  "milk": "우유",
  "light cream": "크림",
  "heavy cream": "크림",
  "egg white": "달걀 흰자",
  "grenadine": "그레나딘",
  "salt": "소금",
  "ice": "얼음",
  "water": "물"
};
  const NAME_KO = {
  "old fashioned": "올드 패션드",
  "whiskey sour": "위스키 사워",
  "manhattan": "맨해튼",
  "negroni": "네그로니",
  "gin tonic": "진토닉",
  "martini": "마티니",
  "mojito": "모히토",
  "daiquiri": "다이키리",
  "moscow mule": "모스코 뮬",
  "white russian": "화이트 러시안",
  "black russian": "블랙 러시안",
  "margarita": "마가리타",
  "cosmopolitan": "코스모폴리탄",
  "bloody mary": "블러디 메리",
  "pina colada": "피나콜라다",
  "tom collins": "톰 콜린스",
  "sidecar": "사이드카",
  "gimlet": "김렛",
  "mai tai": "마이타이",
  "cuba libre": "쿠바 리브레",
  "caipirinha": "카이피리냐",
  "espresso martini": "에스프레소 마티니",
  "mint julep": "민트 줄렙",
  "rusty nail": "러스티 네일",
  "godfather": "갓파더",
  "john collins": "존 콜린스",
  "boulevardier": "불바디에"
};
  const ABV_TABLE = [
  [
    "angostura",
    0
  ],
  [
    "sweet vermouth",
    16
  ],
  [
    "dry vermouth",
    16
  ],
  [
    "vermouth",
    16
  ],
  [
    "triple sec",
    30
  ],
  [
    "cointreau",
    40
  ],
  [
    "campari",
    25
  ],
  [
    "aperol",
    11
  ],
  [
    "kahlua",
    20
  ],
  [
    "coffee liqueur",
    20
  ],
  [
    "amaretto",
    28
  ],
  [
    "baileys",
    17
  ],
  [
    "liqueur",
    25
  ],
  [
    "schnapps",
    20
  ],
  [
    "curacao",
    30
  ],
  [
    "prosecco",
    11
  ],
  [
    "champagne",
    12
  ],
  [
    "wine",
    12
  ],
  [
    "beer",
    5
  ],
  [
    "bourbon",
    40
  ],
  [
    "whisk",
    40
  ],
  [
    "scotch",
    40
  ],
  [
    "rye",
    40
  ],
  [
    "gin",
    40
  ],
  [
    "vodka",
    40
  ],
  [
    "rum",
    40
  ],
  [
    "tequila",
    40
  ],
  [
    "brandy",
    40
  ],
  [
    "cognac",
    40
  ],
  [
    "mezcal",
    40
  ]
];
  const UNIT_ML = [
  [
    "oz",
    29.57
  ],
  [
    "cl",
    10
  ],
  [
    "ml",
    1
  ],
  [
    "tsp",
    5
  ],
  [
    "teaspoon",
    5
  ],
  [
    "tbsp",
    15
  ],
  [
    "tblsp",
    15
  ],
  [
    "tablespoon",
    15
  ],
  [
    "dash",
    0.9
  ],
  [
    "shot",
    44
  ],
  [
    "jigger",
    44
  ],
  [
    "part",
    30
  ],
  [
    "cup",
    240
  ],
  [
    "splash",
    5
  ],
  [
    "drop",
    0.05
  ]
];
  const CATEGORY_RULES = [
  [
    "Whisky",
    [
      "bourbon",
      "whisk",
      "scotch",
      "rye"
    ]
  ],
  [
    "Gin",
    [
      "gin"
    ]
  ],
  [
    "Rum",
    [
      "rum"
    ]
  ],
  [
    "Vodka",
    [
      "vodka"
    ]
  ],
  [
    "Liqueur",
    [
      "liqueur",
      "kahlua",
      "amaretto",
      "baileys",
      "cointreau",
      "triple sec",
      "campari",
      "aperol",
      "curacao",
      "schnapps",
      "chartreuse"
    ]
  ]
];

  function abvOf(ing) {
    const k = ing.toLowerCase();
    const hit = ABV_TABLE.find(([key]) => k.includes(key));
    return hit ? hit[1] : 0;
  }

  function toMl(measure) {
    if (!measure) return 0;
    const s = measure.toLowerCase();
    const m = s.match(/(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)/);
    let qty = null;
    if (m) {
      qty = m[1].split(/\s+/).reduce((sum, x) => {
        const [a, b] = x.split("/");
        return sum + (b ? parseFloat(a) / parseFloat(b) : parseFloat(a));
      }, 0);
    }
    for (const [u, ml] of UNIT_ML) {
      if (new RegExp("\\b" + u + "(?:s|es)?\\b").test(s)) return (qty ?? 1) * ml;
    }
    if (s.includes("top")) return 60;
    return (qty || 0) * 15;
  }

  function estimateAbv(pairs) {
    const total = pairs.reduce((s, [, ml]) => s + ml, 0);
    if (total <= 0) return 0;
    const alc = pairs.reduce((s, [n, ml]) => s + ml * abvOf(n), 0);
    return Math.round(alc / (total * 1.15)); // 희석 15% 가정, 근사치
  }

  function guessCategory(pairs) {
    let best = null, bestMl = 0;
    for (const [n, ml] of pairs) {
      if (abvOf(n) >= 10 && ml > bestMl) { best = n.toLowerCase(); bestMl = ml; }
    }
    if (!best) return null;
    const rule = CATEGORY_RULES.find(([, kws]) => kws.some((k) => best.includes(k)));
    return rule ? rule[0] : "Other";
  }

  /** API 칵테일 1개 -> recipes.json 스키마 객체. 대상이 아니면 null. */
  function apiToRecipe(dk, options = {}) {
    const onlyFullyMapped = options.onlyFullyMapped ?? true;
    if (dk.strAlcoholic !== "Alcoholic") return null;
    const pairs = [], ingredients = [], lines = [];
    let allMapped = true;
    for (let i = 1; i <= 15; i++) {
      const ing = (dk["strIngredient" + i] || "").trim();
      if (!ing) continue;
      const meas = (dk["strMeasure" + i] || "").trim();
      pairs.push([ing, toMl(meas)]);
      let ko = ING_KO[ing.toLowerCase()];
      if (!ko) { allMapped = false; ko = ing; }
      if (!ingredients.includes(ko)) ingredients.push(ko);
      lines.push((meas + " " + ko).trim());
    }
    if (onlyFullyMapped && !allMapped) return null;
    const category = guessCategory(pairs);
    if (!ALLOWED_CATEGORIES.includes(category)) return null;
    const name = (dk.strDrink || "").trim();
    const method = (dk.strInstructions || "").trim();
    return {
      id: Number(dk.idDrink),
      name,
      koreanName: NAME_KO[name.toLowerCase()] || name,
      category,
      abv: estimateAbv(pairs),
      image: dk.strDrinkThumb ? dk.strDrinkThumb + "/medium" : "",
      ingredients,
      description: [dk.strCategory || "칵테일", dk.strGlass].filter(Boolean).join(" · "),
      recipe: "재료: " + lines.join(", ") + "." + (method ? " 방법: " + method : ""),
    };
  }

  /** 이름으로 검색(영문). 예: searchByName("margarita") -> recipes.json 형식 배열 */
  async function searchByName(name, options = {}) {
    const res = await fetch(API_BASE + "/search.php?s=" + encodeURIComponent(name));
    if (!res.ok) throw new Error("API HTTP " + res.status);
    const drinks = (await res.json()).drinks || [];
    return drinks.map((d) => apiToRecipe(d, options)).filter(Boolean);
  }

  /** 첫 글자(a~z, 0~9)별로 전부 받아서 합친다. 일부 글자가 실패해도 나머지는 사용한다. */
  async function fetchAllRecipes(options = {}) {
    const results = await Promise.allSettled(
      [...LETTERS].map(async (ch) => {
        const res = await fetch(API_BASE + "/search.php?f=" + ch);
        if (!res.ok) throw new Error("HTTP " + res.status);
        return (await res.json()).drinks || [];
      })
    );
    const ok = results.filter((r) => r.status === "fulfilled");
    if (ok.length === 0) throw new Error("API 전체 실패");
    const byId = new Map();
    ok.forEach((r) => r.value.forEach((dk) => byId.set(dk.idDrink, dk)));
    return [...byId.values()].map((d) => apiToRecipe(d, options)).filter(Boolean);
  }

  /** recipes.json(local) 우선, 이름·id 중복은 API 쪽을 버리고 합친다. */
  function mergeRecipes(local, api) {
    const names = new Set(local.map((r) => r.name.toLowerCase()));
    const ids = new Set(local.map((r) => r.id));
    const extra = api
      .filter((r) => !names.has(r.name.toLowerCase()) && !ids.has(r.id))
      .sort((a, b) => a.name.localeCompare(b.name));
    return [...local, ...extra];
  }

  const api = { API_BASE, apiToRecipe, searchByName, fetchAllRecipes, mergeRecipes };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else root.CocktailAPI = api;
})(typeof window !== "undefined" ? window : globalThis);
