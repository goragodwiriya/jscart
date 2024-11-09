/**
 * ระบบจัดการการแจ้งเตือน
 * รับผิดชอบการสร้าง แสดงผล อัพเดท และลบการแจ้งเตือน
 */
const NotificationManager = {
  /**
   * อิลิเมนต์ที่ใช้เก็บการแจ้งเตือนทั้งหมด
   * @type {HTMLElement|null}
   */
  container: null,

  /**
   * อาเรย์เก็บการแจ้งเตือนที่กำลังแสดงอยู่
   * @type {Array<{id: string, element: HTMLElement, timeout: number}>}
   */
  notifications: [],

  /**
   * จำนวนการแจ้งเตือนทั้งหมดที่ถูกสร้าง
   * @type {number}
   */
  notificationCount: 0,

  /**
   * การแจ้งเตือนที่กำลังแสดงอยู่ในปัจจุบัน
   * @type {Object|null}
   */
  currentNotification: null,

  /**
   * เริ่มต้นระบบแจ้งเตือน
   * - สร้างคอนเทนเนอร์
   * - ลงทะเบียนเทมเพลต
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   */
  init() {
    // สร้างคอนเทนเนอร์สำหรับแสดงการแจ้งเตือน
    this.container = document.createElement('div');
    this.container.className = 'notification-container';
    document.body.appendChild(this.container);

    // ลงทะเบียนเทมเพลต
    TemplateManager.registerTemplate('notification-template', `
      <div class="notification" data-notification-id="">
        <div class="notification-content">
          <div class="notification-icon">
            <i class="icon" data-class="icon"></i>
          </div>
          <div class="notification-body">
            <div class="notification-title" data-if="title" data-text="title"></div>
            <div class="notification-message" data-text="message"></div>
          </div>
          <button class="notification-close">×</button>
        </div>
        <div class="notification-progress"></div>
      </div>
    `);

    this.setupEventListeners();
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์สำหรับการโต้ตอบกับการแจ้งเตือน
   */
  setupEventListeners() {
    this.container.addEventListener('click', (e) => {
      if (e.target.matches('.notification-close')) {
        const notification = e.target.closest('.notification');
        if (notification) {
          this.remove(notification.dataset.notificationId);
        }
      }
    });
  },

  /**
   * แสดงการแจ้งเตือนตามตัวเลือกที่กำหนด
   * @param {Object} options - ตัวเลือกสำหรับการแจ้งเตือน
   * @param {string} [options.type='info'] - ประเภทการแจ้งเตือน ('success', 'error', 'warning', 'info', 'loading')
   * @param {string} [options.title=''] - หัวข้อการแจ้งเตือน
   * @param {string} [options.message=''] - ข้อความแจ้งเตือน
   * @param {number} [options.duration=3000] - ระยะเวลาแสดง (มิลลิวินาที)
   * @param {boolean} [options.closeable=true] - สามารถปิดด้วยตนเองได้หรือไม่
   * @param {boolean} [options.progress=true] - แสดงแถบความคืบหน้าหรือไม่
   * @param {boolean} [options.animate=true] - แสดงแอนิเมชันหรือไม่
   * @returns {string|undefined} - ID ของการแจ้งเตือนหรือ undefined หากล้มเหลว
   */
  show(options) {
    const id = Utils.generateId('notification_');
    const defaults = {
      id,
      type: 'info',
      title: '',
      message: '',
      duration: CONFIG.NOTIFICATION_DURATION || 3000,
      closeable: true,
      progress: true,
      animate: true
    };

    const notification = {...defaults, ...options};

    // ตรวจสอบการแจ้งเตือนซ้ำ
    const isSameNotification = this.currentNotification &&
      this.currentNotification.type === notification.type &&
      this.currentNotification.message === notification.message &&
      this.currentNotification.title === notification.title;

    if (isSameNotification) {
      return;
    }

    this.currentNotification = notification;

    // สร้างอิลิเมนต์การแจ้งเตือน
    const element = TemplateManager.create('notification-template', {
      title: notification.title,
      message: notification.message,
      icon: 'icon-' + this.getIconForType(notification.type)
    });

    const notificationEl = element.querySelector('.notification');
    notificationEl.dataset.notificationId = id;
    notificationEl.classList.add(`notification-${notification.type}`);

    // จัดการปุ่มปิด
    if (!notification.closeable) {
      const closeButton = notificationEl.querySelector('.notification-close');
      if (closeButton) {
        closeButton.remove();
      }
    }

    // แสดงแถบความคืบหน้า
    if (notification.progress && notification.duration) {
      this.startProgress(notificationEl, notification.duration);
    }

    this.container.appendChild(element);

    // แสดงแอนิเมชัน
    if (notification.animate) {
      requestAnimationFrame(() => {
        notificationEl.classList.add('notification-show');
      });
    }

    // ตั้งเวลาลบอัตโนมัติ
    let timeoutId;
    if (notification.duration && notification.duration > 0) {
      timeoutId = setTimeout(() => {
        this.remove(id);
      }, notification.duration);
    }

    // เพิ่มเข้าอาเรย์ติดตาม
    this.notifications.push({
      id,
      element: notificationEl,
      timeout: timeoutId
    });

    // จำกัดจำนวนการแจ้งเตือนสูงสุด
    while (this.notifications.length > 5) {
      this.remove(this.notifications[0].id);
    }

    return id;
  },

  /**
   * ลบการแจ้งเตือนตาม ID
   * @param {string} id - ID ของการแจ้งเตือนที่ต้องการลบ
   */
  remove(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;

    // ล้างตัวจับเวลา
    if (notification.timeout) {
      clearTimeout(notification.timeout);
    }

    // แสดงแอนิเมชันการลบ
    notification.element.classList.remove('notification-show');
    notification.element.classList.add('notification-hide');

    setTimeout(() => {
      notification.element.remove();
      this.notifications = this.notifications.filter(n => n.id !== id);
      this.currentNotification = null;
    }, CONFIG.ANIMATION_DURATION || 300);
  },

  /**
   * แสดงการแจ้งเตือนสำเร็จ
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {Object} [options={}] - ตัวเลือกเพิ่มเติม
   */
  success(message, options = {}) {
    return this.show({
      type: 'success',
      message,
      icon: 'valid',
      ...options
    });
  },

  /**
   * แสดงการแจ้งเตือนข้อผิดพลาด
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {Object} [options={}] - ตัวเลือกเพิ่มเติม
   */
  error(message, options = {}) {
    return this.show({
      type: 'error',
      message,
      icon: 'ban',
      duration: 0,
      ...options
    });
  },

  /**
   * แสดงการแจ้งเตือนคำเตือน
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {Object} [options={}] - ตัวเลือกเพิ่มเติม
   */
  warning(message, options = {}) {
    return this.show({
      type: 'warning',
      message,
      icon: 'warning',
      ...options
    });
  },

  /**
   * แสดงการแจ้งเตือนข้อมูล
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {Object} [options={}] - ตัวเลือกเพิ่มเติม
   */
  info(message, options = {}) {
    return this.show({
      type: 'info',
      message,
      icon: 'info',
      ...options
    });
  },

  /**
   * แสดงการแจ้งเตือนกำลังโหลด
   * @param {string} message - ข้อความแจ้งเตือน
   * @param {Object} [options={}] - ตัวเลือกเพิ่มเติม
   */
  loading(message, options = {}) {
    return this.show({
      type: 'loading',
      message,
      icon: 'loading',
      closeable: false,
      progress: false,
      duration: 0,
      ...options
    });
  },

  /**
   * อัพเดทการแจ้งเตือนกำลังโหลดด้วยข้อความและประเภทใหม่
   * @param {string} id - ID ของการแจ้งเตือนที่ต้องการอัพเดท
   * @param {string} message - ข้อความใหม่
   * @param {string} [type='success'] - ประเภทใหม่
   */
  updateLoading(id, message, type = 'success') {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;

    const element = notification.element;
    element.classList.remove('notification-loading');
    element.classList.add(`notification-${type}`);

    const messageEl = element.querySelector('.notification-message');
    if (messageEl) {
      messageEl.textContent = message;
    }

    const newTimeout = setTimeout(() => {
      this.remove(id);
    }, CONFIG.NOTIFICATION_DURATION || 3000);

    notification.timeout = newTimeout;
  },

  /**
   * เริ่มแอนิเมชันแถบความคืบหน้า
   * @param {HTMLElement} element - อิลิเมนต์การแจ้งเตือน
   * @param {number} duration - ระยะเวลาแสดง (มิลลิวินาที)
   */
  startProgress(element, duration) {
    const progress = element.querySelector('.notification-progress');
    if (!progress) return;

    progress.style.transition = `width ${duration}ms linear`;
    requestAnimationFrame(() => {
      progress.style.width = '0%';
    });
  },

  /**
   * ดึงคลาสไอคอนตามประเภทการแจ้งเตือน
   * @param {string} type - ประเภทการแจ้งเตือน
   * @returns {string} - คลาสไอคอน
   */
  getIconForType(type) {
    const icons = {
      success: 'valid',
      error: 'ban',
      warning: 'warning',
      info: 'info',
      loading: 'loading'
    };
    return icons[type] || icons.info;
  },

  /**
   * ล้างการแจ้งเตือนทั้งหมด
   */
  clear() {
    this.notifications.forEach(notification => {
      this.remove(notification.id);
    });
  },

  /**
   * อัพเดทการแจ้งเตือนที่มีอยู่ด้วยตัวเลือกใหม่
   * @param {string} id - ID ของการแจ้งเตือนที่ต้องการอัพเดท
   * @param {Object} options - ตัวเลือกใหม่
   */
  update(id, options) {
    const notification = this.notifications.find(n => n.id === id);
    if (!notification) return;

    const element = notification.element;

    if (options.message) {
      const messageEl = element.querySelector('.notification-message');
      if (messageEl) {
        messageEl.textContent = options.message;
      }
    }

    if (options.title) {
      const titleEl = element.querySelector('.notification-title');
      if (titleEl) {
        titleEl.textContent = options.title;
      }
    }

    if (options.type) {
      const oldTypeMatch = element.className.match(/notification-(\w+)/);
      const oldType = oldTypeMatch ? oldTypeMatch[1] : null;
      if (oldType) {
        element.classList.remove(`notification-${oldType}`);
      }
      element.classList.add(`notification-${options.type}`);
    }
  }
};