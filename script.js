let allRecipes = [];          // 전체 레시피 데이터
let selectedCategory = "All"; // 현재 선택된 카테고리
let searchQuery = "";         // 현재 검색어
let ownedIngredients = new Set(); // 사용자가 체크한 보유 재료 목록

document.addEventListener("DOMContentLoaded", () => {
    fetchRecipes();

    // 1. 검색창 이벤트 리스너
    document.getElementById("searchInput").addEventListener("input", (e) => {
        searchQuery = e.target.value.trim();
        filterAndRender();
    });

    // 2. 카테고리 버튼 이벤트 리스너
    const filterButtons = document.querySelectorAll(".filter-btn");
    filterButtons.forEach(btn => {
        btn.addEventListener("click", (e) => {
            filterButtons.forEach(b => b.classList.remove("active"));
            e.target.classList.add("active");
            selectedCategory = e.target.getAttribute("data-category");
            filterAndRender();
        });
    });

    // 3. 필터 초기화 버튼
    document.getElementById("resetFilterBtn").addEventListener("click", () => {
        document.getElementById("searchInput").value = "";
        searchQuery = "";
        ownedIngredients.clear();
        document.querySelectorAll(".ing-checkbox").forEach(chk => chk.checked = false);
        filterAndRender();
    });
});

// JSON 데이터 비동기 불러오기
async function fetchRecipes() {
    try {
        const response = await fetch("assets/data/recipes.json");
        if (!response.ok) throw new Error("데이터를 불러오지 못했습니다.");
        
        allRecipes = await response.json();
        initIngredientCheckboxes(); // 사이드바 재료 체크박스 생성
        filterAndRender();          // 초기 화면 렌더링
    } catch (error) {
        console.error("오류 발생:", error);
    }
}

// 칵테일 데이터에 등장하는 모든 고유 재료를 추출해 사이드바 체크박스로 만들기
function initIngredientCheckboxes() {
    const container = document.getElementById("ingredientCheckboxes");
    container.innerHTML = "";

    const allIngs = new Set();
    allRecipes.forEach(recipe => {
        recipe.ingredients.forEach(ing => allIngs.add(ing));
    });

    allIngs.forEach(ing => {
        const label = document.createElement("label");
        label.className = "checkbox-label";
        
        label.innerHTML = `
            <input type="checkbox" value="${ing}" class="ing-checkbox">
            ${ing}
        `;
        
        container.appendChild(label);
    });

    document.querySelectorAll(".ing-checkbox").forEach(chk => {
        chk.addEventListener("change", (e) => {
            const val = e.target.value;
            if (e.target.checked) {
                ownedIngredients.add(val);
            } else {
                ownedIngredients.delete(val);
            }
            filterAndRender();
        });
    });
}

// 검색어, 카테고리, 보유 재료 조건을 모두 종합하여 필터링 후 렌더링
function filterAndRender() {
    let filtered = allRecipes.filter(recipe => {
        const matchCategory = (selectedCategory === "All") || (recipe.category === selectedCategory);
        
        const query = searchQuery.toLowerCase();
        const matchSearch = (recipe.name && recipe.name.toLowerCase().includes(query)) || 
                            (recipe.koreanName && recipe.koreanName.toLowerCase().includes(query)) ||
                            (recipe.description && recipe.description.toLowerCase().includes(query)) ||
                            recipe.ingredients.some(ing => ing.toLowerCase().includes(query));

        let matchIngredients = true;
        if (ownedIngredients.size > 0) {
            matchIngredients = recipe.ingredients.some(ing => ownedIngredients.has(ing));
        }

        return matchCategory && matchSearch && matchIngredients;
    });

    renderRecipes(filtered);
}

// 화면에 카드 형태로 그리기
function renderRecipes(recipes) {
    const container = document.getElementById("recipeContainer");
    container.innerHTML = "";

    if (recipes.length === 0) {
        container.innerHTML = `<p class="no-result">조건에 맞는 칵테일이 없습니다. 🥲</p>`;
        return;
    }

    recipes.forEach(recipe => {
        const card = document.createElement("div");
        card.className = "recipe-card";
        
        card.innerHTML = `
            <img src="${recipe.image}" alt="${recipe.name}" onerror="this.src='https://via.placeholder.com/300x180?text=No+Image'">
            <div class="card-content">
                <span class="category-tag">${recipe.category} | 도수 ${recipe.abv}%</span>
                <h3>${recipe.koreanName} <small>(${recipe.name})</small></h3>
                <p class="desc">${recipe.description}</p>
                <div class="ingredients-tags">
                    ${recipe.ingredients.map(ing => `<span class="tag ${ownedIngredients.has(ing) ? 'owned' : ''}">${ing}</span>`).join('')}
                </div>
            </div>
        `;

        // ✨ 카드 클릭 시 상세 모달 열기 이벤트 추가
        card.addEventListener("click", () => {
            openRecipeModal(recipe);
        });
        
        container.appendChild(card);
    });
}

// 상세 모달 열기 함수
function openRecipeModal(recipe) {
    const modal = document.getElementById("recipeModal");
    
    document.getElementById("modalImage").src = recipe.image;
    document.getElementById("modalImage").onerror = function() {
        this.src = 'https://via.placeholder.com/500x240?text=No+Image';
    };
    document.getElementById("modalCategory").textContent = `${recipe.category} | 도수 ${recipe.abv}%`;
    document.getElementById("modalTitle").innerHTML = `${recipe.koreanName} <small>(${recipe.name})</small>`;
    document.getElementById("modalDesc").textContent = recipe.description;
    
    // 재료 태그 렌더링
    const ingContainer = document.getElementById("modalIngredients");
    ingContainer.innerHTML = recipe.ingredients
        .map(ing => `<span class="tag ${ownedIngredients.has(ing) ? 'owned' : ''}">${ing}</span>`)
        .join('');

    // 제조법 텍스트 (recipe 필드가 없을 경우 대비)
    document.getElementById("modalRecipe").textContent = recipe.recipe || "상세 레시피 정보가 아직 등록되지 않았습니다.";

    modal.style.display = "flex";
}

// 모달 닫기 이벤트 (X 버튼 클릭 또는 모달 바깥 배경 클릭 시)
document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("recipeModal");
    const closeBtn = document.getElementById("closeModalBtn");

    if (closeBtn) {
        closeBtn.addEventListener("click", () => {
            modal.style.display = "none";
        });
    }

    window.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.style.display = "none";
        }
    });
});