/**
 * 育林國中官方網站核心腳本
 * 包含：輪播圖初始化、無障礙導覽控制、響應式頁籤切換與 Hash 偵測
 */

async function fetchAndInitCarousel() {
	try {
		const response = await fetch('carouselData.json');
		if (!response.ok) throw new Error('無法讀取 JSON 檔案');

		const carouselData = await response.json();
		const indicatorsContainer = document.getElementById('carousel-indicators-container');
		const innerContainer = document.getElementById('carousel-inner-container');

		let indicatorsHtml = '';
		let innerHtml = '';

		carouselData.forEach((item, index) => {
			const activeClass = index === 0 ? 'active' : '';
			const ariaCurrent = index === 0 ? 'aria-current="true"' : '';

			indicatorsHtml += `
                <button type="button" data-bs-target="#main-carousel" 
                    data-bs-slide-to="${index}" class="${activeClass}" 
                    ${ariaCurrent} aria-label="第 ${index + 1} 張投影片：${item.alt}"></button>`;

			innerHtml += `
                <div class="carousel-item ${activeClass}" 
                     role="group" 
                     aria-roledescription="slide" 
                     aria-label="第 ${index + 1} 張，共 ${carouselData.length} 張：${item.alt}">
                    <img src="carousel/${item.src}" alt="${item.alt}" class="d-block w-100">
                </div>`;
		});

		indicatorsContainer.innerHTML = indicatorsHtml;
		innerContainer.innerHTML = innerHtml;

		startCarouselLogic();

	} catch (error) {
		console.error('載入失敗:', error);
		const container = document.getElementById('carousel-inner-container');
		if (container) {
			container.innerHTML = '<p class="p-4 text-danger" role="alert">無法載入輪播內容，請檢查網路連線。</p>';
		}
	}
}

function startCarouselLogic() {
	const carouselElement = document.querySelector('#main-carousel');
	const pauseBtn = document.querySelector('#carouselPauseBtn');
	if (!carouselElement || !pauseBtn) return;

	const carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: 'hover',
		keyboard: true
	});

	let isPaused = false;

	carouselElement.addEventListener('keydown', function(e) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			carouselElement.setAttribute('aria-live', 'polite');
		}
	});

	pauseBtn.addEventListener('click', function() {
		if (!isPaused) {
			carousel.pause();
			carouselElement.setAttribute('aria-live', 'polite');
			pauseBtn.innerText = '開始輪播';
			pauseBtn.setAttribute('aria-label', '開始輪播動畫');
			isPaused = true;
		} else {
			carousel.cycle();
			carouselElement.setAttribute('aria-live', 'off');
			pauseBtn.innerText = '暫停輪播';
			pauseBtn.setAttribute('aria-label', '停止輪播動畫');
			isPaused = false;
		}
	});
}

/**
 * 初始化宣導頁籤組件 (WAI-ARIA 符合規範)
 */
function initAccessibleTabs() {
	const tabList = document.querySelector('#promoTab');
	if (!tabList) return;

	const tabs = tabList.querySelectorAll('[role="tab"]');

	// 1. 偵測 URL 中的 Hash 並切換至對應內容與捲動
	const handleHash = () => {
		const hash = window.location.hash;
		if (!hash) return;

		let targetTab = document.querySelector(`button${hash}[role="tab"]`);
		let targetPanel = document.querySelector(`${hash}[role="tabpanel"]`);

		if (targetTab && !targetPanel) {
			const panelId = targetTab.getAttribute('aria-controls');
			targetPanel = document.getElementById(panelId);
		} else if (!targetTab && targetPanel) {
			const tabId = targetPanel.getAttribute('aria-labelledby');
			targetTab = document.getElementById(tabId);
		}

		if (targetTab) {
			const bsTab = bootstrap.Tab.getOrCreateInstance(targetTab);
			bsTab.show();
		}

		if (targetPanel) {
			setTimeout(() => {
				targetPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 150);
		}
	};

	handleHash();

	// 2. 當使用者手動點擊頁籤時，同步更新 URL Hash
	tabs.forEach(tab => {
		tab.addEventListener('shown.bs.tab', event => {
			const id = event.target.getAttribute('id');
			if (id) {
				history.replaceState(null, null, '#' + id);
			}
		});
	});

	// 3. 無障礙鍵盤方向鍵切換優化
	tabList.addEventListener('keydown', e => {
		let index = Array.from(tabs).indexOf(e.target);
		if (index === -1) return;

		let nextIndex;
		if (e.key === 'ArrowRight') {
			nextIndex = (index + 1) % tabs.length;
		} else if (e.key === 'ArrowLeft') {
			nextIndex = (index - 1 + tabs.length) % tabs.length;
		} else if (e.key === 'Home') {
			nextIndex = 0;
		} else if (e.key === 'End') {
			nextIndex = tabs.length - 1;
		} else {
			return;
		}

		e.preventDefault();
		const targetTab = tabs[nextIndex];

		// 1. 更新所有頁籤狀態 (Roving Tabindex)
		tabs.forEach(t => {
			t.setAttribute('aria-selected', 'false');
			t.setAttribute('tabindex', '-1');
		});

		// 2. 啟動目標頁籤
		targetTab.setAttribute('aria-selected', 'true');
		targetTab.setAttribute('tabindex', '0');

		const bootstrapTab = bootstrap.Tab.getOrCreateInstance(targetTab);
		bootstrapTab.show();
		targetTab.focus();
	});
}

function optimizeNavBar() {
	const navbarCollapse = document.getElementById('navbarNav');
	const navbarToggler = document.querySelector('.navbar-toggler');

	if (navbarCollapse && navbarToggler) {
		const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });

		// Esc 鍵關閉選單
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && navbarCollapse.classList.contains('show')) {
				bsCollapse.hide();
				navbarToggler.focus();
			}
		});

		// 焦點移出選單時收合
		navbarCollapse.addEventListener('focusout', function () {
			setTimeout(() => {
				const activeElement = document.activeElement;
				if (!navbarCollapse.contains(activeElement) && activeElement !== navbarToggler) {
					if (navbarCollapse.classList.contains('show')) {
						bsCollapse.hide();
					}
				}
			}, 10);
		});

		// 點擊選單外部收合
		document.addEventListener('click', function (e) {
			const isOpen = navbarCollapse.classList.contains('show');
			const isClickOutside = !navbarCollapse.contains(e.target);
			const isNotToggler = !navbarToggler.contains(e.target);

			if (isOpen && isClickOutside && isNotToggler) {
				bsCollapse.hide();
			}
		});
	}
}

/**
 * DOM 載入完成後執行各項初始化
 */
document.addEventListener('DOMContentLoaded', function () {
	// A. 輪播圖初始化
	fetchAndInitCarousel();

	// B. 宣導頁籤初始化
	initAccessibleTabs();

	// C. 導覽列輔助功能優化 (Navbar Collapse)
	optimizeNavBar();
});
