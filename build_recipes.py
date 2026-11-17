"""TheCocktailDB 공식 API -> My Homebar recipes.json 변환기 (feature/data-recipes 담당: 태윤)

- 사이트(index.html/script.js)는 이 파일을 쓰지 않는다. 데이터와 이미지를 만드는 도구일 뿐이다.
- 레포 최상위 폴더(index.html 이 있는 곳)에서 실행한다.
- 재료 이름은 한글로 출력한다. 기존 recipes.json 의 재료가 영문이면 먼저 한글로 맞춘 뒤 --merge 하자.

사용 예:
  pip install requests
  python tools/build_recipes.py --limit 5 --merge     # 먼저 5개만 시험
  python tools/build_recipes.py --limit 60 --merge    # 기존 recipes.json 에 이어붙임
  python tools/build_recipes.py --no-images           # 이미지 다운로드 생략

데이터 출처 표시: TheCocktailDB (https://www.thecocktaildb.com)
"""
import argparse, json, os, re, string, sys, time
import requests

API_BASE = "https://www.thecocktaildb.com/api/json/v1/1"  # 무료 테스트 키 "1" (개발·교육용)
KEYS = ["id", "name", "koreanName", "category", "abv", "image", "ingredients", "description", "recipe"]
ALLOWED = {"Whisky", "Gin", "Rum", "Vodka", "Liqueur"}

ING_KO = {
    "bourbon": "버번 위스키", "whiskey": "위스키", "whisky": "위스키", "scotch": "스카치 위스키",
    "blended whiskey": "위스키", "blended scotch": "스카치 위스키", "rye whiskey": "라이 위스키",
    "irish whiskey": "아이리시 위스키", "gin": "진", "vodka": "보드카", "light rum": "화이트 럼",
    "white rum": "화이트 럼", "dark rum": "다크 럼", "rum": "럼", "tequila": "데킬라", "brandy": "브랜디",
    "triple sec": "트리플 섹", "cointreau": "쿠앵트로", "campari": "캄파리", "aperol": "아페롤",
    "sweet vermouth": "스위트 베르무트", "dry vermouth": "드라이 베르무트", "kahlua": "커피 리큐르",
    "coffee liqueur": "커피 리큐르", "amaretto": "아마레또", "baileys irish cream": "베일리스",
    "prosecco": "프로세코", "champagne": "샴페인", "angostura bitters": "앙고스투라 비터스",
    "lime": "라임", "lime juice": "라임", "lemon": "레몬", "lemon juice": "레몬주스",
    "orange juice": "오렌지주스", "cranberry juice": "크랜베리주스", "pineapple juice": "파인애플주스",
    "tonic water": "토닉워터", "soda water": "탄산수", "club soda": "탄산수", "ginger beer": "진저비어",
    "ginger ale": "진저에일", "cola": "콜라", "coca-cola": "콜라", "sugar": "설탕", "sugar syrup": "심플 시럽",
    "simple syrup": "심플 시럽", "mint": "민트", "milk": "우유", "light cream": "크림", "heavy cream": "크림",
    "egg white": "달걀 흰자", "grenadine": "그레나딘", "salt": "소금", "ice": "얼음", "water": "물",
}
NAME_KO = {
    "old fashioned": "올드 패션드", "whiskey sour": "위스키 사워", "manhattan": "맨해튼", "negroni": "네그로니",
    "gin tonic": "진토닉", "martini": "마티니", "mojito": "모히토", "daiquiri": "다이키리",
    "moscow mule": "모스코 뮬", "white russian": "화이트 러시안", "black russian": "블랙 러시안",
    "margarita": "마가리타", "cosmopolitan": "코스모폴리탄", "bloody mary": "블러디 메리",
    "pina colada": "피나콜라다", "tom collins": "톰 콜린스", "sidecar": "사이드카", "gimlet": "김렛",
    "mai tai": "마이타이", "cuba libre": "쿠바 리브레", "caipirinha": "카이피리냐",
    "espresso martini": "에스프레소 마티니", "mint julep": "민트 줄렙", "rusty nail": "러스티 네일",
    "godfather": "갓파더", "john collins": "존 콜린스", "boulevardier": "불바디에",
}

# 도수 추정용 (재료 키워드 -> ABV%). 위에서부터 먼저 맞는 것을 쓴다.
ABV_TABLE = [
    ("angostura", 0), ("sweet vermouth", 16), ("dry vermouth", 16), ("vermouth", 16), ("triple sec", 30),
    ("cointreau", 40), ("campari", 25), ("aperol", 11), ("kahlua", 20), ("coffee liqueur", 20),
    ("amaretto", 28), ("baileys", 17), ("liqueur", 25), ("schnapps", 20), ("curacao", 30), ("prosecco", 11),
    ("champagne", 12), ("wine", 12), ("beer", 5), ("bourbon", 40), ("whisk", 40), ("scotch", 40), ("rye", 40),
    ("gin", 40), ("vodka", 40), ("rum", 40), ("tequila", 40), ("brandy", 40), ("cognac", 40), ("mezcal", 40),
]
UNIT_ML = [("oz", 29.57), ("cl", 10), ("ml", 1), ("tsp", 5), ("teaspoon", 5), ("tbsp", 15), ("tblsp", 15),
           ("tablespoon", 15), ("dash", 0.9), ("shot", 44), ("jigger", 44), ("part", 30), ("cup", 240),
           ("splash", 5), ("drop", 0.05)]
CATEGORY_RULES = [("Whisky", ("bourbon", "whisk", "scotch", "rye")), ("Gin", ("gin",)), ("Rum", ("rum",)),
                  ("Vodka", ("vodka",)),
                  ("Liqueur", ("liqueur", "kahlua", "amaretto", "baileys", "cointreau", "triple sec", "campari",
                               "aperol", "curacao", "schnapps", "chartreuse"))]


def abv_of(ing):
    k = ing.lower()
    for key, v in ABV_TABLE:
        if key in k:
            return v
    return 0


def to_ml(measure):
    if not measure:
        return 0.0
    s = measure.lower()
    m = re.search(r"(\d+\s+\d+/\d+|\d+/\d+|\d+(?:\.\d+)?)", s)
    qty = None
    if m:
        qty = sum(float(x.split("/")[0]) / float(x.split("/")[1]) if "/" in x else float(x) for x in m.group(1).split())
    for u, ml in UNIT_ML:
        if re.search(rf"\b{u}(?:s|es)?\b", s):
            return (qty if qty is not None else 1) * ml
    if "top" in s:
        return 60.0
    return (qty or 0) * 15


def estimate_abv(pairs):
    total = sum(ml for _, ml in pairs)
    if total <= 0:
        return 0
    return round(sum(ml * abv_of(n) for n, ml in pairs) / (total * 1.15))  # 희석 15% 가정, 근사치


def guess_category(pairs):
    best, best_ml = None, 0
    for n, ml in pairs:
        if abv_of(n) >= 10 and ml > best_ml:
            best, best_ml = n.lower(), ml
    if not best:
        return None
    for cat, kws in CATEGORY_RULES:
        if any(k in best for k in kws):
            return cat
    return "Other"


def slugify(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "drink"


def fetch_all(base, delay):
    drinks = {}
    for ch in string.ascii_lowercase + string.digits:
        try:
            r = requests.get(f"{base}/search.php", params={"f": ch}, timeout=20)
            r.raise_for_status()
            for dk in (r.json().get("drinks") or []):
                drinks[dk["idDrink"]] = dk
        except Exception as e:
            print(f"  '{ch}' 실패: {e}")
        time.sleep(delay)
    return list(drinks.values())


def convert(dk, unmapped):
    pairs, ing_ko, lines = [], [], []
    for i in range(1, 16):
        ing = (dk.get(f"strIngredient{i}") or "").strip()
        if not ing:
            continue
        meas = (dk.get(f"strMeasure{i}") or "").strip()
        pairs.append((ing, to_ml(meas)))
        ko = ING_KO.get(ing.lower())
        if not ko:
            unmapped.add(ing)
            ko = ing
        if ko not in ing_ko:
            ing_ko.append(ko)
        lines.append(f"{meas} {ko}".strip())
    name = dk["strDrink"].strip()
    method = (dk.get("strInstructions") or "").strip()
    return {
        "name": name, "koreanName": NAME_KO.get(name.lower(), name),
        "category": guess_category(pairs), "abv": estimate_abv(pairs), "ingredients": ing_ko,
        "description": " · ".join(x for x in [dk.get("strCategory") or "칵테일", dk.get("strGlass")] if x),
        "recipe": "재료: " + ", ".join(lines) + "." + (" 방법: " + method if method else ""),
    }, dk.get("strDrinkThumb")


def download(url, path, delay):
    r = requests.get(url, timeout=20)
    r.raise_for_status()
    if not r.headers.get("Content-Type", "").startswith("image/"):
        raise ValueError("이미지가 아님")
    with open(path, "wb") as f:
        f.write(r.content)
    time.sleep(delay)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--api-base", default=API_BASE)
    ap.add_argument("--out", default="assets/data/recipes.json")
    ap.add_argument("--images", default="assets/images")
    ap.add_argument("--limit", type=int, default=60)
    ap.add_argument("--merge", action="store_true", help="기존 recipes.json 에 이어붙임")
    ap.add_argument("--include-unmapped", action="store_true", help="번역표에 없는 재료가 있어도 포함")
    ap.add_argument("--no-images", action="store_true")
    ap.add_argument("--delay", type=float, default=0.4)
    a = ap.parse_args()

    if not os.path.isdir("assets"):
        sys.exit("레포 최상위 폴더(assets 폴더가 보이는 곳)에서 실행하세요.")

    existing = json.load(open(a.out, encoding="utf-8")) if a.merge and os.path.exists(a.out) else []
    seen = {e["name"].lower() for e in existing}
    results = list(existing)
    next_id = max([e["id"] for e in existing], default=0) + 1

    print("API에서 칵테일 목록을 받는 중...")
    raw = fetch_all(a.api_base, a.delay)
    print(f"받은 칵테일: {len(raw)}개")
    os.makedirs(a.images, exist_ok=True)
    os.makedirs(os.path.dirname(a.out) or ".", exist_ok=True)

    unmapped_all, added, skipped_unmapped = set(), 0, 0
    for dk in sorted(raw, key=lambda x: x["strDrink"].lower()):
        if added >= a.limit:
            break
        if dk.get("strAlcoholic") != "Alcoholic" or dk["strDrink"].lower() in seen:
            continue
        unmapped = set()
        rec, thumb = convert(dk, unmapped)
        if rec["category"] not in ALLOWED:
            continue
        if unmapped and not a.include_unmapped:
            unmapped_all |= unmapped
            skipped_unmapped += 1
            continue
        unmapped_all |= unmapped
        slug = slugify(rec["name"])
        rec["image"] = f"assets/images/{slug}.jpg"
        if thumb and not a.no_images:
            try:
                download(thumb + "/medium", os.path.join(a.images, slug + ".jpg"), a.delay)
            except Exception as e:
                print(f"  이미지 실패({rec['name']}): {e}")
        rec = {"id": next_id, **rec}
        results.append({k: rec[k] for k in KEYS})
        seen.add(rec["name"].lower())
        next_id += 1
        added += 1

    with open(a.out, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)
    print(f"저장: {a.out} (새로 {added}개, 전체 {len(results)}개)")
    if skipped_unmapped:
        print(f"번역표에 없는 재료 때문에 제외된 칵테일: {skipped_unmapped}개")
    if unmapped_all:
        print("[번역 필요한 재료] ING_KO 에 추가한 뒤 다시 실행하면 더 많이 포함됩니다:")
        print(", ".join(sorted(unmapped_all)))
    print("※ abv 는 재료 비율 추정 근사치, 국문명이 영문인 항목과 영어 제조법은 팀에서 보완하세요.")


if __name__ == "__main__":
    main()
