/* ===== 语音播报模块 - 使用 Web Speech API ===== */

const Speech = {
    enabled: true,
    synth: null,
    speaking: false,
    currentHint: '',
    
    init() {
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.enabled = Storage.get('xxgc_speech', true);
            this.updateIcon();
            this.setVoice('zh-CN');
            if (this.synth && this.synth.addEventListener) {
                var self = this;
                this.synth.addEventListener('voiceschanged', function() {
                    self.setVoice('zh-CN');
                });
            }
        } else {
            console.warn('浏览器不支持语音合成');
            this.enabled = false;
            this.updateIcon();
        }
    },

    setVoice(lang) {
        try {
            if (!this.synth) return;
            const voices = this.synth.getVoices();
            if (!voices || voices.length === 0) return;
            const zhVoice = voices.find(v => v.lang && (v.lang.includes('zh') || v.lang.includes('CN')));
            if (zhVoice) {
                this.defaultVoice = zhVoice;
            }
        } catch (e) {
            console.warn('设置语音失败', e);
        }
    },

    toggle() {
        this.enabled = !this.enabled;
        Storage.set('xxgc_speech', this.enabled);
        this.updateIcon();
        if (this.enabled) {
            this.speak('语音播报已开启');
        } else {
            this.synth.cancel();
        }
    },

    updateIcon() {
        const icon = document.getElementById('speech-icon');
        if (icon) {
            icon.textContent = this.enabled ? '🔊' : '🔇';
        }
        const btn = document.getElementById('speech-toggle');
        if (btn) {
            btn.classList.toggle('disabled', !this.enabled);
        }
    },

    speak(text, rate = 0.9) {
        if (!this.enabled || !this.synth || this.speaking) return;
        if (!text || typeof text !== 'string') return;
        
        try {
            this.synth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = rate;
            utterance.pitch = 1.1;
            
            if (this.defaultVoice) {
                utterance.voice = this.defaultVoice;
            }

            utterance.onstart = () => {
                this.speaking = true;
            };
            
            utterance.onend = () => {
                this.speaking = false;
            };
            
            utterance.onerror = () => {
                this.speaking = false;
            };

            this.synth.speak(utterance);
        } catch (e) {
            console.warn('语音播报失败', e);
            this.speaking = false;
        }
    },

    // 播报题目
    speakQuestion(question) {
        if (!this.enabled) return;
        let text = question.content;
        
        // 如果是选择题，播报选项
        if (question.type === 'choice' && question.options) {
            text += '。选项：';
            const letters = ['A', 'B', 'C', 'D'];
            question.options.forEach((opt, i) => {
                text += `${letters[i]}，${opt}。`;
            });
        } else if (question.type === 'truefalse') {
            text += '。请判断对或错。';
        } else if (question.type === 'matching') {
            text += '。请点击左右两边的选项进行配对。左边有：';
            question.leftOptions.forEach(opt => text += `${opt}，`);
            text += '右边有：';
            question.rightOptions.forEach(opt => text += `${opt}，`);
        }
        
        this.speak(text);
    },

    // 播报知识点
    speakKnowledge(knowledge) {
        if (!this.enabled) return;
        // 提取纯文本，去掉HTML标签
        const content = knowledge.content.replace(/<[^>]+>/g, '').replace(/<span class="highlight">/g, '').replace(/<\/span>/g, '');
        let text = `${knowledge.title}。${content}`;
        this.speak(text, 0.85);
    },

    // 播报汉字卡片
    speakChar(char, pinyin) {
        if (!this.enabled) return;
        this.speak(`这个字是${char}，读作${pinyin}`, 0.95);
    },

    // 播报提示
    speakHint() {
        if (!this.enabled) return;
        const hintText = document.getElementById('hint-text').textContent;
        this.speak(hintText, 0.85);
    },

    // 播报反馈
    speakFeedback(correct) {
        if (!this.enabled) return;
        if (correct) {
            const encouragements = ['太棒了！', '真厉害！', '答对了！', '你真聪明！', '继续保持！'];
            this.speak(encouragements[Math.floor(Math.random() * encouragements.length)]);
        } else {
            this.speak('别灰心，看看提示吧！');
        }
    },

    // 播报成就
    speakAchievement(title) {
        if (!this.enabled) return;
        this.speak(`恭喜你获得成就：${title}！真是太厉害了！`);
    },

    // 播报每日任务
    speakDailyTask(task) {
        if (!this.enabled) return;
        this.speak(`今天的任务是：${task}`);
    },

    // 延迟播报（避免连续播报）
    speakDelayed(text, delay = 500) {
        setTimeout(() => this.speak(text), delay);
    },

    // 停止播报
    stop() {
        if (this.synth) {
            this.synth.cancel();
            this.speaking = false;
        }
    }
};

window.Speech = Speech;