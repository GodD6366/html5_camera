import Logger from './logger'
/**
 * 图片上传工具类
 * 
 * @class ImgUploader
 */
export default class ImageUploader {
    constructor({
        inputEl,
        showEl,
        isCompress = false,
        isDev = false
    }, callback) {
        if (!inputEl) {
            throw Error('input选择器是必传的')
        }
        this.inputEl = inputEl;
        this.showEl = showEl;
        this.isCompress = isCompress; //是否启用压缩
        this.file = null;
        this.canvas = null;
        this.callback = callback;
        this._onChangeEvent();
        this.logger = new Logger(isDev);
    }

    /**
     * 绑定input的change事件，获取到文件内容
     * 
     * @memberof ImgUploader
     */
    _onChangeEvent() {
        //监听input的change事件
        let input = document.querySelector(this.inputEl);
        input.addEventListener('change', (event) => {
            this.file = event.target.files[0];
            this.logger.info(`图片名称:${this.file.name}`)
            this._getImageOrientation();
        })

        //如果有展示的元素就初始化该元素
        if (this.showEl) {
            this.imageShowBox = document.querySelector(this.showEl);
        }
    }
    /**
     * 获取图片方向信息
     * 
     * @memberof ImgUploader
     */
    _getImageOrientation() {
        //设置图片默认方向为1
        let orientation = 1;
        let file = this.file;

        new Promise((resole, reject) => {
            //获取图片方向信息
            EXIF.getData(file, () => {
                orientation = EXIF.getTag(file, 'Orientation');
                this.logger.info("Orientation :" + orientation)
                resole(orientation)
            });
        }).then((orientation) => {
            this.orientation = orientation;
            this._getImageBlob();
        })
    }

    /**
     * 获取图像的二进制信息
     * 
     * @memberof ImgUploader
     */
    _getImageBlob() {
        let file = this.file;
        let reader = new FileReader();
        //获取图片加载信息
        reader.addEventListener('progress', (event) => {
            this.logger.info(`图片加载进度：${(event.loaded / event.total * 100).toFixed()}%`);
        })
        reader.addEventListener('load', (file) => {
            //格式化图片显示方向
            this.base64 = file.target.result;
            this.fileSize = file.total / 1024;
            //调整图片方向
            this._tranferImage()
        })
        reader.readAsDataURL(file);
    }

    /**
     * 调整图像方向信息
     * 
     * @memberof ImgUploader
     */
    _tranferImage() {
        let image = new Image();
        image.src = this.base64;
        image.addEventListener('load', (image) => {
            let target = image.target;
            let canvas = this._createCanvas(target)
            //如果方向角不为1，都需要进行旋转 ( 华为设备拍照取到值都是 0 ,上传后也都是正的,所以不考虑 )
            if (this.orientation != "" && this.orientation != 1) {
                switch (this.orientation) {
                    case 6: //需要顺时针（向左）90度旋转 
                        this.logger.info('图片需要顺时针（向左）90度旋转');
                        this._rotateImg(target, 'left', canvas);
                        break;
                    case 8: //需要逆时针（向右）90度旋转 
                        this.logger.info('图片需要顺时针（向右）90度旋转');
                        this._rotateImg(target, 'right', canvas);
                        break;
                    case 3: //需要180度旋转 
                        this.logger.info('图片需要180度旋转');
                        this._rotateImg(target, 'right', canvas);
                        break;
                    default:
                        break;
                }
            }
            this._generateImage()
        })
    }
    /**
     * 生成最后的图像信息
     * 
     * @memberof ImgUploader
     */
    _generateImage() {
        //获取处理之后的图片信息
        let fileBlob = null;
        let canvas = this.canvas;
        this.logger.info(`是否启用压缩: ${this.isCompress}`)
        //判断是否启用压缩
        if (this.isCompress) {
            fileBlob = this._compressImg(canvas)
        } else {
            fileBlob = canvas.toDataURL("image/jpeg", 0.8);
        }
        //存在展示的元素
        if (this.imageShowBox) {
            this.imageShowBox.src = fileBlob;
        }
        this.fileBlob = fileBlob;
        this.callback(fileBlob);
    }
    /**
     * 压缩图片
     * 
     * @param {any} canvas 
     * @returns 
     * @memberof ImgUploader
     */
    _compressImg(canvas) {
        let base64 = null;
        let fileSize = this.fileSize;
        this.logger.info(`图片大小: ${fileSize.toFixed()}KB`)
        // 图片大于1M，需要压缩
        if (fileSize > 1024) {
            let scal = 1024 / fileSize;
            if (navigator.userAgent.match(/iphone/i)) {
                this.logger.info("苹果设备压缩后图片偏大,压缩比再缩小3倍")
                scal /= 3;
            }
            //最低压缩比是0.2
            scal = scal < 0.2 ? 0.2 : scal;
            this.logger.info("图片压缩比:" + scal)
            base64 = canvas.toDataURL("image/jpeg", scal);
        } else {
            this.logger.info("图片不需要压缩(默认压缩0.8).")
            base64 = canvas.toDataURL("image/jpeg", 0.8);
        }
        return base64;
    }

    /**
     * 根据指定图片创建同样大小的canvas
     * 
     * @param {any} image 图片信息
     * @returns 
     * @memberof ImgUploader
     */
    _createCanvas(image) {
        let expectWidth = image.naturalWidth; //宽度
        let expectHeight = image.naturalHeight; //高度
        //创建画布渲染图片
        let canvas = this.canvas || document.createElement("canvas");
        canvas.width = expectWidth;
        canvas.height = expectHeight;

        let ctx = canvas.getContext("2d");
        ctx.drawImage(image, 0, 0, expectWidth, expectHeight);
        this.canvas = canvas;
        return canvas;
    }

    /**
     * 对图片旋转处理
     * 
     * @param {any} img 图片
     * @param {any} direction 旋转方向信息
     * @param {any} canvas 
     * @returns 
     * @memberof ImgUploader
     */
    _rotateImg(img, direction, canvas) {
        //alert(img); 
        //最小与最大旋转方向，图片旋转4次后回到原方向   
        let min_step = 0;
        let max_step = 3;
        //let img = document.getElementById(pid);   
        if (img == null) return;
        //img的高度和宽度不能在img元素隐藏后获取，否则会出错   
        let height = img.height;
        let width = img.width;
        //let step = img.getAttribute('step');   
        let step = 2;
        if (step == null) {
            step = min_step;
        }
        if (direction == 'right') {
            //旋转到原位置，即超过最大值   
            step > max_step && (step = min_step);
        } else {
            step--;
            step < min_step && (step = max_step);
        }
        //img.setAttribute('step', step);   
        /*let canvas = document.getElementById('pic_' + pid);   
        if (canvas == null) {   
            img.style.display = 'none';   
            canvas = document.createElement('canvas');   
            canvas.setAttribute('id', 'pic_' + pid);   
            img.parentNode.appendChild(canvas);   
        }  */
        //旋转角度以弧度值为参数   
        let degree = step * 90 * Math.PI / 180;
        let ctx = canvas.getContext('2d');
        switch (step) {
            case 0:
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0);
                break;
            case 1:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, 0, -height);
                break;
            case 2:
                canvas.width = width;
                canvas.height = height;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, -height);
                break;
            case 3:
                canvas.width = height;
                canvas.height = width;
                ctx.rotate(degree);
                ctx.drawImage(img, -width, 0);
                break;
        }
    }
}