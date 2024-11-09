/**
 * @class WebPushNotification
 * @description จัดการการแจ้งเตือนแบบ Web Push
 */
class WebPushNotification {
  static subscriptions = new Set();
  static permission = null;
  static hasServiceWorker = false;

  /**
   * @static
   * @method initialize
   * @description ตั้งค่าเริ่มต้นสำหรับ Web Push
   */
  static async initialize() {
    try {
      // ตรวจสอบการรองรับ
      if (!('Notification' in window)) {
        throw new Error('เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือนแบบ Web Push');
      }

      // ตรวจสอบและขอสิทธิ์
      this.permission = await Notification.requestPermission();

      if (this.permission === 'granted') {
        // พยายามลงทะเบียน Service Worker แต่ไม่บังคับ
        try {
          await this.registerServiceWorker();
        } catch (error) {
          console.warn('ไม่สามารถลงทะเบียน Service Worker:', error);
          // ทำงานต่อไปแม้ไม่มี Service Worker
        }
      }
    } catch (error) {
      console.error('ไม่สามารถเริ่มต้น Web Push:', error);
    }
  }
  /**
    * @static
    * @method registerServiceWorker
    * @description ลงทะเบียน Service Worker สำหรับ Web Push (ถ้าเป็นไปได้)
    */
  static async registerServiceWorker() {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    try {
      // ใช้ Blob สร้าง Service Worker แทนการโหลดไฟล์
      const swContent = `
      self.addEventListener('push', function(event) {
        if (!(self.Notification && self.Notification.permission === 'granted')) {
          return;
        }

        const data = event.data?.json() ?? {};
        const title = data.title || 'การแจ้งเตือนใหม่';
        const options = {
          body: data.message,
          icon: data.icon,
          badge: data.badge,
          vibrate: data.vibrate,
          data: data.data || {},
          actions: data.actions || [],
          requireInteraction: data.requireInteraction || false
        };

        event.waitUntil(
          self.registration.showNotification(title, options)
        );
      });

      self.addEventListener('notificationclick', function(event) {
        event.notification.close();

        if (event.action === 'view' && event.notification.data.url) {
          event.waitUntil(
            clients.openWindow(event.notification.data.url)
          );
        }
      });

      self.addEventListener('notificationclose', function(event) {
        console.log('Notification closed', event.notification);
      });
    `;

      const blob = new Blob([swContent], {type: 'text/javascript'});
      const swUrl = URL.createObjectURL(blob);

      const registration = await navigator.serviceWorker.register(swUrl, {
        scope: './'
      });

      this.hasServiceWorker = true;

      // ถ้าต้องการใช้ Push API
      if (CONFIG.NOTIFICATIONS.WEB_PUSH.config.vapidKeys?.public) {
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: CONFIG.NOTIFICATIONS.WEB_PUSH.config.vapidKeys.public
        });
        this.subscriptions.add(subscription);
      }

      // ทำความสะอาด URL object
      URL.revokeObjectURL(swUrl);
    } catch (error) {
      console.warn('Service Worker registration failed:', error);
      this.hasServiceWorker = false;
    }
  }

  /**
   * @static
   * @method show
   * @description แสดงการแจ้งเตือนโดยใช้ Native Notification API
   * @param {string} title - หัวข้อการแจ้งเตือน
   * @param {Object} options - ตัวเลือกการแจ้งเตือน
   */
  static async show(title, options = {}) {
    try {
      if (this.permission !== 'granted') {
        // ลองขอสิทธิ์อีกครั้ง
        this.permission = await Notification.requestPermission();
        if (this.permission !== 'granted') {
          throw new Error('ไม่ได้รับอนุญาตให้แสดงการแจ้งเตือน');
        }
      }

      // รวมตัวเลือกกับค่าเริ่มต้น
      const defaultOptions = CONFIG.NOTIFICATIONS.WEB_PUSH.config.options;
      const notificationOptions = {
        ...defaultOptions,
        ...options,
        badge: defaultOptions.badge,
        timestamp: Date.now(),
        silent: false
      };

      // สร้างการแจ้งเตือน
      const notification = new Notification(title, notificationOptions);

      // จัดการ events
      notification.onclick = (event) => {
        event.preventDefault();
        if (options.onClick) {
          options.onClick(event);
        }
        notification.close();
      };

      notification.onclose = (event) => {
        if (options.onClose) {
          options.onClose(event);
        }
      };

      // ปิดอัตโนมัติ
      if (options.duration) {
        setTimeout(() => notification.close(), options.duration);
      }

      return notification;
    } catch (error) {
      console.error('ไม่สามารถแสดงการแจ้งเตือน:', error);
      throw error;
    }
  }

  /**
   * @static
   * @method info
   * @description แสดงการแจ้งเตือนแบบ info
   * @param {string} message - ข้อความ
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  static info(message, options = {}) {
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types.info;
    return this.show(message, {
      ...options,
      icon: typeConfig.icon,
      badge: CONFIG.NOTIFICATIONS.WEB_PUSH.config.options.badge,
      duration: CONFIG.NOTIFICATION_SETTINGS.display.duration
    });
  }

  /**
   * @static
   * @method success
   * @description แสดงการแจ้งเตือนแบบ success
   * @param {string} message - ข้อความ
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  static success(message, options = {}) {
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types.success;
    return this.show(message, {
      ...options,
      icon: typeConfig.icon,
      badge: CONFIG.NOTIFICATIONS.WEB_PUSH.config.options.badge,
      duration: CONFIG.NOTIFICATION_SETTINGS.display.duration
    });
  }

  /**
   * @static
   * @method warning
   * @description แสดงการแจ้งเตือนแบบ warning
   * @param {string} message - ข้อความ
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  static warning(message, options = {}) {
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types.warning;
    return this.show(message, {
      ...options,
      icon: typeConfig.icon,
      badge: CONFIG.NOTIFICATIONS.WEB_PUSH.config.options.badge,
      duration: CONFIG.NOTIFICATION_SETTINGS.display.duration * 1.5 // แสดงนานขึ้น
    });
  }

  /**
   * @static
   * @method error
   * @description แสดงการแจ้งเตือนแบบ error
   * @param {string} message - ข้อความ
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  static error(message, options = {}) {
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types.error;
    return this.show(message, {
      ...options,
      icon: typeConfig.icon,
      badge: CONFIG.NOTIFICATIONS.WEB_PUSH.config.options.badge,
      duration: CONFIG.NOTIFICATION_SETTINGS.display.duration * 2, // แสดงนานขึ้น
      requireInteraction: true // ต้องการการตอบสนองจากผู้ใช้
    });
  }

  /**
   * @static
   * @method urgent
   * @description แสดงการแจ้งเตือนแบบ urgent
   * @param {string} message - ข้อความ
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   */
  static urgent(message, options = {}) {
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types.urgent;
    return this.show(message, {
      ...options,
      icon: typeConfig.icon,
      badge: CONFIG.NOTIFICATIONS.WEB_PUSH.config.options.badge,
      vibrate: [200, 100, 200, 100, 200], // รูปแบบการสั่น
      requireInteraction: true,
      actions: [
        {
          action: 'view',
          title: 'ดูรายละเอียด'
        },
        {
          action: 'dismiss',
          title: 'ปิด'
        }
      ]
    });
  }
}

// เริ่มต้นระบบเมื่อโหลดหน้าเว็บ
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => WebPushNotification.initialize());
} else {
  WebPushNotification.initialize();
}

window.WebPushNotification = new WebPushNotification;
