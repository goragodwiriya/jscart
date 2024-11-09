/**
 * รวมฟังก์ชันอรรถประโยชน์ต่างๆ สำหรับใช้งานทั่วไป
 */
const Utils = {
  /**
   * ฟังก์ชันหน่วงเวลาการทำงาน
   * @param {Function} func - ฟังก์ชันที่ต้องการหน่วงเวลา
   * @param {number} wait - เวลาที่ต้องการหน่วง (มิลลิวินาที)
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * จัดรูปแบบตัวเลขเป็นสกุลเงิน
   */
  formatCurrency(amount, currency = CONFIG.LOCALE.CURRENCY, locale = CONFIG.LOCALE.DEFAULT) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency
    }).format(amount);
  },

  /**
   * จัดรูปแบบวันที่
   */
  formatDate(date, format = 'LONG') {
    if (!date) return '';
    const dateObj = new Date(date);
    const options = {
      SHORT: {day: '2-digit', month: '2-digit', year: 'numeric'},
      LONG: {day: 'numeric', month: 'long', year: 'numeric'},
      WITH_TIME: {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }
    };
    return dateObj.toLocaleDateString(CONFIG.LOCALE.DEFAULT, options[format]);
  },

  /**
   * สร้าง ID แบบไม่ซ้ำกัน
   */
  generateId(prefix = '') {
    return `${prefix}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * ตรวจสอบเบอร์โทรศัพท์ (ประเทศไทย)
   */
  validatePhone(phone) {
    return /^0[6-9]{1}\d{8}$/.test(phone);
  },

  /**
   * ตรวจสอบอีเมล
   */
  validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  /**
   * คัดลอกออบเจ็กต์แบบลึก
   */
  clone(obj) {
    return JSON.parse(JSON.stringify(obj));
  },

  /**
   * ดึงข้อมูลจาก localStorage แบบปลอดภัย
   */
  getStorageItem(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error(`เกิดข้อผิดพลาดในการอ่าน localStorage: ${key}`, error);
      return defaultValue;
    }
  },

  /**
   * บันทึกข้อมูลลง localStorage แบบปลอดภัย
   */
  setStorageItem(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error(`เกิดข้อผิดพลาดในการเขียน localStorage: ${key}`, error);
      return false;
    }
  },

  /**
   * เลื่อนไปยังอิลิเมนต์ที่ระบุ
   */
  scrollTo(elementId, offset = 0) {
    const element = document.getElementById(elementId);
    if (element) {
      const top = element.offsetTop - offset;
      window.scrollTo({
        top,
        behavior: 'smooth'
      });
    }
  },

  /**
   * ตรวจสอบว่าอิลิเมนต์อยู่ในพื้นที่มองเห็นหรือไม่
   */
  isInViewport(element) {
    const rect = element.getBoundingClientRect();
    return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
    );
  },

  /**
   * เพิ่มคลาสชั่วคราวให้กับอิลิเมนต์
   */
  addTemporaryClass(element, className, duration = CONFIG.ANIMATION_DURATION) {
    element.classList.add(className);
    setTimeout(() => element.classList.remove(className), duration);
  },

  /**
   * จัดรูปแบบขนาดไฟล์
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  },

  /**
   * ดึงภาษาของเบราว์เซอร์
   */
  getBrowserLocale(defaultLocale = CONFIG.LOCALE.DEFAULT) {
    return navigator.language || navigator.userLanguage || defaultLocale;
  },

  /**
   * ตรวจสอบว่าเป็นอุปกรณ์มือถือหรือไม่
   */
  isMobile() {
    return window.innerWidth <= 768;
  },

  /**
   * ตรวจสอบว่ารองรับการสัมผัสหรือไม่
   */
  isTouchDevice() {
    return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  },

  /**
   * แยกพารามิเตอร์จาก URL
   */
  getUrlParams() {
    const params = new URLSearchParams(window.location.search);
    const result = {};
    for (const [key, value] of params) {
      result[key] = value;
    }
    return result;
  },

  /**
   * คัดลอกข้อความไปยังคลิปบอร์ด
   */
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (error) {
      console.error('ไม่สามารถคัดลอกข้อความได้:', error);
      return false;
    }
  },

  /**
   * ลบแท็ก HTML ออก
   */
  stripHtml(html) {
    const tmp = document.createElement('div');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  },

  /**
   * ตรวจสอบว่าเป็น JSON string หรือไม่
   */
  isJsonString(str) {
    try {
      JSON.parse(str);
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * สุ่มรายการจากอาเรย์
   */
  getRandomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * ตรวจสอบว่าออบเจ็กต์ว่างหรือไม่
   */
  isEmpty(obj) {
    return Object.keys(obj).length === 0;
  },

  /**
   * เปรียบเทียบออบเจ็กต์สองตัว
   */
  isEqual(obj1, obj2) {
    return JSON.stringify(obj1) === JSON.stringify(obj2);
  },

  /**
   * คำนวณเปอร์เซ็นต์ส่วนลด
   */
  calculateDiscount(originalPrice, finalPrice) {
    return Math.round(((originalPrice - finalPrice) / originalPrice) * 100);
  },

  /**
   * จัดรูปแบบเบอร์โทรศัพท์
   */
  formatPhone(phone) {
    return phone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3');
  },

  /**
   * จำกัดความยาวข้อความพร้อมเครื่องหมายจุดไข่ปลา
   */
  truncate(str, length, end = '...') {
    return str.length > length ? str.substring(0, length - end.length) + end : str;
  },

  /**
   * ตรวจสอบว่าเป็นตัวเลขหรือไม่
   */
  isNumeric(value) {
    return !isNaN(parseFloat(value)) && isFinite(value);
  },

  /**
   * ดึงนามสกุลไฟล์
   */
  getFileExtension(filename) {
    return filename.slice((filename.lastIndexOf('.') - 1 >>> 0) + 2);
  },

  /**
   * แปลงสี RGB เป็น Hex
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
};
