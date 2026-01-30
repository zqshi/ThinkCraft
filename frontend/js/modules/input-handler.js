/**
 * 输入处理模块
 * 负责处理各种输入方式（文本、语音、图片等）
 */

/* eslint-disable no-unused-vars, no-undef */

class InputHandler {
    constructor() {
        this.state = window.state;
        this.isRecording = false;
    }

    /**
     * 处理键盘按下事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyDown(e) {
        // Enter键发送消息（但不在输入法组合状态中）
        if (e.key === 'Enter' && !e.shiftKey && !window.isComposing) {
            e.preventDefault();
            if (typeof sendMessage === 'function') {
                sendMessage();
            }
            return;
        }

        // 长按空格键触发语音输入（类似微信）
        if (e.code === 'Space' && !e.repeat && e.target.id === 'mainInput') {
            window.spaceHoldTriggered = false;
            window.spaceHoldTimer = setTimeout(() => {
                window.spaceHoldTriggered = true;
                e.preventDefault();
                this.handleVoice();
                if (navigator.vibrate) navigator.vibrate(50);
            }, 300);
        }
    }

    /**
     * 处理键盘释放事件
     * @param {KeyboardEvent} e - 键盘事件
     */
    handleKeyUp(e) {
        if (e.code === 'Space') {
            clearTimeout(window.spaceHoldTimer);
            if (window.spaceHoldTriggered) {
                e.preventDefault();
            }
        }
    }

    /**
     * 处理语音输入
     */
    handleVoice() {
        if (this.isRecording) {
            this.stopRecording();
        } else {
            this.startRecording();
        }
    }

    /**
     * 开始录音
     */
    startRecording() {
        console.log('开始录音');
        this.isRecording = true;
        // 实现录音逻辑
    }

    /**
     * 停止录音
     */
    stopRecording() {
        console.log('停止录音');
        this.isRecording = false;
        // 实现停止录音逻辑
    }

    /**
     * 处理相机输入
     */
    handleCamera() {
        console.log('打开相机');
        // 实现相机逻辑
    }

    /**
     * 处理图片上传
     */
    handleImageUpload() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                console.log('上传图片:', file.name);
                // 实现图片上传逻辑
            }
        };
        input.click();
    }

    /**
     * 切换到文本模式
     */
    switchToTextMode() {
        const voiceMode = document.getElementById('voiceMode');
        const textMode = document.getElementById('textMode');
        if (voiceMode) voiceMode.style.display = 'none';
        if (textMode) textMode.style.display = 'flex';
    }

    /**
     * 切换到语音模式
     */
    switchToVoiceMode() {
        const voiceMode = document.getElementById('voiceMode');
        const textMode = document.getElementById('textMode');
        if (voiceMode) voiceMode.style.display = 'flex';
        if (textMode) textMode.style.display = 'none';
    }

    /**
     * 初始化输入处理器
     */
    init() {
        // 绑定输入法事件
        const mainInput = document.getElementById('mainInput');
        if (mainInput) {
            mainInput.addEventListener('compositionstart', () => {
                window.isComposing = true;
            });
            mainInput.addEventListener('compositionend', () => {
                window.isComposing = false;
            });
        }
    }
}

// 创建全局实例
window.inputHandler = new InputHandler();

// 暴露全局函数（向后兼容）
function handleKeyDown(e) {
    window.inputHandler.handleKeyDown(e);
}

function handleKeyUp(e) {
    window.inputHandler.handleKeyUp(e);
}

function handleVoice() {
    window.inputHandler.handleVoice();
}

function handleCamera() {
    window.inputHandler.handleCamera();
}

function handleImageUpload() {
    window.inputHandler.handleImageUpload();
}

function switchToTextMode() {
    window.inputHandler.switchToTextMode();
}

function switchToVoiceMode() {
    window.inputHandler.switchToVoiceMode();
}
