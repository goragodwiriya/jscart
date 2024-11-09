/**
 * ระบบจัดการการจัดเก็บข้อมูล
 * รับผิดชอบการจัดการข้อมูลใน localStorage รวมถึงการบันทึก, โหลด, และจัดการข้อมูลที่มีเวลาหมดอายุ
 */
const Storage = {
  /**
   * บันทึกข้อมูลลง localStorage
   * @param {string} key - คีย์สำหรับจัดเก็บข้อมูล
   * @param {*} value - ข้อมูลที่ต้องการบันทึก
   * @returns {boolean} สถานะการบันทึก
   */
  save(key, value) {
    try {
      const serializedValue = JSON.stringify(value);
      localStorage.setItem(key, serializedValue);
      return true;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล:', error);
      return false;
    }
  },

  /**
   * โหลดข้อมูลจาก localStorage
   * @param {string} key - คีย์ที่ต้องการโหลด
   * @param {*} defaultValue - ค่าเริ่มต้นหากไม่พบข้อมูล
   * @returns {*} ข้อมูลที่โหลดหรือค่าเริ่มต้น
   */
  load(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return defaultValue;
      return JSON.parse(item);
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูล:', error);
      return defaultValue;
    }
  },

  /**
   * ลบข้อมูลจาก localStorage
   * @param {string} key - คีย์ที่ต้องการลบ
   * @returns {boolean} สถานะการลบ
   */
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการลบข้อมูล:', error);
      return false;
    }
  },

  /**
   * ล้างข้อมูลทั้งหมดใน localStorage
   * @returns {boolean} สถานะการล้างข้อมูล
   */
  clear() {
    try {
      localStorage.clear();
      return true;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการล้างข้อมูล:', error);
      return false;
    }
  },

  /**
   * ตรวจสอบว่ามีข้อมูลอยู่หรือไม่
   * @param {string} key - คีย์ที่ต้องการตรวจสอบ
   * @returns {boolean} ผลการตรวจสอบ
   */
  has(key) {
    return localStorage.getItem(key) !== null;
  },

  /**
   * บันทึกข้อมูลพร้อมกำหนดเวลาหมดอายุ
   * @param {string} key - คีย์สำหรับจัดเก็บ
   * @param {*} value - ข้อมูลที่ต้องการบันทึก
   * @param {number} ttl - เวลาหมดอายุ (มิลลิวินาที)
   * @returns {boolean} สถานะการบันทึก
   */
  saveWithExpiry(key, value, ttl) {
    const item = {
      value,
      expiry: Date.now() + ttl,
    };
    return this.save(key, item);
  },

  /**
   * โหลดข้อมูลพร้อมตรวจสอบเวลาหมดอายุ
   * @param {string} key - คีย์ที่ต้องการโหลด
   * @param {*} defaultValue - ค่าเริ่มต้นหากไม่พบข้อมูลหรือข้อมูลหมดอายุ
   * @returns {*} ข้อมูลที่โหลดหรือค่าเริ่มต้น
   */
  loadWithExpiry(key, defaultValue = null) {
    const item = this.load(key);

    if (!item) return defaultValue;

    if (Date.now() > item.expiry) {
      this.remove(key);
      return defaultValue;
    }

    return item.value;
  },

  /**
   * นับขนาดการใช้งาน localStorage (ในหน่วยไบต์)
   * @returns {number} ขนาดที่ใช้งาน
   */
  getSize() {
    let size = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        size += localStorage[key].length + key.length;
      }
    }
    return size;
  },

  /**
   * ตรวจสอบพื้นที่ว่างใน localStorage
   * @param {number} additionalBytes - จำนวนไบต์ที่ต้องการตรวจสอบเพิ่มเติม
   * @returns {boolean} ผลการตรวจสอบ
   */
  hasSpace(additionalBytes = 0) {
    try {
      const testKey = '___test___';
      const testValue = 'x'.repeat(additionalBytes);
      localStorage.setItem(testKey, testValue);
      localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * บันทึกข้อมูลหลายรายการพร้อมกัน
   * @param {Object} items - ออบเจ็กต์ที่มี key และ value ที่ต้องการบันทึก
   * @returns {boolean} สถานะการบันทึก
   */
  bulkSave(items) {
    let success = true;
    for (const [key, value] of Object.entries(items)) {
      if (!this.save(key, value)) {
        success = false;
      }
    }
    return success;
  },

  /**
   * โหลดข้อมูลหลายรายการพร้อมกัน
   * @param {Array<string>} keys - รายการคีย์ที่ต้องการโหลด
   * @param {*} defaultValue - ค่าเริ่มต้นหากไม่พบข้อมูล
   * @returns {Object} ออบเจ็กต์ที่มีข้อมูลที่โหลด
   */
  bulkLoad(keys, defaultValue = null) {
    const result = {};
    keys.forEach(key => {
      result[key] = this.load(key, defaultValue);
    });
    return result;
  },

  /**
   * ลบข้อมูลหลายรายการพร้อมกัน
   * @param {Array<string>} keys - รายการคีย์ที่ต้องการลบ
   * @returns {boolean} สถานะการลบ
   */
  bulkRemove(keys) {
    let success = true;
    keys.forEach(key => {
      if (!this.remove(key)) {
        success = false;
      }
    });
    return success;
  },

  /**
   * ลบข้อมูลที่หมดอายุทั้งหมด
   */
  clearExpired() {
    const keys = Object.keys(localStorage);
    keys.forEach(key => {
      const item = this.load(key);
      if (item && item.expiry && Date.now() > item.expiry) {
        this.remove(key);
      }
    });
  },

  /**
   * สร้าง namespace สำหรับจัดการข้อมูลแยกตามหมวดหมู่
   * @param {string} prefix - คำนำหน้าสำหรับ namespace
   * @returns {Object} ออบเจ็กต์ที่มีเมธอดสำหรับจัดการข้อมูลใน namespace
   */
  namespace(prefix) {
    return {
      // บันทึกข้อมูลใน namespace
      save: (key, value) => this.save(`${prefix}_${key}`, value),

      // โหลดข้อมูลจาก namespace
      load: (key, defaultValue) => this.load(`${prefix}_${key}`, defaultValue),

      // ลบข้อมูลจาก namespace
      remove: (key) => this.remove(`${prefix}_${key}`),

      // ล้างข้อมูลทั้งหมดใน namespace
      clear: () => {
        const keys = Object.keys(localStorage)
          .filter(k => k.startsWith(`${prefix}_`));
        return this.bulkRemove(keys);
      },

      // ดึงข้อมูลทั้งหมดใน namespace
      getAll: () => {
        const result = {};
        const keys = Object.keys(localStorage)
          .filter(k => k.startsWith(`${prefix}_`));
        keys.forEach(key => {
          const shortKey = key.replace(`${prefix}_`, '');
          result[shortKey] = this.load(key);
        });
        return result;
      }
    };
  }
};

// ล้างข้อมูลที่หมดอายุอัตโนมัติตามระยะเวลาที่กำหนด
setInterval(() => Storage.clearExpired(), CONFIG.CACHE.CLEANUP_INTERVAL || 3600000);
