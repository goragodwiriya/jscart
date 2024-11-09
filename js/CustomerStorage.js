/**
 * @class CustomerStorage
 * @description จัดการการเก็บข้อมูลลูกค้า รวมถึงข้อมูลส่วนตัวและประวัติการสั่งซื้อ
 */
class CustomerStorage {
  /**
   * สร้างอินสแตนซ์ของ CustomerStorage
   * กำหนดค่าคีย์สำหรับจัดเก็บข้อมูลและภาษาเริ่มต้น จากนั้นเริ่มต้นระบบจัดเก็บ
   */
  constructor() {
    this.STORAGE_KEYS = CONFIG.STORAGE_KEYS;
    this.DEFAULT_LOCALE = CONFIG.LOCALE.DEFAULT;
    this.init();
  }

  /**
   * เริ่มต้นระบบจัดเก็บข้อมูลลูกค้าโดยโหลดข้อมูลที่มีอยู่
   * หากเกิดข้อผิดพลาด จะรีเซ็ตข้อมูลเป็นค่าเริ่มต้น
   */
  init() {
    try {
      this.loadCustomerData();
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเริ่มต้น CustomerStorage:', error);
      this.resetToDefaults();
    }
  }

  /**
   * รีเซ็ตข้อมูลลูกค้าทั้งหมดเป็นค่าเริ่มต้น
   */
  resetToDefaults() {
    this.customerInfo = this.getDefaultCustomerInfo();
    this.addresses = [];
    this.orderHistory = [];
  }

  /**
   * สร้างโครงสร้างข้อมูลลูกค้าเริ่มต้น
   * @returns {Object} ออบเจ็กต์ข้อมูลลูกค้าเริ่มต้น
   */
  getDefaultCustomerInfo() {
    return {
      name: '',
      phone: '',
      email: '',
      addressLine1: '',
      addressLine2: '',
      district: '',
      province: '',
      postalCode: '',
      deliveryNotes: '',
      preferences: {
        preferredPayment: Object.keys(CONFIG.PAYMENT.METHODS)[0],
        newsletter: false,
        language: this.DEFAULT_LOCALE,
        theme: CONFIG.THEME.DEFAULT
      },
      verification: {
        isVerified: false,
        verifiedEmail: false,
        verifiedPhone: false,
        verificationDate: null,
        lastVerificationAttempt: null
      },
      metadata: {
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        lastLogin: null,
        lastOrder: null
      }
    };
  }

  /**
   * โหลดข้อมูลลูกค้าจาก localStorage
   * ผสานข้อมูลที่บันทึกไว้กับข้อมูลเริ่มต้น
   * ส่งอีเวนต์แจ้งการเปลี่ยนแปลงสถานะหลังจากโหลด
   * @throws จะส่งข้อผิดพลาดหากการโหลดข้อมูลล้มเหลว
   */
  loadCustomerData() {
    try {
      const savedInfo = localStorage.getItem(this.STORAGE_KEYS.CUSTOMER);
      if (savedInfo) {
        this.customerInfo = {
          ...this.getDefaultCustomerInfo(),
          ...JSON.parse(savedInfo)
        };
      } else {
        this.customerInfo = this.getDefaultCustomerInfo();
      }

      const savedHistory = localStorage.getItem(this.STORAGE_KEYS.ORDERS);
      this.orderHistory = savedHistory ? JSON.parse(savedHistory) : [];

      EventBus.emit('state:changed', {
        property: 'customerInfo',
        value: this.customerInfo
      });

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการโหลดข้อมูลลูกค้า:', error);
      throw new Error('ไม่สามารถโหลดข้อมูลลูกค้าได้');
    }
  }

  /**
   * อัพเดทข้อมูลลูกค้าด้วยข้อมูลที่ระบุ
   * ตรวจสอบความถูกต้องของข้อมูลก่อนอัพเดท
   * บันทึกข้อมูลที่อัพเดทลง localStorage และส่งอีเวนต์แจ้งการเปลี่ยนแปลง
   * @param {Object} info - ข้อมูลลูกค้าที่จะอัพเดท
   * @returns {Promise<Object>} ออบเจ็กต์ที่มีสถานะความสำเร็จและข้อมูลที่อัพเดท
   * @throws จะส่งข้อผิดพลาดหากการตรวจสอบหรือบันทึกข้อมูลล้มเหลว
   */
  async updateCustomerInfo(info) {
    try {
      const validationResult = this.validateCustomerInfo(info);
      if (!validationResult.isValid) {
        throw new Error(validationResult.message);
      }

      this.customerInfo = {
        ...this.customerInfo,
        ...info,
        metadata: {
          ...this.customerInfo.metadata,
          updatedAt: new Date().toISOString()
        }
      };

      await this.saveCustomerInfo();

      EventBus.emit('state:changed', {
        property: 'customerInfo',
        value: this.customerInfo
      });

      return {
        success: true,
        data: this.customerInfo
      };

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการอัพเดทข้อมูลลูกค้า:', error);
      throw error;
    }
  }

  /**
   * ตรวจสอบความถูกต้องของข้อมูลลูกค้า
   * ตรวจสอบฟิลด์ที่จำเป็นและรูปแบบของข้อมูล
   * @param {Object} info - ข้อมูลลูกค้าที่ต้องการตรวจสอบ
   * @returns {Object} ผลการตรวจสอบ ระบุว่าข้อมูลถูกต้องหรือไม่พร้อมข้อความ
   */
  validateCustomerInfo(info) {
    if (!info) {
      return {
        isValid: false,
        field: null,
        message: 'ข้อมูลไม่ถูกต้อง'
      };
    }

    const required = {
      name: 'ชื่อ-นามสกุล',
      phone: 'เบอร์โทรศัพท์',
      addressLine1: 'ที่อยู่',
      district: 'เขต/อำเภอ',
      province: 'จังหวัด',
      postalCode: 'รหัสไปรษณีย์'
    };

    for (const [field, label] of Object.entries(required)) {
      if (info[field] !== undefined && !info[field]?.trim()) {
        return {
          isValid: false,
          field,
          message: `กรุณากรอก${label}`
        };
      }
    }

    const validations = [
      {
        field: 'name',
        pattern: /^[ก-์\sa-zA-Z]{2,100}$/,
        message: 'ชื่อต้องเป็นภาษาไทยหรืออังกฤษ และมีความยาว 2-100 ตัวอักษร'
      },
      {
        field: 'phone',
        pattern: /^0[1-9][0-9]{8}$/,
        message: 'เบอร์โทรศัพท์ไม่ถูกต้อง ต้องขึ้นต้นด้วย 0 และมี 10 หลัก'
      },
      {
        field: 'email',
        pattern: /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
        message: 'รูปแบบอีเมลไม่ถูกต้อง',
        optional: true
      },
      {
        field: 'district',
        pattern: /^[ก-์\s]{2,50}$/,
        message: 'เขต/อำเภอต้องเป็นภาษาไทยและมีความยาว 2-50 ตัวอักษร'
      },
      {
        field: 'province',
        pattern: /^[ก-์\s]{2,50}$/,
        message: 'จังหวัดต้องเป็นภาษาไทยและมีความยาว 2-50 ตัวอักษร'
      },
      {
        field: 'postalCode',
        pattern: /^[0-9]{5}$/,
        message: 'รหัสไปรษณีย์ต้องเป็นตัวเลข 5 หลัก'
      }
    ];

    for (const validation of validations) {
      if (info[validation.field] !== undefined) {
        const value = info[validation.field]?.trim();
        if (!value && validation.optional) continue;

        if (!validation.pattern.test(value)) {
          return {
            isValid: false,
            field: validation.field,
            message: validation.message
          };
        }
      }
    }

    if (info.addressLine1 !== undefined && info.addressLine1.length < 5) {
      return {
        isValid: false,
        field: 'addressLine1',
        message: 'ที่อยู่ต้องมีความยาวอย่างน้อย 5 ตัวอักษร'
      };
    }

    if (info.deliveryNotes && info.deliveryNotes.length > 200) {
      return {
        isValid: false,
        field: 'deliveryNotes',
        message: 'หมายเหตุการจัดส่งต้องไม่เกิน 200 ตัวอักษร'
      };
    }

    return {
      isValid: true,
      message: 'ข้อมูลถูกต้อง'
    };
  }

  /**
   * บันทึกข้อมูลลูกค้าปัจจุบันลงใน localStorage
   * @returns {Promise<void>}
   * @throws จะส่งข้อผิดพลาดหากการบันทึกล้มเหลว
   */
  async saveCustomerInfo() {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.CUSTOMER,
        JSON.stringify(this.customerInfo)
      );
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกข้อมูลลูกค้า:', error);
      throw new Error('ไม่สามารถบันทึกข้อมูลลูกค้าได้');
    }
  }

  /**
   * จัดรูปแบบที่อยู่หลักจากข้อมูลลูกค้า
   * @returns {string} ที่อยู่ที่จัดรูปแบบแล้ว
   */
  formatMainAddress() {
    const info = this.customerInfo;
    return [
      info.addressLine1,
      info.addressLine2,
      info.district,
      info.province,
      info.postalCode
    ].filter(Boolean).join(' ');
  }

  /**
   * จัดรูปแบบที่อยู่ที่ระบุให้เป็นข้อความเดียว
   * @param {Object} address - ออบเจ็กต์ที่อยู่ที่ต้องการจัดรูปแบบ
   * @returns {string} ที่อยู่ที่จัดรูปแบบแล้ว
   */
  formatAddress(address) {
    return [
      address.addressLine1,
      address.addressLine2,
      address.district,
      address.province,
      address.postalCode
    ].filter(Boolean).join(' ');
  }

  /**
   * เพิ่มออเดอร์ใหม่ลงในประวัติการสั่งซื้อ
   * อัพเดทข้อมูล metadata และบันทึกประวัติที่อัพเดทแล้วพร้อมข้อมูลลูกค้า
   * ส่งอีเวนต์เมื่อเพิ่มสำเร็จ
   * @param {Object} order - ออบเจ็กต์ออเดอร์ที่จะเพิ่ม
   * @returns {Promise<Object>} ออเดอร์ที่เพิ่มใหม่
   * @throws จะส่งข้อผิดพลาดหากการเพิ่มออเดอร์ล้มเหลว
   */
  async addToOrderHistory(order) {
    try {
      const newOrder = {
        ...order,
        status: CONFIG.ORDER_STATUS.PENDING,
        orderDate: new Date().toISOString(),
        statusHistory: {
          [CONFIG.ORDER_STATUS.PENDING]: new Date().toISOString()
        }
      };

      this.orderHistory.unshift(newOrder);
      this.customerInfo.metadata.lastOrder = newOrder.orderDate;

      await Promise.all([
        this.saveOrderHistory(),
        this.saveCustomerInfo()
      ]);

      EventBus.emit('order:created', newOrder);

      return newOrder;

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเพิ่มออเดอร์:', error);
      throw new Error('ไม่สามารถเพิ่มออเดอร์ได้');
    }
  }

  /**
   * ดึงประวัติการสั่งซื้อพร้อมตัวกรอง
   * @param {Object} [filters={}] - ตัวกรองที่ต้องการใช้
   * @param {string} [filters.status] - กรองตามสถานะออเดอร์
   * @param {string} [filters.dateFrom] - กรองออเดอร์ตั้งแต่วันที่ระบุ
   * @param {string} [filters.dateTo] - กรองออเดอร์จนถึงวันที่ระบุ
   * @returns {Array<Object>} รายการออเดอร์ที่ผ่านการกรอง
   */
  getOrderHistory(filters = {}) {
    let filtered = [...this.orderHistory];

    if (filters.status) {
      filtered = filtered.filter(order => order.status === filters.status);
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(order =>
        new Date(order.orderDate) >= new Date(filters.dateFrom)
      );
    }

    if (filters.dateTo) {
      filtered = filtered.filter(order =>
        new Date(order.orderDate) <= new Date(filters.dateTo)
      );
    }

    return filtered;
  }

  /**
   * บันทึกประวัติการสั่งซื้อปัจจุบันลงใน localStorage
   * @returns {Promise<void>}
   * @throws จะส่งข้อผิดพลาดหากการบันทึกล้มเหลว
   */
  async saveOrderHistory() {
    try {
      localStorage.setItem(
        this.STORAGE_KEYS.ORDER_HISTORY,
        JSON.stringify(this.orderHistory)
      );
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการบันทึกประวัติการสั่งซื้อ:', error);
      throw new Error('ไม่สามารถบันทึกประวัติการสั่งซื้อได้');
    }
  }

  /**
   * ล้างข้อมูลลูกค้าทั้งหมดจากระบบจัดเก็บและรีเซ็ตเป็นค่าเริ่มต้น
   * ส่งอีเวนต์แจ้งการเปลี่ยนแปลงหลังจากล้างข้อมูล
   * @returns {Promise<void>}
   * @throws จะส่งข้อผิดพลาดหากการล้างข้อมูลล้มเหลว
   */
  async clearAllData() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });

      this.resetToDefaults();

      EventBus.emit('state:changed', {
        property: 'customerInfo',
        value: this.customerInfo
      });

    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการล้างข้อมูลลูกค้า:', error);
      throw new Error('ไม่สามารถล้างข้อมูลได้');
    }
  }
}