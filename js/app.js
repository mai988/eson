var App = {
    currentTab: 'learn',
    learnNav: { subject: null, unit: null, lesson: null },
    practiceQuestions: null,
    currentQuestionIndex: 0,
    answered: false,
    advanceAfterHint: false,
    practiceMode: false,
    currentGrade: 1,
    currentHint: '',
    wrongMode: false,
    wrongQuestions: [],

    init: function() {
        this.currentGrade = Storage.getGrade();
        Speech.init();
        this.bindNav();
        this.updateGradeDisplay();
        this.checkDailyStreak();
        this.checkLogin();
    },

    checkLogin: function() {
        var user = Storage.getUser();
        if (!user) {
            this.showLoginModal();
        } else {
            this.updateUserDisplay();
            this.renderTab('learn');
        }
    },

    showLoginModal: function() {
        var modal = document.getElementById('login-modal');
        if (modal) {
            modal.style.display = 'flex';
            var input = document.getElementById('login-name-input');
            if (input) {
                setTimeout(function() { input.focus(); }, 300);
            }
        }
    },

    doLogin: function() {
        var input = document.getElementById('login-name-input');
        var errorEl = document.getElementById('login-error');
        var name = input ? input.value.trim() : '';
        
        if (!name) {
            if (errorEl) errorEl.style.display = 'block';
            return;
        }
        if (errorEl) errorEl.style.display = 'none';
        
        Storage.setUser(name);
        this.updateUserDisplay();
        
        var modal = document.getElementById('login-modal');
        if (modal) modal.style.display = 'none';
        
        this.renderTab('learn');
        
        // 移动端关键：在用户点击事件中预热并立即播报
        // 这样能确保后续的语音播报也能正常工作
        Speech.warmUp();
        Speech.speak('欢迎你，' + name + '！');
    },

    doLogout: function() {
        if (confirm('确定要退出登录吗？学习数据会保留哦～')) {
            Storage.clearUser();
            this.updateUserDisplay();
            this.showLoginModal();
        }
    },

    updateUserDisplay: function() {
        var user = Storage.getUser();
        var headerUser = document.getElementById('header-user');
        var headerUserName = document.getElementById('header-user-name');
        if (headerUser && headerUserName) {
            if (user) {
                headerUserName.textContent = user.name;
                headerUser.style.display = 'inline-flex';
            } else {
                headerUser.style.display = 'none';
            }
        }
    },

    bindNav: function() {
        var btns = document.querySelectorAll('.nav-btn');
        for (var i = 0; i < btns.length; i++) {
            var self = this;
            btns[i].addEventListener('click', function() {
                self.switchTab(this.dataset.tab);
            });
        }
    },

    switchTab: function(tab) {
        this.currentTab = tab;
        this.wrongMode = false;
        var btns = document.querySelectorAll('.nav-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].dataset.tab === tab) {
                btns[i].classList.add('active');
            } else {
                btns[i].classList.remove('active');
            }
        }
        this.renderTab(tab);
        Speech.stop();
    },

    renderTab: function(tab) {
        var main = document.getElementById('main-content');
        main.innerHTML = '';
        main.classList.add('fade-in');
        var self = this;
        setTimeout(function() { main.classList.remove('fade-in'); }, 300);

        if (tab === 'learn') this.renderLearn();
        else if (tab === 'daily') this.renderDaily();
        else if (tab === 'profile') this.renderProfile();
        else if (tab === 'practice') this.renderPractice();
        else if (tab === 'workshop') this.renderWorkshop();
        main.scrollTop = 0;
    },

    updateGradeDisplay: function() {
        var el = document.getElementById('current-grade');
        if (el) {
            var gradeNames = ['一年级', '二年级', '三年级', '四年级', '五年级', '六年级'];
            el.textContent = gradeNames[this.currentGrade - 1] || (this.currentGrade + '年级');
        }
    },

    showGradeSelector: function() {
        document.getElementById('grade-modal').style.display = 'flex';
    },

    closeGradeSelector: function() {
        document.getElementById('grade-modal').style.display = 'none';
    },

    selectGrade: function(grade) {
        this.currentGrade = grade;
        Storage.setGrade(grade);
        this.learnNav = { subject: null, unit: null, lesson: null };
        this.updateGradeDisplay();
        var cards = document.querySelectorAll('.grade-card');
        for (var i = 0; i < cards.length; i++) {
            if (cards[i].dataset.grade == grade) {
                cards[i].classList.add('selected');
            } else {
                cards[i].classList.remove('selected');
            }
        }
        this.closeGradeSelector();
        Speech.speak('已切换到' + grade + '年级');
        this.renderTab('learn');
    },

    checkDailyStreak: function() {
        var streak = Storage.getStreak();
        if (streak >= 3) {
            var achievements = Storage.checkAchievements();
            if (achievements.length > 0) this.showAchievement(achievements[0]);
        }
    },

    renderLearn: function() {
        var subject = this.learnNav.subject;
        var unit = this.learnNav.unit;
        var lesson = this.learnNav.lesson;
        if (lesson) this.renderLessonPage(lesson, subject);
        else if (unit) this.renderLessonList(unit, subject);
        else if (subject) this.renderUnitList(subject);
        else this.renderSubjectSelect();
    },

    renderSubjectSelect: function() {
        var main = document.getElementById('main-content');
        var subjects = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS || {};
        var html = '<h2 class="page-title">' + this.currentGrade + '年级 · 选择科目</h2><div class="subject-grid">';

        var subjectIds = Object.keys(subjects);
        for (var i = 0; i < subjectIds.length; i++) {
            var s = subjects[subjectIds[i]];
            var progress = Storage.getSubjectProgress(s.id);
            html += '<div class="subject-card ' + s.color + '" onclick="App.selectSubject(\'' + s.id + '\')">';
            html += '<span class="subject-emoji">' + s.emoji + '</span>';
            html += '<div class="subject-info"><div class="subject-name">' + s.name + '</div>';
            html += '<div class="subject-desc">' + s.desc + ' · 已学' + progress.completed + '/' + progress.total + '课</div></div>';
            html += '<span class="subject-arrow">▶</span></div>';
        }
        html += '</div>';
        main.innerHTML = html;
    },

    selectSubject: function(subjectId) {
        this.learnNav.subject = subjectId;
        this.renderLearn();
    },

    renderUnitList: function(subjectId) {
        var main = document.getElementById('main-content');
        var subject = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[subjectId];
        var units = window.LEARNING_DATA && window.LEARNING_DATA.UNITS && window.LEARNING_DATA.UNITS[this.currentGrade] && window.LEARNING_DATA.UNITS[this.currentGrade][subjectId];

        if (!units || units.length === 0) {
            var subjectName = subject ? subject.name : '';
            main.innerHTML = '<button class="back-btn" onclick="App.goBack(\'subject\')">← 返回</button>' +
                '<div class="empty-state"><div class="empty-state-icon">📚</div><div class="empty-state-text">' + this.currentGrade + '年级' + subjectName + '内容正在编写中...</div></div>';
            return;
        }

        var html = '<button class="back-btn" onclick="App.goBack(\'subject\')">← 返回</button>' +
            '<h2 class="page-title">' + subject.emoji + ' ' + this.currentGrade + '年级' + subject.name + '</h2><div class="unit-list">';

        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            var completedCount = 0;
            for (var j = 0; j < unit.lessons.length; j++) {
                if (Storage.isLessonComplete(unit.lessons[j].id, subjectId)) completedCount++;
            }
            var allCompleted = completedCount === unit.lessons.length;
            html += '<div class="unit-card ' + (allCompleted ? 'completed' : '') + '" onclick="App.selectUnit(' + i + ')">';
            html += '<div class="unit-number">' + (allCompleted ? '✓' : (i + 1)) + '</div>';
            html += '<div class="unit-info"><div class="unit-title">' + unit.name + '</div>';
            html += '<div class="unit-progress-text">已完成 ' + completedCount + '/' + unit.lessons.length + ' 课</div></div>';
            html += '<span class="unit-status">' + (allCompleted ? '🎉' : '▶') + '</span></div>';
        }
        html += '</div>';
        main.innerHTML = html;
    },

    selectUnit: function(unitIndex) {
        var units = window.LEARNING_DATA && window.LEARNING_DATA.UNITS && window.LEARNING_DATA.UNITS[this.currentGrade] && window.LEARNING_DATA.UNITS[this.currentGrade][this.learnNav.subject];
        if (units && units[unitIndex]) {
            this.learnNav.unit = units[unitIndex];
            this.renderLearn();
        }
    },

    renderLessonList: function(unit, subjectId) {
        var main = document.getElementById('main-content');
        var subject = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[subjectId];

        var html = '<button class="back-btn" onclick="App.goBack(\'unit\')">← 返回单元</button>' +
            '<h2 class="page-title">' + (subject ? subject.emoji : '') + ' ' + unit.name + '</h2><div class="unit-list">';

        for (var i = 0; i < unit.lessons.length; i++) {
            var lesson = unit.lessons[i];
            var completed = Storage.isLessonComplete(lesson.id, subjectId);
            var qCount = lesson.questions ? lesson.questions.length : 0;
            html += '<div class="unit-card ' + (completed ? 'completed' : '') + '" onclick="App.selectLesson(' + i + ')">';
            html += '<div class="unit-number">' + (completed ? '✓' : (i + 1)) + '</div>';
            html += '<div class="unit-info"><div class="unit-title">' + lesson.title + '</div>';
            html += '<div class="unit-progress-text">' + qCount + '道练习题</div></div>';
            html += '<span class="unit-status">' + (completed ? '🎉' : '▶') + '</span></div>';
        }
        html += '</div>';
        main.innerHTML = html;
    },

    selectLesson: function(lessonIndex) {
        this.learnNav.lesson = this.learnNav.unit.lessons[lessonIndex];
        this.currentQuestionIndex = 0;
        this.answered = false;
        this.renderLearn();
    },

    renderLessonPage: function(lesson, subjectId) {
        var main = document.getElementById('main-content');
        var kn = lesson.knowledge;

        var html = '<button class="back-btn" onclick="App.goBack(\'lesson\')">← 返回</button><div class="learn-page">';
        html += '<div class="knowledge-card"><div class="knowledge-header">';
        html += '<div class="knowledge-title">📚 ' + kn.title + '</div>';
        html += '<button class="btn-speak" id="speak-knowledge-btn">🔊 播报</button>';
        html += '</div><div class="knowledge-content">' + kn.content + '</div>';

        if (kn.chars && kn.chars.length > 0) {
            html += '<div class="knowledge-emoji-row">';
            for (var i = 0; i < kn.chars.length; i++) {
                var c = kn.chars[i];
                html += '<div class="knowledge-char-card" onclick="Speech.speakChar(\'' + c.char + '\',\'' + c.pinyin + '\')">';
                html += '<div class="knowledge-char">' + c.char + '</div><div class="knowledge-pinyin">' + c.pinyin + '</div></div>';
            }
            html += '</div>';
        }
        html += '</div><div class="practice-section">';
        html += '<div class="practice-header"><div class="practice-title">✏️ 随堂练习</div>';
        html += '<button class="btn-speak" onclick="App.speakCurrentQuestion()">🔊 播报题目</button>';
        html += '</div><div id="question-area"></div></div></div>';
        main.innerHTML = html;

        var speakBtn = document.getElementById('speak-knowledge-btn');
        if (speakBtn) {
            speakBtn.onclick = function() {
                Speech.warmUp();
                Speech.speakKnowledge({ title: kn.title, content: kn.content });
            };
        }

        this.renderQuestion();
    },

    renderQuestion: function() {
        var lesson = this.learnNav.lesson;
        if (!lesson || !lesson.questions) return;
        var question = lesson.questions[this.currentQuestionIndex];
        var area = document.getElementById('question-area');
        if (!area || !question) return;

        var html = '<div class="question-text">第 ' + (this.currentQuestionIndex + 1) + ' / ' + lesson.questions.length + ' 题</div>';
        html += '<div class="question-text">' + question.content + '</div>';

        if (question.type === 'choice' || question.type === 'truefalse') {
            html += '<div class="options-grid">';
            var letters = ['A', 'B', 'C', 'D'];
            for (var i = 0; i < question.options.length; i++) {
                html += '<button class="option-btn" data-index="' + i + '" onclick="App.answerChoice(' + i + ')">';
                html += '<span class="option-letter">' + letters[i] + '</span><span>' + question.options[i] + '</span></button>';
            }
            html += '</div>';
        }
        area.innerHTML = html;
        this.answered = false;

        // 移动端自动播放策略限制，不自动播报，由用户点击播报按钮
    },

    speakCurrentQuestion: function() {
        var lesson = this.learnNav.lesson;
        if (lesson && lesson.questions) {
            var question = lesson.questions[this.currentQuestionIndex];
            if (question) {
                Speech.warmUp();
                Speech.speakQuestion(question);
            }
        }
    },

    answerChoice: function(index) {
        if (this.answered) return;
        this.answered = true;

        var lesson = this.learnNav.lesson;
        var subjectId = this.learnNav.subject;
        var question = lesson.questions[this.currentQuestionIndex];
        var correct = index === question.answer;

        var btns = document.querySelectorAll('.option-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].style.pointerEvents = 'none';
            var btnIndex = parseInt(btns[i].dataset.index);
            if (btnIndex === question.answer) btns[i].classList.add('correct');
            else if (btnIndex === index) btns[i].classList.add('wrong');
        }

        Storage.recordAnswer(subjectId, question.id, correct);
        if (correct) Storage.removeWrongQuestion(question.id);
        else Storage.addWrongQuestion(question, subjectId);

        var tasks = Storage.getDailyTasks();
        if (tasks[subjectId]) tasks[subjectId].completed++;
        Storage.updateDailyProgress();

        Speech.speakFeedback(correct);
        if (!correct) {
            Speech.speak('❌ 答错了。' + question.hint, 0.85);
        }
        var self = this;
        setTimeout(function() { self.showFeedback(correct, question.hint); }, 600);
    },

    showFeedback: function(correct, hint) {
        var modal = document.getElementById('feedback-modal');
        var icon = document.getElementById('feedback-icon');
        var text = document.getElementById('feedback-text');

        if (correct) {
            icon.textContent = '✅';
            var messages = ['太棒了！', '真厉害！', '答对了！', '你真聪明！'];
            text.textContent = messages[Math.floor(Math.random() * 4)];
            text.style.color = 'var(--success-green)';
            modal.style.display = 'flex';
        } else {
            this.advanceAfterHint = true;
            this.currentHint = hint;
            this.showHint('❌ 答错了。' + hint);
        }
    },

    closeFeedback: function() {
        document.getElementById('feedback-modal').style.display = 'none';
        if (this.wrongMode) {
            this.nextWrongQuestion();
            return;
        }
        var lesson = this.learnNav.lesson;
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < lesson.questions.length) {
            this.renderQuestion();
        } else {
            Storage.markLessonComplete(lesson.id, this.learnNav.subject);
            this.showLessonComplete();
            var achievements = Storage.checkAchievements();
            var self = this;
            if (achievements.length > 0) {
                Speech.speakAchievement(achievements[0].title);
                setTimeout(function() { self.showAchievement(achievements[0]); }, 1500);
            }
        }
    },

    showHint: function(hint) {
        var modal = document.getElementById('hint-modal');
        document.getElementById('hint-text').textContent = hint;
        modal.style.display = 'flex';
    },

    closeHint: function() {
        document.getElementById('hint-modal').style.display = 'none';
        if (this.advanceAfterHint) {
            this.advanceAfterHint = false;
            if (this.wrongMode) {
                this.nextWrongQuestion();
            } else if (this.practiceMode) {
                this.practiceMode = false;
                this.nextPracticeQuestion();
            } else {
                var lesson = this.learnNav.lesson;
                this.currentQuestionIndex++;
                if (this.currentQuestionIndex < lesson.questions.length) {
                    this.renderQuestion();
                } else {
                    Storage.markLessonComplete(lesson.id, this.learnNav.subject);
                    this.showLessonComplete();
                }
            }
        }
    },

    showLessonComplete: function() {
        var modal = document.getElementById('feedback-modal');
        document.getElementById('feedback-icon').textContent = '🎉';
        document.getElementById('feedback-text').textContent = '本课全部完成！太棒了！';
        document.getElementById('feedback-text').style.color = 'var(--primary-orange)';
        modal.style.display = 'flex';
        var self = this;
        var btn = modal.querySelector('.modal-close-btn');
        btn.onclick = function() {
            modal.style.display = 'none';
            self.learnNav.lesson = null;
            self.renderLearn();
        };
    },

    showAchievement: function(achievement) {
        var modal = document.getElementById('achievement-modal');
        document.getElementById('achievement-title').textContent = achievement.title;
        document.getElementById('achievement-desc').textContent = achievement.desc;
        modal.style.display = 'flex';
        Speech.speakAchievement(achievement.title);
    },

    closeAchievement: function() {
        document.getElementById('achievement-modal').style.display = 'none';
    },

    goBack: function(level) {
        if (level === 'lesson') this.learnNav.lesson = null;
        else if (level === 'unit') this.learnNav.unit = null;
        else if (level === 'subject') this.learnNav.subject = null;
        this.renderLearn();
    },

    renderDaily: function() {
        var main = document.getElementById('main-content');
        var tasks = Storage.getDailyTasks();
        var streak = Storage.getStreak();

        var avgProgress = (tasks.math.completed / tasks.math.target + tasks.chinese.completed / tasks.chinese.target + tasks.english.completed / tasks.english.target) / 3 * 100;

        var html = '<div class="daily-page">';
        html += '<div class="daily-header"><div class="daily-date">' + new Date().toLocaleDateString('zh-CN') + '</div>';
        html += '<div class="daily-progress-text">今日进度 <span class="completed">' + Math.round(avgProgress) + '%</span></div></div>';

        html += '<div class="daily-tasks">';
        var taskList = [
            { id: 'math', icon: '🔢', title: '数学练习', target: tasks.math.target },
            { id: 'chinese', icon: '📖', title: '语文练习', target: tasks.chinese.target },
            { id: 'english', icon: '🅰️', title: '英语练习', target: tasks.english.target }
        ];
        for (var i = 0; i < taskList.length; i++) {
            var task = taskList[i];
            var completed = tasks[task.id].completed >= task.target;
            html += '<div class="daily-task-card ' + (completed ? 'completed' : 'pending') + '" onclick="App.startDailyTask(\'' + task.id + '\')">';
            html += '<span class="task-icon">' + task.icon + '</span>';
            html += '<div class="task-info"><div class="task-title">' + task.title + '</div>';
            html += '<div class="task-desc">完成' + task.target + '道题目</div></div>';
            html += '<span class="task-status">' + (completed ? '✅' : tasks[task.id].completed + '/' + task.target) + '</span></div>';
        }
        html += '</div>';

        html += '<div class="daily-action"><div class="streak-display"><span class="streak-count">' + streak + '</span><span class="streak-text">天连续学习</span></div>';
        if (Storage.isDailyComplete()) {
            html += '<button class="btn-primary" onclick="App.startNewDay()">开启新一天</button>';
        } else {
            html += '<button class="btn-secondary">完成今日任务解锁更多</button>';
        }
        html += '</div></div>';

        main.innerHTML = html;
    },

    startDailyTask: function(subjectId) {
        this.learnNav = { subject: subjectId, unit: null, lesson: null };
        this.switchTab('learn');
        var subjectName = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[subjectId] && window.LEARNING_DATA.SUBJECTS[subjectId].name || '';
        Speech.speak('开始今天的' + subjectName + '练习！');
    },

    startNewDay: function() {
        var today = new Date().toDateString();
        var newTasks = {
            math: { completed: 0, target: 5 },
            chinese: { completed: 0, target: 5 },
            english: { completed: 0, target: 3 },
            challenges: { completed: 0, target: 1 },
            streakDay: false
        };
        Storage.set(Storage.KEYS.DAILY_TASKS + '_' + today, newTasks);
        this.renderDaily();
        Speech.speak('新的一天开始啦，加油！');
    },

    renderProfile: function() {
        var main = document.getElementById('main-content');
        var subjects = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS || {};
        var achievements = Storage.getAchievements();

        var html = '<div class="profile-section">';

        var user = Storage.getUser();
        if (user) {
            html += '<div class="profile-card user-info-card">';
            html += '<div class="user-avatar">😊</div>';
            html += '<div class="user-info">';
            html += '<div class="user-name">' + user.name + '</div>';
            html += '<div class="user-desc">小小工程师 · 加油哦～</div>';
            html += '</div>';
            html += '<button class="btn-secondary logout-btn" onclick="App.doLogout()">退出</button>';
            html += '</div>';
        }

        html += '<div class="profile-card"><div class="profile-card-title">📈 各科学习进度</div>';
        var subjectIds = Object.keys(subjects);
        for (var i = 0; i < subjectIds.length; i++) {
            var s = subjects[subjectIds[i]];
            var progress = Storage.getSubjectProgress(s.id);
            var percent = progress.total > 0 ? Math.round(progress.completed / progress.total * 100) : 0;
            html += '<div class="progress-row"><span class="progress-subject">' + s.emoji + s.name + '</span>';
            html += '<div class="progress-bar-bg"><div class="progress-bar-fill ' + s.id + '" style="width:' + percent + '%">' + (percent > 15 ? percent + '%' : '') + '</div></div>';
            html += '<span class="progress-text">' + progress.completed + '/' + progress.total + '</span></div>';
        }
        html += '</div>';

        var streak = Storage.getStreak();
        var totalCompleted = 0, totalAnswers = 0;
        for (var si = 0; si < subjectIds.length; si++) {
            var sp = Storage.getSubjectProgress(subjectIds[si]);
            totalCompleted += sp.completed;
            var ad = Storage.getAccuracy(subjectIds[si]);
            totalAnswers += ad.total;
        }
        html += '<div class="profile-card"><div class="profile-card-title">📊 学习概览</div><div class="stats-grid">';
        html += '<div class="stat-item"><div class="stat-value">' + streak + '</div><div class="stat-label">🔥 连续学习</div></div>';
        html += '<div class="stat-item"><div class="stat-value">' + totalCompleted + '</div><div class="stat-label">📚 已完成课程</div></div>';
        html += '<div class="stat-item"><div class="stat-value">' + totalAnswers + '</div><div class="stat-label">✏️ 累计答题</div></div>';
        var unlockedCount = 0;
        for (var ak in achievements) { if (achievements[ak]) unlockedCount++; }
        html += '<div class="stat-item"><div class="stat-value">' + unlockedCount + '</div><div class="stat-label">🏆 获得成就</div></div>';
        html += '</div></div>';

        html += '<div class="profile-card"><div class="profile-card-title">🎯 各科正确率（最近20题）</div><div class="accuracy-circle">';
        for (var j = 0; j < subjectIds.length; j++) {
            var subj = subjects[subjectIds[j]];
            var accData = Storage.getAccuracy(subj.id);
            var pct = Math.round(accData.accuracy * 100);
            var color = subj.id === 'chinese' ? '#FFB088' : subj.id === 'math' ? '#A8D8EA' : '#8BC34A';
            html += '<div class="accuracy-item">';
            html += '<div class="accuracy-ring ' + subj.id + '" style="background:conic-gradient(' + color + ' 0deg, ' + color + ' ' + (pct * 3.6) + 'deg, #F0F0F0 ' + (pct * 3.6) + 'deg)">';
            html += '<span>' + (accData.total > 0 ? pct + '%' : '-') + '</span></div>';
            html += '<div class="accuracy-label">' + subj.name + '</div></div>';
        }
        html += '</div></div>';

        html += '<div class="profile-card"><div class="profile-card-title">📝 错题本</div>';
        var totalWrong = Storage.getWrongQuestions().length;
        html += '<div style="margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">';
        html += '<span style="color:#666;">共 ' + totalWrong + ' 道错题</span>';
        if (totalWrong > 0) {
            html += '<button class="btn-primary" style="padding:8px 16px;font-size:14px;" onclick="App.startWrongReview()">🔄 复习错题</button>';
        }
        html += '</div>';

        html += '<div class="wrong-tabs">';
        for (var k = 0; k < subjectIds.length; k++) {
            var sub = subjects[subjectIds[k]];
            var wrongList = Storage.getWrongBySubject(sub.id);
            html += '<button class="wrong-tab ' + (k === 0 ? 'active' : '') + '" data-subject="' + sub.id + '" onclick="App.switchWrongTab(\'' + sub.id + '\')">' + sub.name + '(' + wrongList.length + ')</button>';
        }
        html += '</div><div id="wrong-list"></div></div>';

        html += '<div class="profile-card"><div class="profile-card-title">🏆 成就</div><div class="achievements-grid">';
        var achievementDefs = [
            { id: 'firstLesson', icon: '🌟', name: '初学者' },
            { id: 'first10', icon: '📚', name: '勤奋学员' },
            { id: 'first50', icon: '🎓', name: '学霸' },
            { id: 'streak3', icon: '🔥', name: '坚持者' },
            { id: 'streak7', icon: '💪', name: '毅力之星' },
            { id: 'streak30', icon: '🏅', name: '学习达人' },
            { id: 'perfectChinese', icon: '📖', name: '语文之星' },
            { id: 'perfectMath', icon: '🔢', name: '数学之星' },
            { id: 'perfectEnglish', icon: '🅰️', name: '英语之星' }
        ];
        for (var a = 0; a < achievementDefs.length; a++) {
            var ach = achievementDefs[a];
            var unlocked = achievements[ach.id];
            html += '<div class="achievement-item ' + (unlocked ? 'unlocked' : 'locked') + '">';
            html += '<span class="achievement-item-icon">' + (unlocked ? ach.icon : '🔒') + '</span>';
            html += '<span class="achievement-item-name">' + ach.name + '</span></div>';
        }
        html += '</div></div></div>';
        main.innerHTML = html;

        this.currentWrongSubject = 'chinese';
        this.renderWrongList('chinese');
    },

    switchWrongTab: function(subjectId) {
        var tabs = document.querySelectorAll('.wrong-tab');
        for (var i = 0; i < tabs.length; i++) {
            if (tabs[i].dataset.subject === subjectId) tabs[i].classList.add('active');
            else tabs[i].classList.remove('active');
        }
        this.currentWrongSubject = subjectId;
        this.renderWrongList(subjectId);
    },

    renderWrongList: function(subjectId) {
        var container = document.getElementById('wrong-list');
        var wrongList = Storage.getWrongBySubject(subjectId);
        if (wrongList.length === 0) {
            container.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🌟</div><div class="empty-state-text">还没有错题哦！</div></div>';
            return;
        }
        var html = '';
        for (var i = 0; i < wrongList.length; i++) {
            var w = wrongList[i];
            html += '<div class="wrong-question-item"><div class="wrong-question-text">' + (i + 1) + '. ' + w.content + '</div>';
            html += '<div class="wrong-answer-row">正确答案：<span class="correct-answer">' + w.correctAnswer + '</span></div>';
            html += '<div class="wrong-hint">💡 ' + w.hint + '</div></div>';
        }
        container.innerHTML = html;
    },

    startWrongReview: function() {
        var wrongList = Storage.getWrongQuestions();
        if (wrongList.length === 0) {
            Speech.speak('你还没有错题哦！');
            return;
        }
        this.wrongMode = true;
        this.wrongQuestions = wrongList.slice();
        this.currentQuestionIndex = 0;
        this.answered = false;
        this.renderWrongReviewPage();
    },

    renderWrongReviewPage: function() {
        var main = document.getElementById('main-content');
        var q = this.wrongQuestions[this.currentQuestionIndex];
        var subject = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[q.subjectId];

        var html = '<button class="back-btn" onclick="App.exitWrongReview()">← 返回</button>';
        html += '<div class="practice-page"><div class="practice-intro">';
        html += '<h2>📝 错题复习</h2>';
        html += '<p>' + (subject ? subject.emoji + ' ' + subject.name : '') + ' · 第 ' + (this.currentQuestionIndex + 1) + '/' + this.wrongQuestions.length + ' 题</p>';
        html += '</div><div class="practice-section"><div class="practice-title">✏️ 错题重做</div>';
        html += '<div id="wrong-question-area"></div></div></div>';
        main.innerHTML = html;

        this.renderWrongQuestion();
    },

    renderWrongQuestion: function() {
        var area = document.getElementById('wrong-question-area');
        if (!area || !this.wrongQuestions || this.wrongQuestions.length === 0) return;

        var q = this.wrongQuestions[this.currentQuestionIndex];
        var html = '<div class="question-text">' + q.content + '</div>';

        if (q.type === 'choice' || q.type === 'truefalse') {
            var questionData = this.findQuestionById(q.questionId, q.subjectId, q.grade);
            if (questionData && questionData.options) {
                html += '<div class="options-grid">';
                var letters = ['A', 'B', 'C', 'D'];
                for (var i = 0; i < questionData.options.length; i++) {
                    html += '<button class="option-btn" data-index="' + i + '" onclick="App.answerWrongChoice(' + i + ')">';
                    html += '<span class="option-letter">' + letters[i] + '</span><span>' + questionData.options[i] + '</span></button>';
                }
                html += '</div>';
            } else {
                html += '<div class="wrong-answer-row">正确答案：<span class="correct-answer">' + q.correctAnswer + '</span></div>';
                html += '<div class="wrong-hint">💡 ' + q.hint + '</div>';
            }
        } else {
            html += '<div class="wrong-answer-row">正确答案：<span class="correct-answer">' + q.correctAnswer + '</span></div>';
            html += '<div class="wrong-hint">💡 ' + q.hint + '</div>';
        }
        area.innerHTML = html;
        this.answered = false;

        if (q.content) {
            var self = this;
            setTimeout(function() {
                try {
                    Speech.synth && Speech.synth.cancel();
                    var utterance = new SpeechSynthesisUtterance(q.content);
                    utterance.lang = 'zh-CN';
                    utterance.rate = 0.9;
                    Speech.synth && Speech.synth.speak(utterance);
                } catch(e) {}
            }, 300);
        }
    },

    findQuestionById: function(questionId, subjectId, grade) {
        var targetGrade = grade || this.currentGrade;
        var units = window.LEARNING_DATA && window.LEARNING_DATA.UNITS && window.LEARNING_DATA.UNITS[targetGrade] && window.LEARNING_DATA.UNITS[targetGrade][subjectId];
        if (!units) return null;
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            for (var j = 0; j < unit.lessons.length; j++) {
                var lesson = unit.lessons[j];
                if (lesson.questions) {
                    for (var k = 0; k < lesson.questions.length; k++) {
                        if (lesson.questions[k].id === questionId) return lesson.questions[k];
                    }
                }
            }
        }
        return null;
    },

    answerWrongChoice: function(index) {
        if (this.answered) return;
        this.answered = true;

        var q = this.wrongQuestions[this.currentQuestionIndex];
        var questionData = this.findQuestionById(q.questionId, q.subjectId, q.grade);
        if (!questionData) return;

        var correct = index === questionData.answer;

        var btns = document.querySelectorAll('.option-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].style.pointerEvents = 'none';
            var btnIndex = parseInt(btns[i].dataset.index);
            if (btnIndex === questionData.answer) btns[i].classList.add('correct');
            else if (btnIndex === index) btns[i].classList.add('wrong');
        }

        if (correct) {
            Storage.removeWrongQuestion(q.questionId);
            Speech.speakFeedback(true);
            var self = this;
            setTimeout(function() {
                var modal = document.getElementById('feedback-modal');
                document.getElementById('feedback-icon').textContent = '✅';
                document.getElementById('feedback-text').textContent = '答对了！已从错题本移除';
                document.getElementById('feedback-text').style.color = 'var(--success-green)';
                modal.style.display = 'flex';
            }, 600);
        } else {
            Storage.recordAnswer(q.subjectId, q.questionId, false);
            Speech.speakFeedback(false);
            Speech.speak('❌ 又错了。' + q.hint, 0.85);
            this.advanceAfterHint = true;
            this.showHint('❌ 又错了。' + q.hint);
        }
    },

    nextWrongQuestion: function() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.wrongQuestions.length) {
            this.renderWrongQuestion();
        } else {
            var modal = document.getElementById('feedback-modal');
            document.getElementById('feedback-icon').textContent = '🎉';
            document.getElementById('feedback-text').textContent = '错题复习完成！太棒了！';
            document.getElementById('feedback-text').style.color = 'var(--primary-orange)';
            modal.style.display = 'flex';
            var self = this;
            var btn = modal.querySelector('.modal-close-btn');
            btn.onclick = function() {
                modal.style.display = 'none';
                self.exitWrongReview();
            };
        }
    },

    exitWrongReview: function() {
        this.wrongMode = false;
        this.wrongQuestions = [];
        this.currentTab = 'profile';
        var btns = document.querySelectorAll('.nav-btn');
        for (var i = 0; i < btns.length; i++) {
            if (btns[i].dataset.tab === 'profile') btns[i].classList.add('active');
            else btns[i].classList.remove('active');
        }
        this.renderProfile();
    },

    renderPractice: function() {
        var main = document.getElementById('main-content');
        var result = Storage.getLowestSubject();
        var subjectId = result.subjectId;
        var accuracy = result.accuracy;
        var hasData = result.hasData;

        if (!hasData) {
            main.innerHTML = '<div class="practice-page"><div class="practice-intro"><h2>🎯 智能推练</h2><p>先完成一些练习题吧！</p></div>' +
                '<div class="encourage-card"><div class="encourage-icon">📚</div><div class="encourage-text">快去学习吧！</div></div></div>';
            return;
        }

        if (accuracy >= 0.8) {
            main.innerHTML = '<div class="practice-page"><div class="practice-intro"><h2>🎯 智能推练</h2><p>你的正确率很高哦！</p></div>' +
                '<div class="encourage-card"><div class="encourage-icon">🏆</div><div class="encourage-text">太棒了，继续学习新知识吧！</div></div></div>';
            return;
        }

        var subject = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[subjectId];
        var questions = Storage.getQuestionsForPractice(subjectId, 3);
        this.practiceQuestions = questions;
        this.currentQuestionIndex = 0;
        this.answered = false;

        var html = '<div class="practice-page"><div class="practice-intro">';
        html += '<h2>🎯 智能推练</h2><p>' + (subject ? subject.emoji + ' ' + subject.name : '') + '需要多练习！</p></div>';
        html += '<div class="practice-section"><div class="practice-title">✏️ 巩固练习</div><div id="practice-question-area"></div></div></div>';
        main.innerHTML = html;
        this.renderPracticeQuestion();
    },

    renderPracticeQuestion: function() {
        var area = document.getElementById('practice-question-area');
        if (!area || !this.practiceQuestions || this.practiceQuestions.length === 0) return;

        var question = this.practiceQuestions[this.currentQuestionIndex];
        var html = '<div class="question-text">第 ' + (this.currentQuestionIndex + 1) + '/3 题</div><div class="question-text">' + question.content + '</div>';

        if (question.type === 'choice' || question.type === 'truefalse') {
            html += '<div class="options-grid">';
            var letters = ['A', 'B', 'C', 'D'];
            for (var i = 0; i < question.options.length; i++) {
                html += '<button class="option-btn" data-index="' + i + '" onclick="App.answerPracticeChoice(' + i + ')">';
                html += '<span class="option-letter">' + letters[i] + '</span><span>' + question.options[i] + '</span></button>';
            }
            html += '</div>';
        }
        area.innerHTML = html;
        this.answered = false;
        // 移动端自动播放策略限制，不自动播报
    },

    answerPracticeChoice: function(index) {
        if (this.answered) return;
        this.answered = true;

        var question = this.practiceQuestions[this.currentQuestionIndex];
        var correct = index === question.answer;

        var btns = document.querySelectorAll('.option-btn');
        for (var i = 0; i < btns.length; i++) {
            btns[i].style.pointerEvents = 'none';
            var btnIndex = parseInt(btns[i].dataset.index);
            if (btnIndex === question.answer) btns[i].classList.add('correct');
            else if (btnIndex === index) btns[i].classList.add('wrong');
        }

        Storage.recordAnswer(question.subjectId, question.id, correct);
        if (correct) Storage.removeWrongQuestion(question.id);
        else Storage.addWrongQuestion(question, question.subjectId);

        Speech.speakFeedback(correct);
        this.showPracticeFeedback(correct, question.hint);
    },

    showPracticeFeedback: function(correct, hint) {
        if (correct) {
            var modal = document.getElementById('feedback-modal');
            document.getElementById('feedback-icon').textContent = '✅';
            document.getElementById('feedback-text').textContent = '答对了！';
            document.getElementById('feedback-text').style.color = 'var(--success-green)';
            modal.style.display = 'flex';
            var self = this;
            var btn = modal.querySelector('.modal-close-btn');
            btn.onclick = function() { modal.style.display = 'none'; self.nextPracticeQuestion(); };
        } else {
            this.advanceAfterHint = true;
            this.practiceMode = true;
            this.currentHint = hint;
            this.showHint('❌ 答错了。' + hint);
        }
    },

    nextPracticeQuestion: function() {
        this.currentQuestionIndex++;
        if (this.currentQuestionIndex < this.practiceQuestions.length) {
            this.renderPracticeQuestion();
        } else {
            var modal = document.getElementById('feedback-modal');
            document.getElementById('feedback-icon').textContent = '🎉';
            document.getElementById('feedback-text').textContent = '巩固练习完成！';
            document.getElementById('feedback-text').style.color = 'var(--primary-orange)';
            modal.style.display = 'flex';
            var self = this;
            var btn = modal.querySelector('.modal-close-btn');
            btn.onclick = function() { modal.style.display = 'none'; self.renderPractice(); };
        }
    },

    renderWorkshop: function() {
        var main = document.getElementById('main-content');
        var challenges = window.LEARNING_DATA && window.LEARNING_DATA.CHALLENGES || [];

        var html = '<div class="workshop-page"><div class="workshop-intro"><div class="workshop-title">🚀 兴趣工坊</div>';
        html += '<div class="workshop-desc">来挑战有趣的理工小任务吧！动手动脑，变身小小工程师！</div></div>';
        html += '<div style="margin:20px 0;"><button class="draw-btn" onclick="App.drawChallenge()"><span class="draw-btn-icon">🎲</span><span>抽一个挑战</span></button></div>';
        html += '<div id="challenge-display"></div></div>';
        main.innerHTML = html;
    },

    drawChallenge: function() {
        var challenges = window.LEARNING_DATA && window.LEARNING_DATA.CHALLENGES || [];
        var challenge = challenges[Math.floor(Math.random() * challenges.length)];
        var display = document.getElementById('challenge-display');

        var html = '<div class="challenge-card"><div class="challenge-header">';
        html += '<span class="challenge-badge">' + challenge.category + '</span><span class="challenge-number">挑战</span></div>';
        html += '<div class="challenge-title">' + challenge.title + '</div><div class="challenge-detail">' + challenge.detail + '</div>';
        html += '<div class="challenge-tips"><div class="challenge-tips-title">💡 小提示</div>' + challenge.tips + '</div>';
        html += '<div class="challenge-actions"><button class="btn-secondary" onclick="App.drawChallenge()">换一个</button>';
        html += '<button class="btn-primary" onclick="App.acceptChallenge(\'' + challenge.id + '\')">接受挑战</button></div></div>';
        display.innerHTML = html;
        Speech.speak(challenge.title + '。' + challenge.detail);
    },

    acceptChallenge: function(challengeId) {
        Storage.recordChallenge(challengeId);
        var modal = document.getElementById('feedback-modal');
        document.getElementById('feedback-icon').textContent = '🎊';
        document.getElementById('feedback-text').textContent = '挑战已记录！快去完成吧！';
        modal.style.display = 'flex';
        Speech.speak('太棒了！挑战已记录！');
    }
};

document.addEventListener('DOMContentLoaded', function() {
    App.init();
});
window.App = App;
