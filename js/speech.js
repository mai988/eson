/* ===== 语音播报模块 - 完全兼容移动端 ===== */

var Speech = {
    enabled: true,
    synth: null,
    speaking: false,
    voicesLoaded: false,
    defaultVoice: null,
    initialized: false,
    debugMode: true,
    
    init: function() {
        if (this.initialized) return;
        this.initialized = true;
        
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.enabled = Storage.get('xxgc_speech', true);
            this.updateIcon();
            
            // 关键：初始化时取消所有播报，清空队列
            try { this.synth.cancel(); } catch(e) {}
            
            // 立即加载语音列表
            this.loadVoices();
            
            var self = this;
            
            // 方式1：onvoiceschanged属性
            if (typeof this.synth.onvoiceschanged !== 'undefined') {
                this.synth.onvoiceschanged = function() {
                    self.log('voiceschanged事件触发');
                    self.loadVoices();
                };
            }
            
            // 方式2：addEventListener
            if (this.synth.addEventListener) {
                this.synth.addEventListener('voiceschanged', function() {
                    self.log('voiceschanged事件(Listener)触发');
                    self.loadVoices();
                });
            }
            
            // 方式3：定时轮询（关键修复移动端）
            var pollCount = 0;
            var pollInterval = setInterval(function() {
                self.loadVoices();
                pollCount++;
                if (self.voicesLoaded || pollCount > 20) {
                    clearInterval(pollInterval);
                    self.log('语音轮询结束，已加载:', self.voicesLoaded);
                }
            }, 100);
            
            // 方式4：延迟加载
            setTimeout(function() { self.loadVoices(); }, 500);
            setTimeout(function() { self.loadVoices(); }, 1000);
            
        } else {
            this.log('浏览器不支持语音合成');
            this.enabled = false;
            this.updateIcon();
        }
    },

    loadVoices: function() {
        try {
            if (!this.synth) {
                this.log('synth为空，跳过加载');
                return;
            }
            
            var voices = this.synth.getVoices();
            
            if (!voices || voices.length === 0) {
                this.log('语音列表为空，等待加载...');
                return;
            }
            
            this.voicesLoaded = true;
            this.log('语音列表加载成功，数量:', voices.length);
            
            // 优先找中文语音
            for (var i = 0; i < voices.length; i++) {
                var v = voices[i];
                var lang = v.lang || '';
                if (lang.indexOf('zh') !== -1 || lang.indexOf('CN') !== -1 || 
                    lang.indexOf('cmn') !== -1 || lang.indexOf('CHN') !== -1) {
                    this.defaultVoice = v;
                    this.log('找到中文语音:', v.name, v.lang);
                    break;
                }
            }
            
            if (!this.defaultVoice) {
                this.defaultVoice = voices[0];
                this.log('未找到中文语音，使用默认:', voices[0].name);
            }
            
        } catch (e) {
            this.log('加载语音失败:', e.message);
        }
    },

    // 预热语音引擎（移动端关键）
    warmUp: function() {
        if (!this.synth) return;
        
        try {
            // 创建一个空的语音来激活引擎
            var utterance = new SpeechSynthesisUtterance('');
            utterance.volume = 0;
            this.synth.speak(utterance);
            
            // 立即取消，只是激活
            setTimeout(function() {
                try { Speech.synth.cancel(); } catch(e) {}
            }, 50);
            
            this.log('语音引擎已预热');
        } catch (e) {
            this.log('预热失败:', e.message);
        }
    },

    speak: function(text, rate) {
        rate = rate || 0.9;
        
        // 基础检查
        if (!this.enabled) {
            this.log('语音播报已关闭');
            return;
        }
        if (!this.synth) {
            this.log('synth未初始化');
            return;
        }
        if (!text || typeof text !== 'string' || text.length === 0) {
            this.log('文本为空');
            return;
        }
        
        this.log('开始播报:', text.substring(0, 20) + '...');
        
        try {
            // 强制取消所有之前的播报
            this.synth.cancel();
            
            // 创建语音实例
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = rate;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            // 设置语音（如果有）
            if (this.defaultVoice) {
                utterance.voice = this.defaultVoice;
                this.log('使用语音:', this.defaultVoice.name);
            } else {
                this.log('使用系统默认语音');
            }
            
            var self = this;
            
            utterance.onstart = function(event) {
                self.speaking = true;
                self.log('语音开始播放');
                self.updateIcon();
            };
            
            utterance.onend = function(event) {
                self.speaking = false;
                self.log('语音播放结束');
                self.updateIcon();
            };
            
            utterance.onerror = function(event) {
                self.speaking = false;
                self.log('语音错误:', event.error || event);
                self.updateIcon();
            };
            
            utterance.onpause = function(event) {
                self.log('语音暂停');
            };
            
            utterance.onresume = function(event) {
                self.log('语音恢复');
            };
            
            // iOS Safari关键修复：必须在用户交互事件处理函数中直接调用
            // 使用try-catch确保即使失败也不会影响其他功能
            try {
                this.synth.speak(utterance);
                this.log('synth.speak()已调用');
            } catch (e) {
                this.log('synth.speak()调用失败:', e.message);
            }
            
        } catch (e) {
            this.speaking = false;
            this.log('speak函数异常:', e.message);
        }
    },

    speakQuestion: function(question) {
        if (!this.enabled) return;
        var text = question.content || '';
        
        if (question.type === 'choice' && question.options) {
            text += '。选项：';
            var letters = ['A', 'B', 'C', 'D'];
            for (var i = 0; i < question.options.length; i++) {
                text += letters[i] + '，' + question.options[i] + '。';
            }
        } else if (question.type === 'truefalse') {
            text += '。请判断对或错。';
        }
        
        this.speak(text);
    },

    speakKnowledge: function(knowledge) {
        if (!this.enabled) return;
        var content = knowledge.content || '';
        content = content.replace(/<[^>]+>/g, '');
        var text = (knowledge.title || '') + '。' + content;
        this.speak(text, 0.85);
    },

    speakChar: function(char, pinyin) {
        if (!this.enabled) return;
        this.speak('这个字是' + char + '，读作' + pinyin, 0.95);
    },

    speakFeedback: function(correct) {
        if (!this.enabled) return;
        var messages = correct
            ? ['太棒了！', '真厉害！', '答对了！', '你真聪明！', '好样的！']
            : ['别灰心，再想想！', '加油，你可以的！', '错了没关系，继续加油！'];
        var msg = messages[Math.floor(Math.random() * messages.length)];
        this.speak(msg, 0.95);
    },

    speakAchievement: function(title) {
        if (!this.enabled) return;
        this.speak('恭喜你获得成就：' + title + '！', 1);
    },

    speakHint: function() {
        if (!this.enabled) return;
        var hintText = document.getElementById('hint-text');
        if (hintText && hintText.textContent) {
            this.speak(hintText.textContent, 0.85);
        }
    },

    toggle: function() {
        this.enabled = !this.enabled;
        Storage.set('xxgc_speech', this.enabled);
        this.updateIcon();
        if (this.enabled) {
            this.warmUp();
            this.speak('语音播报已开启');
        } else if (this.synth) {
            this.synth.cancel();
        }
    },

    updateIcon: function() {
        var icon = document.getElementById('speech-icon');
        if (icon) {
            icon.textContent = this.enabled ? '🔊' : '🔇';
        }
        var btn = document.getElementById('speech-toggle');
        if (btn) {
            if (this.enabled) {
                btn.classList.remove('disabled');
            } else {
                btn.classList.add('disabled');
            }
        }
    },

    stop: function() {
        if (this.synth) {
            this.synth.cancel();
            this.speaking = false;
        }
    },

    log: function(msg) {
        if (this.debugMode) {
            console.log('[Speech]', msg);
        }
    },

    getStatus: function() {
        return {
            enabled: this.enabled,
            synth: !!this.synth,
            speaking: this.speaking,
            voicesLoaded: this.voicesLoaded,
            voiceName: this.defaultVoice ? this.defaultVoice.name : 'none',
            voiceLang: this.defaultVoice ? this.defaultVoice.lang : 'none'
        };
    }
};

window.Speech = Speech;