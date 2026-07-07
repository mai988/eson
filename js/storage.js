/* ===== 本地数据存储管理 - 升级版 ===== */

var Storage = {
    KEYS: {
        GRADE: 'xxgc_grade',
        PROGRESS: 'xxgc_progress',
        ANSWER_LOG: 'xxgc_answerlog',
        WRONG_QUESTIONS: 'xxgc_wrong',
        DAILY_TASKS: 'xxgc_daily',
        STREAK: 'xxgc_streak',
        ACHIEVEMENTS: 'xxgc_achievements',
        LAST_LOGIN: 'xxgc_lastlogin',
        CHALLENGE_HISTORY: 'xxgc_challenge',
        SPEECH: 'xxgc_speech',
        USER: 'xxgc_user'
    },

    get: function(key, defaultValue) {
        try {
            var data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    },

    set: function(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    },

    getGrade: function() { return this.get(this.KEYS.GRADE, 1); },
    setGrade: function(grade) { this.set(this.KEYS.GRADE, grade); },

    getProgress: function() {
        var grade = this.getGrade();
        return this.get(this.KEYS.PROGRESS + '_' + grade, { chinese: {}, math: {}, english: {} });
    },

    markLessonComplete: function(lessonId, subjectId) {
        var progress = this.getProgress();
        if (!progress[subjectId]) progress[subjectId] = {};
        progress[subjectId][lessonId] = true;
        this.set(this.KEYS.PROGRESS + '_' + this.getGrade(), progress);
        this.checkAchievements();
    },

    isLessonComplete: function(lessonId, subjectId) {
        var progress = this.getProgress();
        return progress[subjectId] && progress[subjectId][lessonId];
    },

    getSubjectProgress: function(subjectId) {
        var grade = this.getGrade();
        var units = window.LEARNING_DATA && window.LEARNING_DATA.UNITS && window.LEARNING_DATA.UNITS[grade] && window.LEARNING_DATA.UNITS[grade][subjectId];
        if (!units) return { completed: 0, total: 0 };
        var completed = 0, total = 0;
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            for (var j = 0; j < unit.lessons.length; j++) {
                total++;
                if (this.isLessonComplete(unit.lessons[j].id, subjectId)) completed++;
            }
        }
        return { completed: completed, total: total };
    },

    isUnitComplete: function(unit, subjectId) {
        for (var i = 0; i < unit.lessons.length; i++) {
            if (!this.isLessonComplete(unit.lessons[i].id, subjectId)) return false;
        }
        return true;
    },

    getAnswerLog: function() {
        return this.get(this.KEYS.ANSWER_LOG, { chinese: [], math: [], english: [] });
    },

    recordAnswer: function(subjectId, questionId, correct) {
        var log = this.getAnswerLog();
        if (!log[subjectId]) log[subjectId] = [];
        log[subjectId].push({ questionId: questionId, correct: correct, time: Date.now() });
        if (log[subjectId].length > 20) log[subjectId] = log[subjectId].slice(-20);
        this.set(this.KEYS.ANSWER_LOG, log);
        this.updateDailyProgress();
    },

    getAccuracy: function(subjectId) {
        var log = this.getAnswerLog();
        var records = log[subjectId] || [];
        if (records.length === 0) return { accuracy: 0, total: 0, correct: 0 };
        var correct = 0;
        for (var i = 0; i < records.length; i++) {
            if (records[i].correct) correct++;
        }
        return { accuracy: correct / records.length, total: records.length, correct: correct };
    },

    getWrongQuestions: function() { return this.get(this.KEYS.WRONG_QUESTIONS, []); },

    addWrongQuestion: function(question, subjectId) {
        var wrong = this.getWrongQuestions();
        var found = false;
        for (var i = 0; i < wrong.length; i++) {
            if (wrong[i].questionId === question.id) { found = true; break; }
        }
        if (!found) {
            var correctAnswer = question.options && question.answer !== undefined ? question.options[question.answer] : '';
            wrong.push({
                questionId: question.id,
                subjectId: subjectId,
                content: question.content,
                correctAnswer: correctAnswer,
                hint: question.hint,
                type: question.type,
                grade: this.getGrade(),
                time: Date.now()
            });
            this.set(this.KEYS.WRONG_QUESTIONS, wrong);
        }
    },

    removeWrongQuestion: function(questionId) {
        var wrong = this.getWrongQuestions();
        var newWrong = [];
        for (var i = 0; i < wrong.length; i++) {
            if (wrong[i].questionId !== questionId) newWrong.push(wrong[i]);
        }
        this.set(this.KEYS.WRONG_QUESTIONS, newWrong);
    },

    getWrongBySubject: function(subjectId) {
        var wrong = this.getWrongQuestions();
        var result = [];
        var grade = this.getGrade();
        for (var i = 0; i < wrong.length; i++) {
            if (wrong[i].subjectId === subjectId && wrong[i].grade === grade) result.push(wrong[i]);
        }
        return result;
    },

    getDailyTasks: function() {
        var today = new Date().toDateString();
        return this.get(this.KEYS.DAILY_TASKS + '_' + today, {
            math: { completed: 0, target: 5 },
            chinese: { completed: 0, target: 5 },
            english: { completed: 0, target: 3 },
            challenges: { completed: 0, target: 1 },
            streakDay: false
        });
    },

    updateDailyProgress: function() {
        var tasks = this.getDailyTasks();
        var today = new Date().toDateString();
        this.set(this.KEYS.DAILY_TASKS + '_' + today, tasks);
    },

    isDailyComplete: function() {
        var tasks = this.getDailyTasks();
        return tasks.math.completed >= tasks.math.target &&
               tasks.chinese.completed >= tasks.chinese.target &&
               tasks.english.completed >= tasks.english.target;
    },

    getStreak: function() {
        var streak = this.get(this.KEYS.STREAK, { count: 0, lastDate: '' });
        var today = new Date().toDateString();
        var yesterday = new Date(Date.now() - 86400000).toDateString();

        if (streak.lastDate === today) return streak.count;
        if (streak.lastDate === yesterday && this.isDailyComplete()) {
            streak.count++;
            streak.lastDate = today;
            this.set(this.KEYS.STREAK, streak);
            return streak.count;
        }
        if (this.isDailyComplete()) {
            streak.count = 1;
            streak.lastDate = today;
            this.set(this.KEYS.STREAK, streak);
            return 1;
        }
        return 0;
    },

    getAchievements: function() {
        return this.get(this.KEYS.ACHIEVEMENTS, {
            firstLesson: false, first10: false, first50: false,
            streak3: false, streak7: false, streak30: false,
            perfectMath: false, perfectChinese: false, perfectEnglish: false,
            allCorrect: false, explorer: false
        });
    },

    checkAchievements: function() {
        var achievements = this.getAchievements();
        var newAchievements = [];
        var grade = this.getGrade();
        var self = this;

        var subjects = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS ? Object.keys(window.LEARNING_DATA.SUBJECTS) : [];
        for (var i = 0; i < subjects.length; i++) {
            var subjectId = subjects[i];
            var progress = this.getSubjectProgress(subjectId);
            var acc = this.getAccuracy(subjectId);
            var completed = progress.completed;
            var total = progress.total;
            var accuracy = acc.accuracy;
            var totalQuestions = acc.total;

            if (completed >= 1 && !achievements.firstLesson) {
                achievements.firstLesson = true;
                newAchievements.push({ id: 'firstLesson', title: '初学者', desc: '完成第一课！' });
            }
            if (completed >= 10 && !achievements.first10) {
                achievements.first10 = true;
                newAchievements.push({ id: 'first10', title: '勤奋学员', desc: '完成10课！' });
            }
            if (completed >= 50 && !achievements.first50) {
                achievements.first50 = true;
                newAchievements.push({ id: 'first50', title: '学霸', desc: '完成50课！' });
            }

            if (accuracy >= 0.9 && totalQuestions >= 10) {
                var key = 'perfect' + subjectId.charAt(0).toUpperCase() + subjectId.slice(1);
                if (!achievements[key]) {
                    var subjectName = window.LEARNING_DATA && window.LEARNING_DATA.SUBJECTS && window.LEARNING_DATA.SUBJECTS[subjectId] ? window.LEARNING_DATA.SUBJECTS[subjectId].name : '';
                    achievements[key] = true;
                    newAchievements.push({ id: key, title: subjectName + '之星', desc: subjectName + '正确率超90%！' });
                }
            }
        }

        var streak = this.getStreak();
        if (streak >= 3 && !achievements.streak3) {
            achievements.streak3 = true;
            newAchievements.push({ id: 'streak3', title: '坚持者', desc: '连续学习3天！' });
        }
        if (streak >= 7 && !achievements.streak7) {
            achievements.streak7 = true;
            newAchievements.push({ id: 'streak7', title: '毅力之星', desc: '连续学习7天！' });
        }
        if (streak >= 30 && !achievements.streak30) {
            achievements.streak30 = true;
            newAchievements.push({ id: 'streak30', title: '学习达人', desc: '连续学习30天！' });
        }

        this.set(this.KEYS.ACHIEVEMENTS, achievements);
        return newAchievements;
    },

    recordChallenge: function(challengeId) {
        var history = this.get(this.KEYS.CHALLENGE_HISTORY, []);
        history.push({ challengeId: challengeId, time: Date.now() });
        this.set(this.KEYS.CHALLENGE_HISTORY, history);
        var tasks = this.getDailyTasks();
        tasks.challenges.completed++;
        this.updateDailyProgress();
    },

    getLowestSubject: function() {
        var subjects = ['chinese', 'math', 'english'];
        var lowestSubject = null, lowestAccuracy = 1.01, hasData = false;

        for (var i = 0; i < subjects.length; i++) {
            var subjectId = subjects[i];
            var result = this.getAccuracy(subjectId);
            var accuracy = result.accuracy;
            var total = result.total;
            if (total > 0) {
                hasData = true;
                if (accuracy < lowestAccuracy) { lowestAccuracy = accuracy; lowestSubject = subjectId; }
            }
        }

        if (!hasData) return { subjectId: 'chinese', accuracy: 0, hasData: false };
        return { subjectId: lowestSubject, accuracy: lowestAccuracy, hasData: true };
    },

    getQuestionsForPractice: function(subjectId, count) {
        var grade = this.getGrade();
        var units = window.LEARNING_DATA && window.LEARNING_DATA.UNITS && window.LEARNING_DATA.UNITS[grade] && window.LEARNING_DATA.UNITS[grade][subjectId];
        if (!units) return [];
        var allQuestions = [];
        for (var i = 0; i < units.length; i++) {
            var unit = units[i];
            for (var j = 0; j < unit.lessons.length; j++) {
                var lesson = unit.lessons[j];
                if (lesson.questions) {
                    for (var k = 0; k < lesson.questions.length; k++) {
                        var q = lesson.questions[k];
                        allQuestions.push({
                            id: q.id,
                            type: q.type,
                            content: q.content,
                            options: q.options,
                            answer: q.answer,
                            hint: q.hint,
                            subjectId: subjectId
                        });
                    }
                }
            }
        }

        var wrongQuestions = this.getWrongBySubject(subjectId);
        var wrongIds = [];
        for (var w = 0; w < wrongQuestions.length; w++) {
            wrongIds.push(wrongQuestions[w].questionId);
        }

        var wrongPool = [];
        var otherPool = [];
        for (var q = 0; q < allQuestions.length; q++) {
            if (wrongIds.indexOf(allQuestions[q].id) !== -1) {
                wrongPool.push(allQuestions[q]);
            } else {
                otherPool.push(allQuestions[q]);
            }
        }

        var shuffle = function(arr) {
            return arr.sort(function() { return Math.random() - 0.5; });
        };

        var selected = shuffle(wrongPool).slice(0, count);
        var need = count - selected.length;
        if (need > 0) {
            var more = shuffle(otherPool).slice(0, need);
            for (var m = 0; m < more.length; m++) selected.push(more[m]);
        }
        return selected;
    },

    getUser: function() {
        return this.get(this.KEYS.USER, null);
    },

    setUser: function(name) {
        if (!name || !name.trim()) return false;
        var user = {
            name: name.trim(),
            createdAt: Date.now()
        };
        this.set(this.KEYS.USER, user);
        return true;
    },

    clearUser: function() {
        localStorage.removeItem(this.KEYS.USER);
    },

    isLoggedIn: function() {
        return this.getUser() !== null;
    }
};

window.Storage = Storage;
