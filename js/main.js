/**
 * 育林國中官方網站核心腳本
 * 修正：
 * 1. 解決輪播暫停後因滑鼠移開而自動重啟的問題。
 * 2. 新增鍵盤焦點停駐暫停功能，符合 WCAG 2.1 AA 規範（2.2.2 暫停、停止、隱藏）。
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

	/**
	 * 初始化 Bootstrap Carousel
	 */
	let carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: 'hover', // 滑鼠懸停時暫停
		keyboard: true
	});

	let isPaused = false; // 紀錄使用者是否「手動」按下暫停按鈕

	// 建立一個隱藏的 live region 用於狀態回饋
	let statusFeedback = document.getElementById('carousel-status-feedback');
	if (!statusFeedback) {
		statusFeedback = document.createElement('div');
		statusFeedback.id = 'carousel-status-feedback';
		statusFeedback.className = 'visually-hidden';
		statusFeedback.setAttribute('aria-live', 'polite');
		carouselElement.appendChild(statusFeedback);
	}

	const updateUI = (paused) => {
		if (paused) {
			pauseBtn.innerText = '開始輪播';
			pauseBtn.setAttribute('aria-label', '開始輪播動畫');
			statusFeedback.innerText = '輪播已暫停';
			carouselElement.setAttribute('aria-live', 'polite');
			carouselElement.setAttribute('data-bs-ride', 'false');
			carouselElement.setAttribute('data-bs-interval', 'false');
		} else {
			pauseBtn.innerText = '暫停輪播';
			pauseBtn.setAttribute('aria-label', '暫停輪播動畫');
			statusFeedback.innerText = '輪播已開始播放';
			carouselElement.setAttribute('aria-live', 'off');
			carouselElement.setAttribute('data-bs-ride', 'carousel');
			carouselElement.setAttribute('data-bs-interval', '5000');
		}
	};

	/**
	 * 1. 處理手動按鈕點擊
	 */
	pauseBtn.addEventListener('click', function() {
		if (!isPaused) {
			carousel.pause();
			isPaused = true;
			carouselElement.addEventListener('mouseleave', forcePauseOnLeave);
		} else {
			carousel.cycle();
			isPaused = false;
			carouselElement.removeEventListener('mouseleave', forcePauseOnLeave);
		}
		updateUI(isPaused);
	});

	/**
	 * 2. 核心修正：鍵盤焦點停駐暫停
	 * 當 Tab 鍵焦點進入輪播區域（按鈕、指示器、連結等）時暫停輪播
	 */
	carouselElement.addEventListener('focusin', function() {
		carousel.pause();
		// 為了確保螢幕閱讀器使用者知道內容不會再跳動
		carouselElement.setAttribute('aria-live', 'polite');
	});

	/**
	 * 當焦點離開輪播區域時
	 */
	carouselElement.addEventListener('focusout', function() {
		// 只有在「沒有手動暫停」的情況下，才恢復自動輪播
		if (!isPaused) {
			carousel.cycle();
			carouselElement.setAttribute('aria-live', 'off');
		}
	});

	function forcePauseOnLeave() {
		if (isPaused) {
			carousel.pause();
		}
	}

	// 方向鍵操作優化
	carouselElement.addEventListener('keydown', function(e) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			carouselElement.setAttribute('aria-live', 'polite');
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

	const handleHash = () => {
		const hash = window.location.hash;
		if (!hash) return;

		let targetTab = document.querySelector(`button${hash}[role="tab"]`);
		if (targetTab) {
			const bsTab = bootstrap.Tab.getOrCreateInstance(targetTab);
			bsTab.show();
			setTimeout(() => {
				targetTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
			}, 150);
		}
	};

	handleHash();

	tabs.forEach(tab => {
		tab.addEventListener('shown.bs.tab', event => {
			const id = event.target.getAttribute('id');
			if (id) {
				history.replaceState(null, null, '#' + id);
			}
		});
	});

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

		tabs.forEach(t => {
			t.setAttribute('aria-selected', 'false');
			t.setAttribute('tabindex', '-1');
		});

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

		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && navbarCollapse.classList.contains('show')) {
				bsCollapse.hide();
				navbarToggler.focus();
			}
		});
	}
}

document.addEventListener('DOMContentLoaded', function () {
	fetchAndInitCarousel();
	initAccessibleTabs();
	optimizeNavBar();
});