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
		container.innerHTML = '<p class="p-4 text-danger" role="alert">無法載入輪播內容，請檢查網路連線。</p>';
	}
}

function startCarouselLogic() {
	const carouselElement = document.querySelector('#main-carousel');
	const pauseBtn = document.querySelector('#carouselPauseBtn');
	
	const carousel = new bootstrap.Carousel(carouselElement, {
		interval: 5000,
		pause: 'hover',
		keyboard: true
	});

	let isPaused = false;

	// 鍵盤切換時自動切換至 aria-live="polite" 以便報讀
	carouselElement.addEventListener('keydown', function(e) {
		if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
			carouselElement.setAttribute('aria-live', 'polite');
		}
	});

	pauseBtn.addEventListener('click', function() {
		if (!isPaused) {
			carousel.pause();
			carouselElement.setAttribute('aria-live', 'polite'); // 停止時允許報讀新內容
			pauseBtn.innerText = '開始輪播';
			pauseBtn.setAttribute('aria-label', '開始輪播動畫');
			isPaused = true;
		} else {
			carousel.cycle();
			carouselElement.setAttribute('aria-live', 'off'); // 播放時不干擾
			pauseBtn.innerText = '暫停輪播';
			pauseBtn.setAttribute('aria-label', '停止輪播動畫');
			isPaused = false;
		}
	});
}

document.addEventListener('DOMContentLoaded', fetchAndInitCarousel);

document.addEventListener('DOMContentLoaded', function () {
    const navbarCollapse = document.getElementById('navbarNav');
    const navbarToggler = document.querySelector('.navbar-toggler');
    
    // 初始化 Bootstrap Collapse 實例
    const bsCollapse = new bootstrap.Collapse(navbarCollapse, {
        toggle: false
    });

    // A. 監聽 Esc 鍵：當選單開啟時，按下 Esc 應關閉選單並將焦點還給漢堡鈕
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && navbarCollapse.classList.contains('show')) {
            bsCollapse.hide();
            navbarToggler.focus(); // 重要：將焦點移回觸發按鈕，方便後續操作
        }
    });

    // B. 監聽焦點移出：當使用者使用 Tab 鍵遊走，焦點離開選單範圍時，自動收合選單
    navbarCollapse.addEventListener('focusout', function (e) {
        // 使用 setTimeout 確保能獲取到下一個獲得焦點的元素 (e.relatedTarget)
        setTimeout(() => {
            const activeElement = document.activeElement;
            // 如果新焦點不在選單內，且新焦點也不是選單切換鈕，則收合選單
            if (!navbarCollapse.contains(activeElement) && activeElement !== navbarToggler) {
                if (navbarCollapse.classList.contains('show')) {
                    bsCollapse.hide();
                }
            }
        }, 10);
    });
});