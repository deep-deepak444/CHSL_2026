// ===================================================================================
// I. DOM ELEMENTS
// ===================================================================================
const countdownOverlay = document.getElementById('countdown-overlay');
const countdownTimer = document.getElementById('countdown-timer');
const topicTitleHeader = document.getElementById('topic-title-header');
const contentContainer = document.getElementById('content-container');
const themeToggle = document.getElementById('theme-toggle');
const backButton = document.getElementById('back-button');
const selectionBox = document.getElementById('selection-box');
const selectionMenu = document.getElementById('selection-menu');
const highlightBtn = document.getElementById('highlight-btn');
const unhighlightBtn = document.getElementById('unhighlight-btn');
const addCommentBtn = document.getElementById('add-comment-btn');

// ===================================================================================
// II. STATE VARIABLES
// ===================================================================================
let subject = '';
let topic = '';
let totalFiles = 0;
let currentPage = 1;
let isAlertActive = false;
let longPressTimer;
let isLongPressActive = false;
let startX = 0;
let startY = 0;

// ===================================================================================
// III. INITIALIZATION
// ===================================================================================

window.onload = init;

function init() {
  setupTheme();
  startCountdown();
  setupEventListeners();
}

// ===================================================================================
// IV. CORE FUNCTIONS
// ===================================================================================

function startCountdown() {
  let count = 10;
  countdownTimer.textContent = count;

  const timerInterval = setInterval(() => {
    count--;
    countdownTimer.textContent = count;
    if (count <= 0) {
      clearInterval(timerInterval);
      countdownOverlay.style.opacity = '0';
      setTimeout(() => {
        countdownOverlay.classList.add('hidden');
        loadInitialData();
      }, 500);
    }
  }, 1000);
}

async function loadInitialData() {
  const urlParams = new URLSearchParams(window.location.search);
  subject = urlParams.get("subject");
  topic = urlParams.get("topic");

  if (!subject || !topic) {
    contentContainer.innerHTML = `<p style="color:red; text-align:center;">Error: Subject or Topic not found in URL.</p>`;
    return;
  }
  
  topicTitleHeader.textContent = `📖 ${topic.replace(/_/g, ' ').toUpperCase()}`;

  try {
    const infoResponse = await fetch(`subjects/${subject}/${topic}/info.json`);
    if (!infoResponse.ok) throw new Error('info.json file not found.');
    const infoData = await infoResponse.json();
    totalFiles = infoData.totalFiles;
    await loadContent(1);
  } catch (error) {
    console.error("Initialization Error:", error);
    contentContainer.innerHTML = `<p style="color:red; text-align:center;">Could not load content for this topic.</p>`;
  }
}

async function loadContent(pageNumber) {
  currentPage = pageNumber;
  
  try {
    const savedContentKey = `content_${subject}_${topic}_${pageNumber}`;
    const savedContent = localStorage.getItem(savedContentKey);
    let contentHtml = '';

    if (savedContent) {
      contentHtml = savedContent;
    } else {
      const response = await fetch(`subjects/${subject}/${topic}/${pageNumber}.html`);
      if (!response.ok) throw new Error(`Page ${pageNumber}.html not found.`);
      contentHtml = await response.text();
    }

    contentContainer.innerHTML = contentHtml;
    
    // ✅ **मुख्य सुधार**: कंटेंट को इंटरैक्टिव बनाने के लिए तैयार करें
    prepareContentForInteraction();

    window.scrollTo(0, 0);
    loadComments();
    setupScrollListener();
  } catch (error) {
    console.error(`Error loading page ${pageNumber}:`, error);
    contentContainer.innerHTML = `<p style="color:red; text-align:center;">Could not load page ${pageNumber}.</p>`;
  }
}

// ===================================================================================
// V. PAGE INTERACTIVITY
// ===================================================================================

/**
 * कंटेंट कंटेनर में मौजूद टेक्स्ट को इंटरैक्शन के लिए तैयार करता है।
 * यह टेक्स्ट नोड्स को अलग-अलग शब्दों में तोड़ता है और हर शब्द को एक <span> में लपेटता है।
 */
function prepareContentForInteraction() {
    const elementsToProcess = contentContainer.querySelectorAll('p, li, h1, h2, h3, h4, h5, h6, blockquote');

    elementsToProcess.forEach(element => {
        if (element.querySelector('span.word')) return;

        const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
        const nodesToReplace = [];
        
        while (walker.nextNode()) {
            const node = walker.currentNode;
            if (node.textContent.trim().length > 0 && node.parentElement.nodeName !== 'SPAN') {
                nodesToReplace.push(node);
            }
        }

        nodesToReplace.forEach(textNode => {
            const words = textNode.textContent.split(/(\s+)/);
            const fragment = document.createDocumentFragment();
            words.forEach(word => {
                if (word.trim().length > 0) {
                    const span = document.createElement('span');
                    span.className = 'word';
                    span.textContent = word;
                    fragment.appendChild(span);
                } else {
                    fragment.appendChild(document.createTextNode(word));
                }
            });
            textNode.parentNode.replaceChild(fragment, textNode);
        });
    });
}


function setupEventListeners() {
  backButton.addEventListener('click', goBack);

  document.addEventListener('touchstart', (e) => {
    if (e.touches.length === 3 && !isAlertActive) {
      isAlertActive = true;
      alert(`प्रिय मित्र,\n\nस्क्रीनशॉट लेकर अपना समय व्यर्थ ना करें। यह कंटेंट हमेशा यहीं और मुफ़्त रहेगा।\n\nकंटेंट इकट्ठा करने से बेहतर होगा कि आप अपना ध्यान अभी पढ़ाई करने पर लगाएं।`);
      setTimeout(() => { isAlertActive = false; }, 500);
    }
  });
  
  const contentArea = document.querySelector('.main-content-wrapper');

  contentArea.addEventListener('touchstart', (e) => {
    if (e.touches.length > 1) return;
    
    startX = e.touches[0].pageX;
    startY = e.touches[0].pageY;

    longPressTimer = setTimeout(() => {
        isLongPressActive = true;
        selectionBox.style.display = 'block';
        selectionBox.style.left = `${startX}px`;
        selectionBox.style.top = `${startY}px`;
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
    }, 500);
  });

  contentArea.addEventListener('touchmove', (e) => {
    if (!isLongPressActive) return;
    e.preventDefault();

    const currentX = e.touches[0].pageX;
    const currentY = e.touches[0].pageY;
    const width = Math.abs(currentX - startX);
    const height = Math.abs(currentY - startY);
    const newLeft = Math.min(currentX, startX);
    const newTop = Math.min(currentY, startY);

    selectionBox.style.width = `${width}px`;
    selectionBox.style.height = `${height}px`;
    selectionBox.style.left = `${newLeft}px`;
    selectionBox.style.top = `${newTop}px`;
  });

  contentArea.addEventListener('touchend', (e) => {
    clearTimeout(longPressTimer);
    if (isLongPressActive) {
        processSelectionBox();
    }
    isLongPressActive = false;
    setTimeout(() => { selectionBox.style.display = 'none'; }, 200);
  });

  document.addEventListener('click', function(event) {
    if (!selectionMenu.contains(event.target)) {
        selectionMenu.classList.add('hidden');
    }
  });
}

function processSelectionBox() {
    const boxRect = selectionBox.getBoundingClientRect();
    const elementsToCheck = contentContainer.querySelectorAll('.word');
    let foundText = false;

    elementsToCheck.forEach(el => {
        const elRect = el.getBoundingClientRect();
        const isOverlapping = !(boxRect.right < elRect.left || boxRect.left > elRect.right || boxRect.bottom < elRect.top || boxRect.top > elRect.bottom);
        if (isOverlapping) {
            foundText = true;
        }
    });

    showSelectionMenu(boxRect, foundText);
}

function showSelectionMenu(boxRect, hasText) {
    selectionMenu.classList.remove('hidden');
    let menuTop = window.scrollY + boxRect.top - selectionMenu.offsetHeight - 5;
    if (menuTop < window.scrollY) {
        menuTop = window.scrollY + boxRect.bottom + 5;
    }
    selectionMenu.style.top = `${menuTop}px`;
    selectionMenu.style.left = `${window.scrollX + boxRect.left}px`;
    
    highlightBtn.disabled = !hasText;
    unhighlightBtn.disabled = !hasText;
    addCommentBtn.disabled = !hasText;
}

// ===================================================================================
// VI. HIGHLIGHT & COMMENT FUNCTIONS
// ===================================================================================

highlightBtn.addEventListener('click', () => {
    const boxRect = selectionBox.getBoundingClientRect();
    const wordsInContent = contentContainer.querySelectorAll('.word');

    wordsInContent.forEach(word => {
        const wordRect = word.getBoundingClientRect();
        const isOverlapping = !(boxRect.right < wordRect.left || boxRect.left > wordRect.right || boxRect.bottom < wordRect.top || boxRect.top > wordRect.bottom);
        if (isOverlapping) {
            word.classList.add('highlighted');
        }
    });

    selectionMenu.classList.add('hidden');
    saveCurrentContent();
});

unhighlightBtn.addEventListener('click', () => {
    const boxRect = selectionBox.getBoundingClientRect();
    const highlightedWords = contentContainer.querySelectorAll('.word.highlighted');

    highlightedWords.forEach(word => {
        const wordRect = word.getBoundingClientRect();
        const isOverlapping = !(boxRect.right < wordRect.left || boxRect.left > wordRect.right || boxRect.bottom < wordRect.top || boxRect.top > wordRect.bottom);
        if (isOverlapping) {
            word.classList.remove('highlighted');
        }
    });
    
    selectionMenu.classList.add('hidden');
    saveCurrentContent();
});

addCommentBtn.addEventListener('click', () => {
    const commentText = prompt("अपना नोट या कमेंट यहाँ लिखें:", "");
    if (commentText && commentText.trim() !== "") {
        const boxRect = selectionBox.getBoundingClientRect();
        const contentRect = contentContainer.getBoundingClientRect();
        
        // कमेंट आइकन को सिलेक्शन बॉक्स के टॉप-राइट कोने पर रखें
        const x = (boxRect.left - contentRect.left) + boxRect.width;
        const y = (boxRect.top - contentRect.top);

        const commentData = { id: Date.now(), text: commentText, x: x, y: y };
        saveComment(commentData);
        createCommentBox(commentData);
    }
    selectionMenu.classList.add('hidden');
});

// ===================================================================================
// VII. DATA PERSISTENCE
// ===================================================================================

function saveCurrentContent() {
  const contentToSave = contentContainer.innerHTML;
  const key = `content_${subject}_${topic}_${currentPage}`;
  localStorage.setItem(key, contentToSave);
}

function saveComment(commentData) {
    const key = `comments_${subject}_${topic}_${currentPage}`;
    let comments = JSON.parse(localStorage.getItem(key)) || [];
    comments.push(commentData);
    localStorage.setItem(key, JSON.stringify(comments));
}

function loadComments() {
    // पहले मौजूदा कमेंट्स को साफ़ करें
    const existingCommentLayer = document.getElementById('comment-layer');
    if (existingCommentLayer) existingCommentLayer.remove();

    // एक नया कमेंट लेयर बनाएं
    const commentLayer = document.createElement('div');
    commentLayer.id = 'comment-layer';
    contentContainer.parentNode.insertBefore(commentLayer, contentContainer.nextSibling);

    const key = `comments_${subject}_${topic}_${currentPage}`;
    const comments = JSON.parse(localStorage.getItem(key)) || [];
    comments.forEach(createCommentBox);
}

function createCommentBox(commentData) {
    const commentLayer = document.getElementById('comment-layer');
    if (!commentLayer) return;
    
    const box = document.createElement('div');
    box.className = 'comment-box';
    box.style.left = `${commentData.x}px`;
    box.style.top = `${commentData.y}px`;
    box.textContent = '📝'; // इमोजी का उपयोग करें
    box.title = commentData.text; // पूरा टेक्स्ट टूलटिप में दिखाएं
    
    box.onclick = (e) => {
        e.stopPropagation();
        alert(`आपका नोट:\n\n${commentData.text}`);
    };
    
    commentLayer.appendChild(box);
}


// ===================================================================================
// VIII. HELPER & NAVIGATION FUNCTIONS
// ===================================================================================

function setupTheme() {
  if (localStorage.getItem('theme') === 'dark') {
    themeToggle.checked = true;
    document.body.classList.add('dark-mode');
  }
  themeToggle.addEventListener('click', () => {
    if (themeToggle.checked) {
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
    } else {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('theme', 'light');
    }
  });
}

function setupScrollListener() {
    const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
            createNavButtons();
            observer.disconnect();
        }
    }, { root: null, threshold: 1.0 });

    let marker = document.querySelector('#scroll-marker');
    if (marker) marker.remove();
    marker = document.createElement('div');
    marker.id = 'scroll-marker';
    contentContainer.appendChild(marker);
    observer.observe(marker);
}

function createNavButtons() {
    const existingNav = contentContainer.querySelector('.nav-buttons-container');
    if(existingNav) existingNav.remove();
    const navContainer = document.createElement('div');
    navContainer.className = 'nav-buttons-container';
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'nav-btn';
        prevBtn.textContent = '< पिछला';
        prevBtn.onclick = () => loadContent(currentPage - 1);
        navContainer.appendChild(prevBtn);
    }
    if (currentPage < totalFiles) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'nav-btn';
        nextBtn.textContent = 'अगला >';
        nextBtn.onclick = () => loadContent(currentPage + 1);
        navContainer.appendChild(nextBtn);
    }
    if (navContainer.hasChildNodes()) {
        contentContainer.appendChild(navContainer);
    }
}

function goBack() {
  if (subject) {
    window.location.href = `topics.html?subject=${subject}`;
  } else {
    window.location.href = 'subjects.html';
  }
}
