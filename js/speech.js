/* ===== 语音播报模块 - 使用 Web Speech API ===== */
/* 完全ES5兼容，支持移动端 */

var Speech = {
    enabled: true,
    synth: null,
    speaking: false,
    voicesLoaded: false,
    defaultVoice: null,
    
    init: function() {
        if ('speechSynthesis' in window) {
            this.synth = window.speechSynthesis;
            this.enabled = Storage.get('xxgc_speech', true);
            this.updateIcon();
            
            // 移动端关键：先取消任何正在进行的播报
            this.synth.cancel();
            
            // 预加载语音列表
            this.loadVoices();
            
            // 多种方式监听语音加载完成
            var self = this;
            
            // 方式1：onvoiceschanged 属性
            if (typeof this.synth.onvoiceschanged !== 'undefined') {
                this.synth.onvoiceschanged = function() {
                    self.loadVoices();
                };
            }
            
            // 方式2：addEventListener（部分浏览器支持）
            if (this.synth.addEventListener) {
                this.synth.addEventListener('voiceschanged', function() {
                    self.loadVoices();
                });
            }
            
            // 方式3：定时轮询（兜底方案，确保移动端能加载）
            var pollCount = 0;
            var pollInterval = setInterval(function() {
                self.loadVoices();
                pollCount++;
                if (self.voicesLoaded || pollCount > 10) {
                    clearInterval(pollInterval);
                }
            }, 100);
            
        } else {
            console.warn('浏览器不支持语音合成');
            this.enabled = false;
            this.updateIcon();
        }
    },

    loadVoices: function() {
        try {
            if (!this.synth) return;
            var voices = this.synth.getVoices();
            if (voices && voices.length > 0) {
                this.voicesLoaded = true;
                // 寻找中文语音
                for (var i = 0; i < voices.length; i++) {
                    var v = voices[i];
                    if (v.lang && (v.lang.indexOf('zh') !== -1 || v.lang.indexOf('CN') !== -1 || v.lang.indexOf('cmn') !== -1)) {
                        this.defaultVoice = v;
                        break;
                    }
                }
                // 如果没找到中文语音，使用第一个可用的
                if (!this.defaultVoice && voices.length > 0) {
                    this.defaultVoice = voices[0];
                }
            }
        } catch (e) {
            console.warn('加载语音失败:', e);
        }
    },

    setVoice: function(lang) {
        this.loadVoices();
    },

    toggle: function() {
        this.enabled = !this.enabled;
        Storage.set('xxgc_speech', this.enabled);
        this.updateIcon();
        if (this.enabled) {
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

    speak: function(text, rate) {
        rate = rate || 0.9;
        if (!this.enabled || !this.synth) return;
        if (!text || typeof text !== 'string') return;
        
        // 如果正在播报，先停止
        if (this.speaking) {
            this.synth.cancel();
            this.speaking = false;
        }
        
        try {
            // iOS Safari 关键：取消之前的播报队列
            this.synth.cancel();
            
            // 创建新的语音实例
            var utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'zh-CN';
            utterance.rate = rate;
            utterance.pitch = 1;
            utterance.volume = 1;
            
            // 设置语音
            if (this.defaultVoice) {
                utterance.voice = this.defaultVoice;
            }
            
            var self = this;
            
            utterance.onstart = function() {
                self.speaking = true;
                console.log('语音开始播报');
            };
            
            utterance.onend = function() {
                self.speaking = false;
                console.log('语音播报结束');
            };
            
            utterance.onerror = function(e) {
                self.speaking = false;
                console.warn('语音播报错误:', e);
            };
            
            // iOS Safari 关键修复：延迟一帧后播报
            // 这确保了utterance在主线程上下文中被正确处理
            setTimeout(function() {
                self.synth.speak(utterance);
            }, 10);
            
        } catch (e) {
            console.warn('语音播报失败:', e);
            this.speaking = false;
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
        // 提取纯文本
        content = content.replace(/<[^>]+>/g, '');
        var text = (knowledge.title || '') + '。' + content;
        this.speak(text, 0.85);
    },

    speakChar: function(char, pinyin) {
        if (!this.enabled) return;
        this.speak('这个字是' + char + '，读作' + pinyin, 0.95);
    },

    stop: function() {
        if (this.synth) {
            this.synth.cancel();
            this.speaking = false;
        }
    }
};

// 暴露到全局
window.Speech = Speech;