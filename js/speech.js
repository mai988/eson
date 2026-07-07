/* ===== 语音播报模块 - 使用 Web Speech API ===== */

const Speech = {
    enabled: true,
    synth: null,
    speaking: false,
    currentHint: '',
    voicesLoaded: false,
    
    init() {
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.enabled = Storage.get('xxgc_speech', true);
            this.updateIcon();
            
            // 移动端兼容：强制预加载语音列表
            this.loadVoices();
            
            // 同时支持属性方式和addEventListener方式
            var self = this;
            if (this.synth.onvoiceschanged !== undefined) {
                var originalHandler = this.synth.onvoiceschanged;
                this.synth.onvoiceschanged = function() {
                    self.loadVoices();
                    if (originalHandler) originalHandler();
                };
            }
            if (this.synth.addEventListener) {
                this.synth.addEventListener('voiceschanged', function() {
                    self.loadVoices();
                });
            }
        } else {
            console.warn('浏览器不支持语音合成');
            this.enabled = false;
            this.updateIcon();
        }
    },

    loadVoices() {
        try {
            if (!this.synth) return;
            var voices = this.synth.getVoices();
            if (voices && voices.length > 0) {
                this.voicesLoaded = true;
                var zhVoice = null;
                for (var i = 0; i < voices.length; i++) {
                    var v = voices[i];
                    if (v.lang && (v.lang.indexOf('zh') !== -1 || v.lang.indexOf('CN') !== -1)) {
                        zhVoice = v;
                        break;
                    }
                }
                if (zhVoice) {
                    this.defaultVoice = zhVoice;
                }
            }
        } catch (e) {
            console.warn('加载语音失败', e);
        }
    },

    setVoice(lang) {
        this.loadVoices();
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
        var icon = document.getElementById('speech-icon');
        if (icon) {
            icon.textContent = this.enabled ? '🔊' : '🔇';
        }
        var btn = document.getElementById('speech-toggle');
        if (btn) {
            btn.classList.toggle('disabled', !this.enabled);
        }
    },

    speak(text, rate) {
        rate = rate || 0.9;
        if (!this.enabled || !this.synth || this.speaking) return;
        if (!text || typeof text !== 'string') return;
        
        try {
            // 移动端兼容：每次播报前重新加载语音列表
            this.loadVoices();
            
            this.synth.cancel();
            
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = rate;
            utterance.pitch = 1.1;
            
            if (this.defaultVoice) {
                utterance.voice = this.defaultVoice;
            }

            var self = this;
            utterance.onstart = function() {
                self.speaking = true;
            };
            
            utterance.onend = function() {
                self.speaking = false;
            };
            
            utterance.onerror = function() {
                self.speaking = false;
            };

            this.synth.speak(utterance);
        } catch (e) {
            console.warn('语音播报失败', e);
            this.speaking = false;
        }
    },

    // 播报题目
    speakQuestion: function(question) {
        if (!this.enabled) return;
        var text = question.content;
        
        // 如果是选择题，播报选项
        if (question.type === 'choice' && question.options) {
            text += '。选项：';
            var letters = ['A', 'B', 'C', 'D'];
            for (var i = 0; i < question.options.length; i++) {
                text += letters[i] + '，' + question.options[i] + '。';
            }
        } else if (question.type === 'truefalse') {
            text += '。请判断对或错。';
        } else if (question.type === 'matching') {
            text += '。请点击左右两边的选项进行配对。左边有：';
            for (var j = 0; j < question.leftOptions.length; j++) {
                text += question.leftOptions[j] + '，';
            }
            text += '右边有：';
            for (var k = 0; k < question.rightOptions.length; k++) {
                text += question.rightOptions[k] + '，';
            }
        }
        
        this.speak(text);
    },

    // 播报知识点
    speakKnowledge: function(knowledge) {
        if (!this.enabled) return;
        // 提取纯文本，去掉HTML标签
        var content = knowledge.content.replace(/<[^>]+>/g, '').replace(/<span class="highlight">/g, '').replace(/<\/span>/g, '');
        var text = knowledge.title + '。' + content;
        this.speak(text, 0.85);
    },

    // 播报汉字卡片
    speakChar: function(char, pinyin) {
        if (!this.enabled) return;
        this.speak('这个字是' + char + '，读作' + pinyin, 0.95);
    },

    // 播报提示
    speakHint: function() {
        if (!this.enabled) return;
        var hintText = document.getElementById('hint-text').textContent;
        this.speak(hintText, 0.85);
    },

    // 播报反馈
    speakFeedback: function(correct) {
        if (!this.enabled) return;
        if (correct) {
            var encouragements = ['太棒了！', '真厉害！', '答对了！', '你真聪明！', '继续保持！'];
            this.speak(encouragements[Math.floor(Math.random() * encouragements.length)]);
        } else {
            this.speak('别灰心，看看提示吧！');
        }
    },

    // 播报成就
    speakAchievement: function(title) {
        if (!this.enabled) return;
        this.speak('恭喜你获得成就：' + title + '！真是太厉害了！');
    },

    // 播报每日任务
    speakDailyTask: function(task) {
        if (!this.enabled) return;
        this.speak('今天的任务是：' + task);
    },

    // 延迟播报（避免连续播报）
    speakDelayed: function(text, delay) {
        delay = delay || 500;
        var self = this;
        setTimeout(function() { self.speak(text); }, delay);
    },

    // 停止播报
    stop: function() {
        if (this.synth) {
            this.synth.cancel();
            this.speaking = false;
        }
    }
};

window.Speech = Speech;