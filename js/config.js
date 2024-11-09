/**
 * ไฟล์การตั้งค่าหลักของแอพพลิเคชัน
 * กำหนดค่าคงที่และการตั้งค่าต่างๆ ที่ใช้ทั่วทั้งแอพพลิเคชัน
 */

// การตั้งค่าระบบ
const CONFIG = {
  // ข้อมูลแอพพลิเคชัน
  APP_NAME: 'ขนมปังสังขยา',
  APP_VERSION: '1.0.0',
  DEBUG_MODE: false,

  // การตั้งค่า UI
  ANIMATION_DURATION: 300,
  NOTIFICATION_DURATION: 3000,
  DEBOUNCE_DELAY: 300,
  THEME: {
    DEFAULT: 'light',
    STORAGE_KEY: 'theme_preference'
  },

  // กฎทางธุรกิจ
  BUSINESS: {
    MIN_ORDER_AMOUNT: 100, // ยอดสั่งซื้อขั้นต่ำ
    DELIVERY_FEE: 50, // ค่าจัดส่ง
    FREE_DELIVERY_AMOUNT: 300, // ยอดสั่งซื้อที่ได้ส่งฟรี
    TAX_RATE: 0.07, // อัตราภาษี
    OPEN_HOUR: 7, // เวลาเปิด
    CLOSE_HOUR: 19, // เวลาปิด
    MAX_ITEMS_PER_ORDER: 20, // จำนวนสินค้าสูงสุดต่อออเดอร์
    MIN_DELIVERY_DISTANCE: 1, // ระยะทางจัดส่งขั้นต่ำ (กิโลเมตร)
    MAX_DELIVERY_DISTANCE: 20 // ระยะทางจัดส่งสูงสุด (กิโลเมตร)
  },

  // การตั้งค่าการชำระเงิน
  PAYMENT: {
    // ช่องทางการชำระเงิน
    METHODS: {
      CREDIT_CARD: {
        id: 'credit_card',
        name: 'บัตรเครดิต/เดบิต',
        description: 'รองรับ Visa, Mastercard, JCB',
        icon: 'icon-payment',
        enabled: true
      },
      PROMPTPAY: {
        id: 'promptpay',
        name: 'พร้อมเพย์',
        description: 'สแกน QR Code เพื่อชำระเงิน',
        icon: 'icon-qrcode',
        enabled: true
      },
      BANK_TRANSFER: {
        id: 'bank_transfer',
        name: 'โอนผ่านธนาคาร',
        description: 'โอนเงินผ่านธนาคาร',
        icon: 'icon-money',
        enabled: true
      },
      TRUE_MONEY: {
        id: 'true_money',
        name: 'ทรูมันนี่ วอลเล็ท',
        description: 'ชำระผ่าน TrueMoney Wallet',
        icon: 'icon-wallet',
        enabled: true
      }
    },
    GATEWAY_URL: 'https://payment.example.com',
    MERCHANT_ID: 'MERCHANT_123',
    TIMEOUT: 5000 // หมดเวลาในการชำระเงิน (มิลลิวินาที)
  },

  // สถานะออเดอร์
  ORDER_STATUS: {
    PENDING: 'pending',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    SHIPPING: 'shipping',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled',
    REFUNDED: 'refunded'
  },

  // ข้อความแสดงสถานะออเดอร์
  ORDER_STATUS_TEXT: {
    'pending': 'รอการชำระเงิน',
    'confirmed': 'ยืนยันการสั่งซื้อ',
    'processing': 'รอดำเนินการ',
    'shipping': 'กำลังจัดส่ง',
    'completed': 'สำเร็จ',
    'cancelled': 'ยกเลิก',
    'refunded': 'คืนเงิน'
  },

  // ช่องทางการแจ้งเตือน
  NOTIFICATIONS: {
    EMAIL: {
      id: 'email',
      name: 'อีเมล',
      icon: 'mail',
      enabled: true,
      config: {
        from: 'no-reply@example.com',
        templates: {
          default: 'default-template',
          order: 'order-template',
          urgent: 'urgent-template'
        },
        smtp: {
          host: 'smtp.example.com',
          port: 587,
          secure: true,
          auth: {
            user: 'your-email@example.com',
            pass: 'your-password'
          }
        }
      }
    },
    LINE: {
      id: 'line',
      name: 'Line Notify',
      icon: 'line',
      enabled: false,
      config: {
        notifyToken: 'YOUR_LINE_NOTIFY_TOKEN', // ใส่ TOKEN ที่ได้จาก LINE Notify
        // การตั้งค่า sticker สำหรับแต่ละประเภทการแจ้งเตือน
        stickers: {
          info: {
            packageId: '446',
            stickerId: '1990'
          },
          success: {
            packageId: '446',
            stickerId: '1988'
          },
          warning: {
            packageId: '446',
            stickerId: '1989'
          },
          error: {
            packageId: '789',
            stickerId: '10885'
          },
          urgent: {
            packageId: '789',
            stickerId: '10881'
          }
        }
      }
    },
    DISCORD: {
      id: 'discord',
      name: 'Discord',
      icon: 'discord',
      enabled: false,
      config: {
        webhooks: {
          default: 'DISCORD_WEBHOOK_URL',
          urgent: 'URGENT_WEBHOOK_URL',
          orders: 'ORDERS_WEBHOOK_URL'
        },
        botToken: 'YOUR_BOT_TOKEN',
        guildId: 'YOUR_GUILD_ID',
        channels: {
          general: 'CHANNEL_ID_1',
          alerts: 'CHANNEL_ID_2',
          orders: 'CHANNEL_ID_3'
        }
      }
    },
    TELEGRAM: {
      id: 'telegram',
      name: 'Telegram',
      icon: 'telegram',
      enabled: false,
      config: {
        botToken: 'YOUR_BOT_TOKEN',
        // สามารถกำหนดได้หลาย chat
        chatIds: {
          default: ['CHAT_ID_1', 'CHAT_ID_2'],
          urgent: ['URGENT_CHAT_ID'],
          orders: ['ORDERS_CHAT_ID']
        },
        parseMode: 'HTML', // หรือ 'Markdown'
        disableNotification: false,
        disableWebPagePreview: true
      }
    },
    WEB_PUSH: {
      id: 'web_push',
      name: 'Web Push',
      icon: 'push',
      enabled: true,
      config: {
        parseMode: 'Markdown', // หรือ 'HTML'
        vapidKeys: {
          public: 'YOUR_PUBLIC_VAPID_KEY',
          private: 'YOUR_PRIVATE_VAPID_KEY'
        },
        options: {
          icon: 'assets/images/notification.png',
          badge: 'assets/images/badge.png',
          vibrate: [100, 50, 100],
          requireInteraction: false,
          ttl: 24 * 60 * 60 // หมดอายุใน 24 ชั่วโมง
        },
        // กำหนดค่าเริ่มต้นสำหรับแต่ละประเภทการแจ้งเตือน
        defaultSettings: {
          urgent: {
            requireInteraction: true,
            vibrate: [200, 100, 200, 100, 200],
            icon: 'assets/images/badge.png'
          },
          order: {
            requireInteraction: true,
            icon: 'assets/images/badge.png'
          }
        }
      }
    }
  },

  // เพิ่มการตั้งค่าทั่วไปสำหรับการแจ้งเตือน
  NOTIFICATION_SETTINGS: {
    // ความถี่ในการส่งซ้ำ (มิลลิวินาที)
    retryDelay: 5000,
    // จำนวนครั้งที่จะลองส่งซ้ำ
    maxRetries: 3,
    // ระยะเวลาที่จะเก็บประวัติการแจ้งเตือน (วัน)
    historyRetention: 30,
    // ขนาดข้อความสูงสุด (ตัวอักษร)
    maxMessageLength: 1000,
    // การจำกัดการส่ง
    rateLimit: {
      // จำนวนการแจ้งเตือนสูงสุดต่อวัน
      maxPerDay: 1000,
      // จำนวนการแจ้งเตือนสูงสุดต่อชั่วโมง
      maxPerHour: 100,
      // ระยะเวลาขั้นต่ำระหว่างการแจ้งเตือน (วินาที)
      minInterval: 1
    },
    // ตัวเลือกการแสดงผล
    display: {
      // เวลาแสดงผลเริ่มต้น (มิลลิวินาที)
      duration: 5000,
      // ตำแหน่งการแสดงผล ('top-right', 'top-left', 'bottom-right', 'bottom-left')
      position: 'top-right',
      // จำนวนการแจ้งเตือนสูงสุดที่แสดงพร้อมกัน
      maxVisible: 5
    },
    // ประเภทการแจ้งเตือน
    types: {
      info: {
        icon: 'info-circle',
        color: '#3498db'
      },
      success: {
        icon: 'check-circle',
        color: '#2ecc71'
      },
      warning: {
        icon: 'exclamation-triangle',
        color: '#f1c40f'
      },
      error: {
        icon: 'times-circle',
        color: '#e74c3c'
      },
      urgent: {
        icon: 'bell',
        color: '#c0392b'
      }
    }
  },

  // การตั้งค่าภาษาและท้องถิ่น
  LOCALE: {
    DEFAULT: 'th-TH',
    CURRENCY: 'THB',
    TIMEZONE: 'Asia/Bangkok',
    DATE_FORMAT: {
      SHORT: 'DD/MM/YYYY',
      LONG: 'D MMMM YYYY',
      WITH_TIME: 'D MMMM YYYY, HH:mm'
    }
  },

  // คีย์สำหรับจัดเก็บข้อมูล
  STORAGE_KEYS: {
    CART: 'bakery_cart', // ตะกร้าสินค้า
    USER: 'bakery_user', // ข้อมูลผู้ใช้
    SETTINGS: 'bakery_settings', // การตั้งค่า
    CUSTOMER: 'bakery_customer', // ข้อมูลลูกค้า
    ORDERS: 'bakery_orders', // ประวัติการสั่งซื้อ
    PREFERENCES: 'bakery_preferences' // การกำหนดค่า
  },

  // การตั้งค่า API
  API: {
    ENDPOINT: 'https://api.example.com',
    VERSION: 'v1',
    TIMEOUT: 5000, // หมดเวลาการเรียก API
    RETRY_ATTEMPTS: 3, // จำนวนครั้งที่ลองใหม่
    RETRY_DELAY: 1000 // ระยะเวลารอก่อนลองใหม่
  },

  // การตั้งค่าการวิเคราะห์
  ANALYTICS: {
    ENABLED: true,
    TRACKING_ID: 'UA-XXXXX-Y',
    EVENTS: {
      PAGE_VIEW: 'page_view', // ดูหน้า
      ADD_TO_CART: 'add_to_cart', // เพิ่มลงตะกร้า
      REMOVE_FROM_CART: 'remove_from_cart', // ลบจากตะกร้า
      BEGIN_CHECKOUT: 'begin_checkout', // เริ่มการชำระเงิน
      PURCHASE: 'purchase', // ซื้อสินค้า
      VIEW_PRODUCT: 'view_product' // ดูสินค้า
    }
  },

  // การตั้งค่าการแคช
  CACHE: {
    PRODUCT_TTL: 3600, // อายุแคชสินค้า (1 ชั่วโมง)
    CATEGORY_TTL: 7200, // อายุแคชหมวดหมู่ (2 ชั่วโมง)
    CUSTOMER_TTL: 86400 // อายุแคชข้อมูลลูกค้า (24 ชั่วโมง)
  }
};

/**
 * สถานะระบบ
 * เก็บข้อมูลสถานะต่างๆ ของแอพพลิเคชัน
 */
const State = {
  // ตะกร้าสินค้า
  cart: {
    items: [],
    total: 0,
    quantity: 0,
    lastUpdated: null
  },

  // ข้อมูลสินค้า
  products: [],
  categories: [],
  tags: {},
  featuredProducts: [],

  // ข้อมูลผู้ใช้
  currentUser: null,
  customerInfo: null,
  deliveryAddresses: [],
  orderHistory: [],

  // สถานะ UI
  isLoading: false,
  activeModals: [],
  notifications: [],
  currentCategory: 'all',
  searchQuery: '',
  filters: {
    category: null,
    priceRange: null,
    tags: []
  },

  // การตั้งค่าแอพ
  settings: {
    theme: CONFIG.THEME.DEFAULT,
    notifications: {
      email: true,
      sms: false,
      line: true
    },
    language: CONFIG.LOCALE.DEFAULT
  },

  // สถานะระบบ
  isOnline: navigator.onLine,
  lastSync: null,
  errors: []
};

/**
 * ระบบจัดการเหตุการณ์
 * ใช้สำหรับสื่อสารระหว่างส่วนต่างๆ ของแอพพลิเคชัน
 */
const EventBus = {
  listeners: {},

  /**
   * รับฟังเหตุการณ์
   * @param {string} event - ชื่อเหตุการณ์
   * @param {Function} callback - ฟังก์ชันที่จะทำงานเมื่อเกิดเหตุการณ์
   */
  on(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = new Set();
    }
    this.listeners[event].add(callback);
    return () => this.off(event, callback);
  },

  /**
   * ส่งเหตุการณ์
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`เกิดข้อผิดพลาดในการจัดการเหตุการณ์ ${event}:`, error);
        }
      });
    }
  },

  /**
   * ยกเลิกการรับฟังเหตุการณ์
   */
  off(event, callback) {
    if (this.listeners[event]) {
      this.listeners[event].delete(callback);
    }
  },

  /**
   * รับฟังเหตุการณ์เพียงครั้งเดียว
   */
  once(event, callback) {
    const unsubscribe = this.on(event, (data) => {
      callback(data);
      unsubscribe();
    });
  },

  /**
   * ล้างการรับฟังเหตุการณ์
   */
  clear(event) {
    if (event) {
      delete this.listeners[event];
    } else {
      this.listeners = {};
    }
  }
};

// ตั้งค่าให้ใช้งานได้ทั่วทั้งแอพพลิเคชัน
window.CONFIG = CONFIG;
window.State = State;
window.EventBus = EventBus;

// ป้องกันการแก้ไขค่าในโหมดการผลิต
if (!CONFIG.DEBUG_MODE) {
  Object.freeze(CONFIG);

  // สร้าง proxy สำหรับติดตามการเปลี่ยนแปลงสถานะ
  window.State = new Proxy(State, {
    set(target, property, value) {
      const mutableProps = ['cart', 'isLoading', 'currentUser', 'notifications'];

      if (mutableProps.includes(property)) {
        target[property] = value;
        EventBus.emit('state:changed', {property, value});
        return true;
      }

      console.warn(`พยายามแก้ไขค่าที่ไม่อนุญาต: ${property}`);
      return false;
    }
  });
}

// ตั้งค่าการติดตามการเปลี่ยนแปลงสถานะ
EventBus.on('state:changed', ({property, value}) => {
  if (CONFIG.DEBUG_MODE) {
    console.log(`สถานะเปลี่ยนแปลง: ${property}`, value);
  }

  // บันทึกการเปลี่ยนแปลงอัตโนมัติ
  if (['cart', 'settings', 'customerInfo'].includes(property)) {
    try {
      localStorage.setItem(
        CONFIG.STORAGE_KEYS[property.toUpperCase()],
        JSON.stringify(value)
      );
    } catch (error) {
      console.error(`ไม่สามารถบันทึก ${property} ลง localStorage:`, error);
    }
  }
});
