const INFO = Symbol('info')
const ERROR = Symbol('error')
/**
 * 日志工具类
 * 
 * @class Logger
 */
export default class Logger {
    constructor(isDev = false) {
        if (isDev) {
            this.isDev = true;
            this._crateLogPanel();
        } else {
            this.isDev = false;
        }
    }
    /**
     * 创建一个日志显示区域
     * 
     * @memberof ImgUploader
     */
    _crateLogPanel() {
        let logUl = document.createElement('ul');
        logUl.style.width = '100%';
        logUl.style.height = '200px'
        logUl.style.border = '1px solid #ccc'
        logUl.style.overflow = 'scroll'

        this.logBox = logUl;
        document.querySelector('body').appendChild(logUl)
    }

    _appendLog(msg, type) {
        if (this.isDev) {
            let msgLi = document.createElement('li');
            msgLi.style.width = '100%';
            msgLi.style.wordBreak = 'break-all';
            msgLi.innerText = msg;
            switch (type) {
                case INFO:
                    break;
                case ERROR:
                    msgLi.style.color = 'red';
                    break;
                default:
                    break;
            }
            this.logBox.appendChild(msgLi)
            this.logBox.scrollTop = this.logBox.scrollHeight - 200;
        }
    }
    /**
     * 添加日志显示内容
     * 
     * @param {any} msg 
     * @memberof ImgUploader
     */
    info(msg) {
        this._appendLog(msg, INFO)
    }

    error(msg) {
        this._appendLog(msg, ERROR)
    }
}