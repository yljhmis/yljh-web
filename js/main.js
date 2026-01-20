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

/* 輪播控制邏輯修正 */
function startCarouselLogic() {
	const carouselElement = document.querySelector('#main-carousel');
	const pauseBtn = document.querySelector('#carouselPauseBtn');
	if (!carouselElement || !pauseBtn) return;

	// 移除預設 data-bs-* 屬性以避免衝突，改由 JS 完全接管
	// 但保留基本的 class 以供樣式使用

	// 初始化 Bootstrap Carousel 實例
	// 設置 pause: false (禁用預設的 hover 暫停，改由我們手動控制以避免衝突)
	let carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: false,
		keyboard: true
	});

	// 狀態變數：是否由使用者手動暫停
	let isUserPaused = false;
	// 狀態變數：是否因焦點而暫停
	let isFocusPaused = false;

	// 建立或獲取狀態回饋元素 (Live Region)
	let statusFeedback = document.getElementById('carousel-status-feedback');
	if (!statusFeedback) {
		statusFeedback = document.createElement('div');
		statusFeedback.id = 'carousel-status-feedback';
		statusFeedback.className = 'visually-hidden';
		statusFeedback.setAttribute('aria-live', 'polite');
		carouselElement.appendChild(statusFeedback);
	}

	// 統一更新 UI 與 Carousel 狀態
	const updateCarouselState = () => {
		// 只要「使用者手動暫停」或「焦點暫停」其中之一成立，就應該暫停
		const shouldPause = isUserPaused || isFocusPaused;

		if (shouldPause) {
			carousel.pause();
			// 確保停止循環
			carouselElement.removeAttribute('data-bs-ride');
		} else {
			carousel.cycle();
			carouselElement.setAttribute('data-bs-ride', 'carousel');
		}

		// 只有當「使用者手動暫停」狀態改變時，才更新按鈕文字
		// 這樣當焦點暫停時，按鈕不會變成「開始輪播」(因為使用者沒按暫停)
		// 但這裡依據 WCAG，若焦點暫停，通常不需改變按鈕狀態，只需停止動畫

		// 更新按鈕文字與 ARIA (僅反映手動狀態)
		if (isUserPaused) {
			pauseBtn.innerText = '開始輪播';
			pauseBtn.setAttribute('aria-label', '開始輪播');

			// 視覺化回饋：只有手動操作才提示狀態
			if (document.activeElement === pauseBtn) {
				statusFeedback.innerText = '輪播已暫停';
			}
		} else {
			pauseBtn.innerText = '暫停輪播';
			pauseBtn.setAttribute('aria-label', '暫停輪播');

			if (document.activeElement === pauseBtn) {
				statusFeedback.innerText = '輪播已開始播放';
			}
		}
	};

	// 1. 按鈕點擊事件
	pauseBtn.addEventListener('click', function () {
		isUserPaused = !isUserPaused; // 切換手動暫停狀態
		updateCarouselState();
	});

	// 2. 焦點事件 (整個輪播區域)
	// 當焦點進入輪播區 (包含按鈕、內容連結)，暫停播放
	carouselElement.addEventListener('focusin', function () {
		isFocusPaused = true;
		// 焦點進入時，暫時停止輪播，但不改變「手動暫停按鈕」的狀態
		// 這是為了避免使用者疑惑為何按鈕自己變了
		// 且符合「使用者若移開焦點，輪播應恢復(若原本是播放中)」
		carousel.pause();
	});

	// 當焦點離開輪播區
	carouselElement.addEventListener('focusout', function (e) {
		// 確保新的焦點不在輪播區內
		if (!carouselElement.contains(e.relatedTarget)) {
			isFocusPaused = false;
			updateCarouselState(); // 依據 isUserPaused 決定是否恢復播放
		}
	});

	// 3. 滑鼠懸停 (Hover) 事件
	// 雖然無障礙規範主要針對鍵盤，但滑鼠懸停暫停也是常見輔助
	carouselElement.addEventListener('mouseenter', function () {
		isFocusPaused = true; // 視同焦點進入，暫停
		carousel.pause();
	});

	carouselElement.addEventListener('mouseleave', function () {
		isFocusPaused = false;
		updateCarouselState();
	});

	// 初始啟動
	carousel.cycle();
}

/**
 * 初始化宣導頁籤組件
 * 修正焦點順序：由「方向鍵切換」改為符合檢測要求的「線性 Tab 鍵導覽」
 */
/**
 * 初始化宣導頁籤組件
 * 修正焦點順序：由「方向鍵切換」改為符合檢測要求的「線性 Tab 鍵導覽」
 * 流程：Tab1 -> Panel1 -> Tab2 -> Panel2 ...
 */
function initAccessibleTabs() {
	const tabList = document.querySelector('#promoTab');
	if (!tabList) return;

	const tabs = Array.from(tabList.querySelectorAll('[role="tab"]'));

	function getFocusableInPanel(panel) {
		// 簡單過濾可視與可聚焦元素
		return Array.from(panel.querySelectorAll('a[href], button, input, textarea, select, [tabindex]:not([tabindex="-1"])'))
			.filter(el => !el.hasAttribute('disabled') && el.offsetParent !== null);
	}

	tabs.forEach((tab, index) => {
		// 1. 確保所有頁籤標題皆可被 Tab 鍵遊走 (tabindex="0")
		tab.setAttribute('tabindex', '0');

		// 當標題獲得焦點時，自動顯示對應內容 (Follow Focus)
		tab.addEventListener('focus', () => {
			const bsTab = bootstrap.Tab.getOrCreateInstance(tab);
			bsTab.show();
		});

		// 綁定頁籤本身的鍵盤事件
		tab.addEventListener('keydown', (e) => {
			const panelId = tab.getAttribute('aria-controls');
			const panel = document.getElementById(panelId);

			// 情境 A: 在 Tab 上按 Tab 鍵 (往下) -> 應進入該 Tab 的 Panel
			if (e.key === 'Tab' && !e.shiftKey) {
				if (panel) {
					e.preventDefault();
					const focusables = getFocusableInPanel(panel);
					if (focusables.length > 0) {
						focusables[0].focus();
					} else {
						// 若 Panel 內無可聚焦元素，聚焦 Panel 本身
						panel.setAttribute('tabindex', '0');
						panel.focus();
					}
				}
			}

			// 情境 B: 在 Tab 上按 Shift + Tab (往上) -> 應回到「前一個 Tab 的 Panel」的最後一個元素
			// 若是第一個 Tab，則依其自然順序回到 TabList 之前的元素 (不需處理)
			if (e.key === 'Tab' && e.shiftKey) {
				const prevTab = tabs[index - 1];
				if (prevTab) {
					const prevPanelId = prevTab.getAttribute('aria-controls');
					const prevPanel = document.getElementById(prevPanelId);
					if (prevPanel) {
						e.preventDefault();
						const prevFocusables = getFocusableInPanel(prevPanel);
						if (prevFocusables.length > 0) {
							prevFocusables[prevFocusables.length - 1].focus();
						} else {
							// 若前一個 Panel 無內容，則聚焦前一個 Tab 標題
							prevTab.focus();
						}
					}
				}
			}
		});

		// 處理 Panel 內的導覽
		const panelId = tab.getAttribute('aria-controls');
		const panel = document.getElementById(panelId);
		if (panel) {
			// 確保 panel 可程式聚焦 (方便在空內容時作為落點)
			panel.setAttribute('tabindex', '-1');

			panel.addEventListener('keydown', (e) => {
				// 情境 C: 在 Panel 內按 Shift + Tab (往上)
				// 若目前焦點是 Panel 內的第一個元素 (或是 Panel 本身)，則回到對應的 Tab 標題
				if (e.key === 'Tab' && e.shiftKey) {
					const focusables = getFocusableInPanel(panel);
					const firstEl = focusables[0] || panel;

					if (document.activeElement === firstEl || document.activeElement === panel) {
						e.preventDefault();
						tab.focus();
					}
				}

				// 情境 D: 在 Panel 內按 Tab (往下)
				// 若目前焦點是 Panel 內的最後一個元素 (或是 Panel 本身)，則跳到「下一個 Tab 標題」
				if (e.key === 'Tab' && !e.shiftKey) {
					const focusables = getFocusableInPanel(panel);
					const lastEl = focusables[focusables.length - 1] || panel;

					if (document.activeElement === lastEl) {
						const nextTab = tabs[index + 1];
						if (nextTab) {
							e.preventDefault();
							nextTab.focus();
						}
						// 若沒有下一個 Tab，則讓瀏覽器執行預設行為 (離開 Tab 組件)
					}
				}
			});
		}
	});

	// Hash 偵測維持
	const handleHash = () => {
		const hash = window.location.hash;
		if (!hash) return;
		// 修正選取器邏輯，避免無效選取
		try {
			let targetTab = document.querySelector(`button${hash}[role="tab"]`);
			if (targetTab) {
				const bsTab = bootstrap.Tab.getOrCreateInstance(targetTab);
				bsTab.show();
				setTimeout(() => targetTab.scrollIntoView({ behavior: 'smooth', block: 'start' }), 150);
			}
		} catch (err) {
			// 忽略無效 hash
		}
	};
	handleHash();
}

function optimizeNavBar() {
	const navbarCollapse = document.getElementById('navbarNav');
	const navbarToggler = document.querySelector('.navbar-toggler');

	if (navbarCollapse && navbarToggler) {
		const bsCollapse = new bootstrap.Collapse(navbarCollapse, { toggle: false });

		// 1. ESC 鍵關閉選單 (原有的功能保持)
		document.addEventListener('keydown', function (e) {
			if (e.key === 'Escape' && navbarCollapse.classList.contains('show')) {
				bsCollapse.hide();
				navbarToggler.focus();
			}
		});

		// 2. 點擊選單外部自動收合 (Click Outside)
		document.addEventListener('click', function (e) {
			// 如果選單是開啟狀態
			if (navbarCollapse.classList.contains('show')) {
				// 且點擊目標不在選單內，也不在切換按鈕上
				if (!navbarCollapse.contains(e.target) && !navbarToggler.contains(e.target)) {
					bsCollapse.hide();
				}
			}
		});

		// 3. 焦點移出選單自動收合 (Focus Out)
		// 監聽選單內的 focusout 事件
		navbarCollapse.addEventListener('focusout', function (e) {
			// 稍微延遲以獲取新的 activeElement
			setTimeout(() => {
				// 如果選單是開啟狀態
				if (navbarCollapse.classList.contains('show')) {
					// 且新的焦點不在選單內，也不在切換按鈕上
					if (!navbarCollapse.contains(document.activeElement) && !navbarToggler.contains(document.activeElement)) {
						bsCollapse.hide();
					}
				}
			}, 10); // 短暫延遲確保 focus 轉移完成
		});
	}
}

document.addEventListener('DOMContentLoaded', function () {
	fetchAndInitCarousel();
	initAccessibleTabs();
	optimizeNavBar();
});