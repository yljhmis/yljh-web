/**
 * 育林國中官方網站核心腳本
 * 修正：
 * 1. 解決輪播暫停後因滑鼠移開而自動重啟的問題。
 * 2. 符合 WCAG 2.1 AA 規範（2.2.2 暫停、停止、隱藏）：新增鍵盤焦點停駐暫停。
 * 3. 符合規範 2.4.3 焦點順序：優化頁籤導覽順序為「標題1->內容1->標題2->內容2...」。
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

	let carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: 'hover',
		keyboard: true
	});

	let isPaused = false;

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

	carouselElement.addEventListener('focusin', function() {
		carousel.pause();
		carouselElement.setAttribute('aria-live', 'polite');
	});

	carouselElement.addEventListener('focusout', function() {
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

	carouselElement.addEventListener('keydown', function(e) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			carouselElement.setAttribute('aria-live', 'polite');
		}
	});
}

/**
 * 初始化宣導頁籤組件
 * 修正焦點順序：由「方向鍵切換」改為符合檢測要求的「線性 Tab 鍵導覽」
 */
function initAccessibleTabs() {
	const tabList = document.querySelector('#promoTab');
	if (!tabList) return;

	const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

	// 1. 確保所有頁籤標題皆可被 Tab 鍵遊走 (tabindex="0")
	tabs.forEach((tab, index) => {
		tab.setAttribute('tabindex', '0');

		// 當標題獲得焦點時，自動顯示對應內容 (Follow Focus)
		// 這能確保使用者 Tab 到標題時，下方的面板內容已更新為正確資訊
		tab.addEventListener('focus', () => {
			const bsTab = bootstrap.Tab.getOrCreateInstance(tab);
			bsTab.show();
		});

		// 2. 管理 Tab 鍵流向：當在面板最後一個元素按下 Tab，導向「下一個頁籤標題」
		const panelId = tab.getAttribute('aria-controls');
		const panel = document.getElementById(panelId);
		if (panel) {
			// 設定面板為可接受焦點，方便螢幕閱讀器讀取
			panel.setAttribute('tabindex', '0');

			// 監聽面板內的最後一個焦點元素
			panel.addEventListener('keydown', (e) => {
				if (e.key === 'Tab' && !e.shiftKey) {
					const focusableElements = panel.querySelectorAll('a, button, input, textarea, [tabindex="0"]');
					const lastElement = focusableElements[focusableElements.length - 1] || panel;

					// 如果當前焦點在最後一個元素（或面板本身），則強制導向下一頁籤標題
					if (document.activeElement === lastElement) {
						const nextTab = tabs[index + 1];
						if (nextTab) {
							e.preventDefault();
							nextTab.focus();
						}
					}
				}
			});
		}

		// 3. 處理 Shift + Tab：從標題往回走應回到前一個面板的末尾
		tab.addEventListener('keydown', (e) => {
			if (e.key === 'Tab' && e.shiftKey) {
				const prevTab = tabs[index - 1];
				if (prevTab) {
					const prevPanelId = prevTab.getAttribute('aria-controls');
					const prevPanel = document.getElementById(prevPanelId);
					const prevFocusable = prevPanel.querySelectorAll('a, button, input, [tabindex="0"]');
					const lastElOfPrev = prevFocusable[prevFocusable.length - 1] || prevPanel;

					e.preventDefault();
					lastElOfPrev.focus();
				}
			}
		});
	});

	// Hash 偵測維持
	const handleHash = () => {
		const hash = window.location.hash;
		if (!hash) return;
		let targetTab = document.querySelector(`button${hash}[role="tab"]`);
		if (targetTab) {
			const bsTab = bootstrap.Tab.getOrCreateInstance(targetTab);
			bsTab.show();
			setTimeout(() => targetTab.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
		}
	};
	handleHash();
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