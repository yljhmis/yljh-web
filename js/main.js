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

		const carouselData = (await response.json()).filter(item => item.enable === true);


		const innerContainer = document.getElementById('carousel-inner-container');


		let innerHtml = '';

		carouselData.forEach((item, index) => {
			const activeClass = index === 0 ? 'active' : '';


			// 指示器按鈕：增加 data-alt 屬性以便 JS 抓取報讀內容


			innerHtml += `
                <div class="carousel-item ${activeClass}" 
                     role="group" 
                     aria-roledescription="slide" 
                     aria-label="第 ${index + 1} 張，共 ${carouselData.length} 張：${item.alt}">
                    <img src="carousel/${item.src}" alt="${item.alt}" class="d-block w-100">
                </div>`;
		});


		innerContainer.innerHTML = innerHtml;

		startCarouselLogic(carouselData);

	} catch (error) {
		console.error('載入失敗:', error);
	}
}

function startCarouselLogic(carouselData) {
	const carouselElement = document.querySelector('#main-carousel');
	const pauseBtn = document.querySelector('#carouselPauseBtn');
	if (!carouselElement || !pauseBtn) return;

	let carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: false,
		keyboard: true
	});

	let isUserPaused = false;
	let isFocusPaused = false;

	// 取得或建立 Live Region
	let statusFeedback = document.getElementById('carousel-status-feedback');
	if (!statusFeedback) {
		statusFeedback = document.createElement('div');
		statusFeedback.id = 'carousel-status-feedback';
		statusFeedback.className = 'visually-hidden';
		statusFeedback.setAttribute('aria-live', 'polite');
		carouselElement.appendChild(statusFeedback);
	}

	const updateCarouselState = (manualAlt = null) => {
		const shouldPause = isUserPaused || isFocusPaused;

		if (shouldPause) {
			carousel.pause();
			// 當暫停時，將 aria-live 設為 polite 以便報讀手動切換的內容
			carouselElement.setAttribute('aria-live', 'polite');
		} else {
			carousel.cycle();
			// 自動播放時設為 off 避免過度干擾
			carouselElement.setAttribute('aria-live', 'off');
		}

		// 更新按鈕視覺狀態
		pauseBtn.innerText = isUserPaused ? '開始輪播' : '暫停輪播';
		pauseBtn.setAttribute('aria-label', isUserPaused ? '開始輪播' : '暫停輪播');

		// 如果有傳入特定說明 (例如焦點在指示器上)，則立即報讀
		if (manualAlt) {
			statusFeedback.innerText = manualAlt;
		}
	};



	pauseBtn.addEventListener('click', () => {
		isUserPaused = !isUserPaused;
		updateCarouselState(isUserPaused ? '輪播已暫停' : '輪播已開始播放');
	});

	// 整個區域的焦點移入/移出
	carouselElement.addEventListener('focusin', () => {
		isFocusPaused = true;
		carousel.pause();
	});

	carouselElement.addEventListener('focusout', (e) => {
		if (!carouselElement.contains(e.relatedTarget)) {
			isFocusPaused = false;
			updateCarouselState();
		}
	});

	// 滑鼠移入暫停
	carouselElement.addEventListener('mouseenter', () => {
		isFocusPaused = true;
		carousel.pause();
	});

	carouselElement.addEventListener('mouseleave', () => {
		isFocusPaused = false;
		updateCarouselState();
	});
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