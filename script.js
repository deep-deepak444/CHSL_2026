// Service Worker को रजिस्टर करने का कोड
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => {
        console.log('Service Worker registered successfully:', registration);
      })
      .catch(error => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

// --- यहाँ रैंडम करने वाला नया फंक्शन जोड़ा गया है ---
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

// ग्लोबल वेरिएबल्स
let questions = [];
let videoURL = null;
let currentIndex = 0;
let score = 0;
let timerInterval;
let attemptedCount = 0;

// localStorage से यूजर का नाम सुरक्षित रूप से प्राप्त करें
const userData = JSON.parse(localStorage.getItem("deepStudyUser"));
const userName = userData ? userData.name : "User";

// URL से विषय और टॉपिक प्राप्त करें
const urlParams = new URLSearchParams(window.location.search);
const subject = urlParams.get("subject");
const topic = urlParams.get("topic");

// --- क्विज़ रिज्यूम करने का लॉजिक ---
const savedProgress = JSON.parse(localStorage.getItem('quizProgress'));

if (savedProgress && savedProgress.subject === subject && savedProgress.topic === topic) {
  currentIndex = savedProgress.currentIndex;
  score = savedProgress.score;
  attemptedCount = savedProgress.attemptedCount || 0;
}

// प्रश्नों वाली JSON फ़ाइल को लोड करें
fetch(`subjects/${subject}/${topic}.json`)
  .then(res => {
    if (!res.ok) { throw new Error('Network response was not ok'); }
    return res.json();
  })
  .then(data => {
    let fetchedQuestions = data.questions;
    videoURL = data.video;
    shuffleArray(fetchedQuestions);
    questions = fetchedQuestions;

    document.getElementById("topic-name").textContent = "📖 " + data.topic;
    showQuestion();
    startTimer();
  })
  .catch(error => {
    console.error('Failed to load quiz:', error);
    document.querySelector(".quiz-container").innerHTML = `<h2>अभी तक Youtube SUBSCRIBE कम होने के कारण इस विषय की quiz upload नहीं की गई है । कृपया सहयोग करें।</h2>`;
  });

// प्रश्न और विकल्प दिखाने वाला फंक्शन
function showQuestion() {
    // क्विज़ चलने के दौरान Back बटन को छिपा दें
    document.querySelector('.back-btn').style.display = 'none';

    if (currentIndex >= questions.length) {
        endQuiz();
        return;
    }

    const q = questions[currentIndex];
    const questionBox = document.getElementById("question-box");
    const optionsDiv = document.getElementById("options");
    
    // पहले पुराने कंटेंट को साफ करें
    questionBox.innerHTML = ''; 
    optionsDiv.innerHTML = '';

    // अब प्रश्न के 'type' के आधार पर HTML बनाएँ
    if (q.type === 'statement' && q.statements) {
        // कथन वाले प्रश्न के लिए
        questionBox.innerHTML = `<p>Q${currentIndex + 1}. ${q.question}</p>`;
        const statementsContainer = document.createElement('div');
        statementsContainer.className = 'statements-container';
        q.statements.forEach(stmt => {
            const p = document.createElement('p');
            p.className = 'statement-item';
            p.textContent = stmt;
            statementsContainer.appendChild(p);
        });
        questionBox.appendChild(statementsContainer);

    } else if (q.type === 'match' && q.list1 && q.list2) {
        // सूची-मिलान वाले प्रश्न के लिए
        questionBox.innerHTML = `<p>Q${currentIndex + 1}. ${q.question}</p>`;
        const matchContainer = document.createElement('div');
        matchContainer.className = 'match-container';

        // List 1 बनाने का कोड
        const list1Div = document.createElement('div');
        list1Div.className = 'match-list';
        let list1HTML = `<h4>${q.list1.title}</h4><ul>`;
        q.list1.items.forEach(item => { list1HTML += `<li>${item}</li>`; });
        list1HTML += '</ul>';
        list1Div.innerHTML = list1HTML;

        // List 2 बनाने का कोड
        const list2Div = document.createElement('div');
        list2Div.className = 'match-list';
        let list2HTML = `<h4>${q.list2.title}</h4><ul>`;
        q.list2.items.forEach(item => { list2HTML += `<li>${item}</li>`; });
        list2HTML += '</ul>';
        list2Div.innerHTML = list2HTML;
        
        matchContainer.appendChild(list1Div);
        matchContainer.appendChild(list2Div);
        questionBox.appendChild(matchContainer);

    } else {
        // साधारण प्रश्न (Default)
        questionBox.textContent = `Q${currentIndex + 1}. ${q.question}`;
    }

    // विकल्प (Options) बनाने का कोड सभी प्रकार के प्रश्नों के लिए समान रहेगा
    q.options.forEach(opt => {
        let btn = document.createElement("button");
        btn.className = "option-btn";
        btn.textContent = opt;
        btn.onclick = () => checkAnswer(btn, q.answer);
        optionsDiv.appendChild(btn);
    });

    const skipBtn = document.createElement("button");
    skipBtn.className = "option-btn skip";
    skipBtn.textContent = "Skip ❓";
    skipBtn.onclick = () => nextQuestion();
    optionsDiv.appendChild(skipBtn);
}

// उत्तर की जाँच करने वाला फंक्शन
function checkAnswer(selectedBtn, correct) {
  attemptedCount++;
  document.querySelectorAll(".option-btn").forEach(btn => {
    btn.disabled = true;
    if (btn.textContent === correct) {
      btn.classList.add("correct");
      if (btn === selectedBtn) {
        score++;
        showMessage();
      }
    } else if (btn === selectedBtn) {
      btn.classList.add("wrong", "shake");
    }
  });

  setTimeout(() => {
    nextQuestion();
  }, 800);
}

// अगला प्रश्न दिखाने वाला फंक्शन
function nextQuestion() {
  const progress = {
    subject: subject,
    topic: topic,
    currentIndex: currentIndex + 1,
    score: score,
    attemptedCount: attemptedCount
  };
  localStorage.setItem('quizProgress', JSON.stringify(progress));

  currentIndex++;
  showQuestion();
}

// endQuiz फंक्शन
// endQuiz फंक्शन का नया और अपडेटेड संस्करण
function endQuiz() {
  const totalQuestions = questions.length;
  const correctAnswers = score;
  const attemptedQuestions = attemptedCount;
  const wrongAnswers = attemptedQuestions - correctAnswers;
  const unattemptedQuestions = totalQuestions - attemptedQuestions;
  const percentage = totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

  let message = "";
  if (percentage >= 80) {
    message = `🎉 शाबाश, ${userName}! बेहतरीन प्रदर्शन!`;
  } else if (percentage >= 60) {
    message = `👍 बहुत अच्छा, ${userName}! आप सही रास्ते पर हैं।`;
  } else if (percentage >= 40) {
    message = `😊 आपका प्रयास अच्छा रहा, थोड़ा और अभ्यास करें।`;
  } else {
    message = `💪 ${userName}, आपको अभी और मेहनत की जरूरत है।`;
  }

  const history = JSON.parse(localStorage.getItem('deepStudyHistory')) || [];
  const newResult = {
    subject: subject,
    topic: topic,
    score: correctAnswers,
    total: totalQuestions,
    date: new Date().toLocaleDateString("hi-IN", { day: 'numeric', month: 'long', year: 'numeric' })
  };
  history.push(newResult);
  localStorage.setItem('deepStudyHistory', JSON.stringify(history));
  localStorage.removeItem('quizProgress');

  document.querySelector('.back-btn').style.display = 'block';

  clearInterval(timerInterval);
  document.querySelector(".quiz-container").style.display = "none";
  let resultBox = document.getElementById("result-box");
  resultBox.style.display = "block";

  // --- यहाँ से नया कोड जोड़ा गया है ---

  // YouTube बटन का HTML बनाएँ (सिर्फ तभी जब videoURL मौजूद हो)
  const videoButtonHTML = videoURL 
    ? `<a href="${videoURL}" target="_blank" class="result-action-btn youtube">
         ▶️ कॉन्सेप्ट वीडियो देखें
       </a>` 
    : '';

  // Telegram बटन का HTML बनाएँ (यहाँ अपने ग्रुप का सही लिंक डालें)
  const telegramButtonHTML = `
    <a href="https://t.me/deepstudy_official" target="_blank" class="result-action-btn telegram">
      💬 डाउट पूछें
    </a>`;

  // --- यहाँ तक नया कोड है ---


  resultBox.innerHTML = `
    <div class="result-card-details">
      <h3 class="result-topic">${topic.replace(/_/g, ' ').toUpperCase()}</h3>
      <p class="result-message">${message}</p>
      <div class="stats-container">
        <div class="stat-row">
          <span class="stat-label">कुल प्रश्न :</span>
          <span class="stat-value">${totalQuestions}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">प्रयास किए :</span>
          <span class="stat-value">${attemptedQuestions}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">सही उत्तर 👍:</span>
          <span class="stat-value correct">${correctAnswers}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">गलत उत्तर 👎:</span>
          <span class="stat-value wrong">${wrongAnswers}</span>
        </div>
        <div class="stat-row">
          <span class="stat-label">छोड़े गए प्रश्न :</span>
          <span class="stat-value unattempted">${unattemptedQuestions}</span>
        </div>
      </div>
      
      <div class="result-actions">
        ${videoButtonHTML}
        ${telegramButtonHTML}
      </div>
    </div>
  `;
}

// टोस्ट नोटिफिकेशन दिखाने वाला फंक्शन
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast-notification";
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => toast.classList.add("show"), 100);

  setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 500);
  }, 3000);
}

// स्कोर के आधार पर मैसेज दिखाने वाला फंक्शन
function showMessage() {
  if (score === 5) showToast("🎉 बहुत अच्छे, " + userName + "!");
  if (score === 10) showToast("👍 शानदार, " + userName + "!");
  if (score === 15) showToast("🚀 बेहतरीन प्रदर्शन, " + userName + "!");
}

// टॉपिक्स पेज पर वापस जाने वाला फंक्शन
function goBack() {
  window.location.href = `topics.html?subject=${subject}`;
}

// टाइमर शुरू करने वाला फंक्शन
function startTimer() {
  let timeLeft = 50 * 60; // 20 मिनट
  const timerEl = document.getElementById("timer");

  timerInterval = setInterval(() => {
    if (timeLeft <= 0) {
      clearInterval(timerInterval);
      endQuiz();
      return;
    }
    let min = Math.floor(timeLeft / 60);
    let sec = timeLeft % 60;
    timerEl.textContent = `${min}:${sec < 10 ? "0" + sec : sec}`;
    timeLeft--;
  }, 1000);
}

// राइट-क्लिक मेनू को रोकने के लिए
window.addEventListener('contextmenu', function (e) { 
  e.preventDefault(); 
}, false);
