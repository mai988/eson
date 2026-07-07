/* ===== 本地数据存储管理 - 升级版 ===== */

const Storage = {
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

    get(key, defaultValue) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : defaultValue;
        } catch (e) { return defaultValue; }
    },

    set(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); return true; }
        catch (e) { return false; }
    },

    // ===== 年级管理 =====
    getGrade() { return this.get(this.KEYS.GRADE, 1); },
    setGrade(grade) { this.set(this.KEYS.GRADE, grade); },

    // ===== 学习进度 =====
    getProgress() {
        const grade = this.getGrade();
        return this.get(`${this.KEYS.PROGRESS}_${grade}`, { chinese: {}, math: {}, english: {} });
    },

    markLessonComplete(lessonId, subjectId) {
        const progress = this.getProgress();
        if (!progress[subjectId]) progress[subjectId] = {};
        progress[subjectId][lessonId] = true;
        this.set(`${this.KEYS.PROGRESS}_${this.getGrade()}`, progress);
        this.checkAchievements();
    },

    isLessonComplete(lessonId, subjectId) {
        const progress = this.getProgress();
        return progress[subjectId] && progress[subjectId][lessonId];
    },

    getSubjectProgress(subjectId) {
        const grade = this.getGrade();
        const units = window.LEARNING_DATA?.UNITS?.[grade]?.[subjectId];
        if (!units) return { completed: 0, total: 0 };
        let completed = 0, total = 0;
        units.forEach(unit => {
            unit.lessons.forEach(lesson => {
                total++;
                if (this.isLessonComplete(lesson.id, subjectId)) completed++;
            });
        });
        return { completed, total };
    },

    isUnitComplete(unit, subjectId) {
        return unit.lessons.every(lesson => this.isLessonComplete(lesson.id, subjectId));
    },

    // ===== 答题记录 =====
    getAnswerLog() {
        return this.get(this.KEYS.ANSWER_LOG, { chinese: [], math: [], english: [] });
    },

    recordAnswer(subjectId, questionId, correct) {
        const log = this.getAnswerLog();
        if (!log[subjectId]) log[subjectId] = [];
        log[subjectId].push({ questionId, correct, time: Date.now() });
        if (log[subjectId].length > 20) log[subjectId] = log[subjectId].slice(-20);
        this.set(this.KEYS.ANSWER_LOG, log);
        this.updateDailyProgress();
    },

    getAccuracy(subjectId) {
        const log = this.getAnswerLog();
        const records = log[subjectId] || [];
        if (records.length === 0) return { accuracy: 0, total: 0, correct: 0 };
        const correct = records.filter(r => r.correct).length;
        return { accuracy: correct / records.length, total: records.length, correct };
    },

    // ===== 错题本 =====
    getWrongQuestions() { return this.get(this.KEYS.WRONG_QUESTIONS, []); },

    addWrongQuestion(question, subjectId) {
        const wrong = this.getWrongQuestions();
        if (!wrong.find(w => w.questionId === question.id)) {
            wrong.push({
                questionId: question.id, subjectId,
                content: question.content,
                correctAnswer: question.options?.[question.answer] || '',
                hint: question.hint, type: question.type,
                grade: this.getGrade(), time: Date.now()
            });
            this.set(this.KEYS.WRONG_QUESTIONS, wrong);
        }
    },

    removeWrongQuestion(questionId) {
        const wrong = this.getWrongQuestions();
        this.set(this.KEYS.WRONG_QUESTIONS, wrong.filter(w => w.questionId !== questionId));
    },

    getWrongBySubject(subjectId) {
        const wrong = this.getWrongQuestions();
        return wrong.filter(w => w.subjectId === subjectId && w.grade === this.getGrade());
    },

    // ===== 每日任务 =====
    getDailyTasks() {
        const today = new Date().toDateString();
        return this.get(`${this.KEYS.DAILY_TASKS}_${today}`, {
            math: { completed: 0, target: 5 },
            chinese: { completed: 0, target: 5 },
            english: { completed: 0, target: 3 },
            challenges: { completed: 0, target: 1 },
            streakDay: false
        });
    },

    updateDailyProgress() {
        const tasks = this.getDailyTasks();
        const today = new Date().toDateString();
        this.set(`${this.KEYS.DAILY_TASKS}_${today}`, tasks);
    },

    isDailyComplete() {
        const tasks = this.getDailyTasks();
        return tasks.math.completed >= tasks.math.target &&
               tasks.chinese.completed >= tasks.chinese.target &&
               tasks.english.completed >= tasks.english.target;
    },

    // ===== 连续学习天数 =====
    getStreak() {
        const streak = this.get(this.KEYS.STREAK, { count: 0, lastDate: '' });
        const today = new Date().toDateString();
        const yesterday = new Date(Date.now() - 86400000).toDateString();

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

    // ===== 成就系统 =====
    getAchievements() {
        return this.get(this.KEYS.ACHIEVEMENTS, {
            firstLesson: false, first10: false, first50: false,
            streak3: false, streak7: false, streak30: false,
            perfectMath: false, perfectChinese: false, perfectEnglish: false,
            allCorrect: false, explorer: false
        });
    },

    checkAchievements() {
        const achievements = this.getAchievements();
        const newAchievements = [];
        const grade = this.getGrade();

        // 检查各科进度成就
        Object.keys(window.LEARNING_DATA?.SUBJECTS || {}).forEach(subjectId => {
            const { completed, total } = this.getSubjectProgress(subjectId);
            const { accuracy } = this.getAccuracy(subjectId);

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

            if (accuracy >= 0.9 && total >= 10) {
                const key = `perfect${subjectId.charAt(0).toUpperCase() + subjectId.slice(1)}`;
                if (!achievements[key]) {
                    achievements[key] = true;
                    newAchievements.push({ id: key, title: `${window.LEARNING_DATA?.SUBJECTS?.[subjectId]?.name}之星`, desc: `${window.LEARNING_DATA?.SUBJECTS?.[subjectId]?.name}正确率超90%！` });
                }
            }
        });

        // 连续学习成就
        const streak = this.getStreak();
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

    // ===== 挑战记录 =====
    recordChallenge(challengeId) {
        const history = this.get(this.KEYS.CHALLENGE_HISTORY, []);
        history.push({ challengeId, time: Date.now() });
        this.set(this.KEYS.CHALLENGE_HISTORY, history);
        const tasks = this.getDailyTasks();
        tasks.challenges.completed++;
        this.updateDailyProgress();
    },

    // ===== 智能推练 =====
    getLowestSubject() {
        const subjects = ['chinese', 'math', 'english'];
        let lowestSubject = null, lowestAccuracy = 1.01, hasData = false;

        subjects.forEach(subjectId => {
            const { accuracy, total } = this.getAccuracy(subjectId);
            if (total > 0) {
                hasData = true;
                if (accuracy < lowestAccuracy) { lowestAccuracy = accuracy; lowestSubject = subjectId; }
            }
        });

        if (!hasData) return { subjectId: 'chinese', accuracy: 0, hasData: false };
        return { subjectId: lowestSubject, accuracy: lowestAccuracy, hasData: true };
    },

    getQuestionsForPractice(subjectId, count) {
        const grade = this.getGrade();
        const units = window.LEARNING_DATA?.UNITS?.[grade]?.[subjectId];
        if (!units) return [];
        const allQuestions = [];
        units.forEach(unit => {
            unit.lessons.forEach(lesson => {
                lesson.questions.forEach(q => allQuestions.push({ ...q, subjectId }));
            });
        });

        const wrongQuestions = this.getWrongBySubject(subjectId);
        const wrongIds = wrongQuestions.map(w => w.questionId);
        const wrongPool = allQuestions.filter(q => wrongIds.includes(q.id));
        const otherPool = allQuestions.filter(q => !wrongIds.includes(q.id));
        const shuffle = arr => arr.sort(() => Math.random() - 0.5);

        const selected = shuffle(wrongPool).slice(0, count);
        const need = count - selected.length;
        if (need > 0) selected.push(...shuffle(otherPool).slice(0, need));
        return selected;
    },

    // ===== 用户信息 =====
    getUser() {
        return this.get(this.KEYS.USER, null);
    },

    setUser(name) {
        if (!name || !name.trim()) return false;
        const user = {
            name: name.trim(),
            createdAt: Date.now()
        };
        this.set(this.KEYS.USER, user);
        return true;
    },

    clearUser() {
        localStorage.removeItem(this.KEYS.USER);
    },

    isLoggedIn() {
        return this.getUser() !== null;
    }
};

window.Storage = Storage;