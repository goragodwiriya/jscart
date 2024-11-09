/**
 * @class AdminNotifier
 * @description ระบบจัดการการส่งการแจ้งเตือนไปยังช่องทางต่างๆ ที่กำหนดไว้ใน CONFIG.NOTIFICATIONS
 */
const AdminNotifier = {
  // เก็บประวัติการส่งการแจ้งเตือน
  notificationHistory: [],

  // เก็บสถิติการส่ง
  stats: {
    totalSent: 0,
    successCount: 0,
    failureCount: 0,
    lastSentTime: null
  },

  /**
   * @method notify
   * @description ส่งเนื้อหา HTML ไปยังทุกช่องทางการแจ้งเตือนที่เปิดใช้งาน
   * @param {string} htmlContent - เนื้อหา HTML ที่ต้องการส่ง
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Promise<Array>} ผลลัพธ์การส่งการแจ้งเตือน
   */
  async notify(htmlContent, options = {}) {
    try {
      // ตรวจสอบข้อมูลที่จำเป็น
      if (!htmlContent) {
        throw new Error('กรุณาระบุเนื้อหา HTML สำหรับการแจ้งเตือน');
      }

      // ตรวจสอบการจำกัดการส่ง
      if (!this.checkRateLimit()) {
        throw new Error('เกินขีดจำกัดการส่งการแจ้งเตือน กรุณารอสักครู่');
      }

      // รวมตัวเลือกกับค่าเริ่มต้น
      const finalOptions = {
        type: 'info',
        priority: 'normal',
        retry: true,
        ...options
      };

      // เก็บ Promise ของการส่งการแจ้งเตือนทั้งหมด
      const notifications = [];

      // วนลูปส่งการแจ้งเตือนไปยังทุกช่องทางที่เปิดใช้งาน
      for (const [channelId, channelConfig] of Object.entries(CONFIG.NOTIFICATIONS)) {
        if (channelConfig.enabled) {
          notifications.push(
            this.sendNotificationWithRetry(channelConfig, htmlContent, finalOptions)
          );
        }
      }

      // รอผลลัพธ์ทั้งหมด
      const results = await Promise.allSettled(notifications);

      // อัพเดทสถิติ
      this.updateStats(results);

      // บันทึกประวัติ
      this.logNotification(htmlContent, finalOptions, results);

      return results;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการส่งการแจ้งเตือน:', error);
      throw error;
    }
  },

  /**
   * @private
   * @method sendNotificationWithRetry
   * @description ส่งการแจ้งเตือนพร้อมระบบลองใหม่อัตโนมัติ
   * @param {Object} channel - ข้อมูลการตั้งค่าช่องทางการแจ้งเตือน
   * @param {string} htmlContent - เนื้อหา HTML ที่ต้องการส่ง
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Promise<Object>}
   */
  async sendNotificationWithRetry(channel, htmlContent, options) {
    let attempts = 0;
    const maxRetries = options.retry ? CONFIG.NOTIFICATION_SETTINGS.maxRetries : 0;

    while (attempts <= maxRetries) {
      try {
        return await this.sendNotification(channel, htmlContent, options);
      } catch (error) {
        attempts++;
        if (attempts > maxRetries) throw error;

        // รอก่อนลองใหม่
        await new Promise(resolve =>
          setTimeout(resolve, CONFIG.NOTIFICATION_SETTINGS.retryDelay)
        );
      }
    }
  },

  /**
   * @private
   * @method sendNotification
   * @description ส่งเนื้อหาที่จัดรูปแบบแล้วไปยังช่องทางที่ระบุ
   * @param {Object} channel - ข้อมูลการตั้งค่าช่องทางการแจ้งเตือน
   * @param {string} htmlContent - เนื้อหา HTML ที่ต้องการส่ง
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Promise<Object>}
   */
  async sendNotification(channel, htmlContent, options) {
    const content = this.formatContentForChannel(htmlContent, channel, options);

    try {
      switch (channel.id) {
        case 'email':
          return await this.sendEmailNotification(channel, content);

        case 'line':
          return await this.sendLineNotification(channel, content);

        case 'discord':
          return await this.sendDiscordNotification(channel, content);

        case 'telegram':
          return await this.sendTelegramNotification(channel, content);

        case 'web_push':
          return await this.sendWebPushNotification(channel, content);

        default:
          throw new Error(`ไม่รองรับช่องทาง ${channel.id}`);
      }
    } catch (error) {
      console.error(`ไม่สามารถส่งการแจ้งเตือนไปยัง ${channel.name}:`, error);
      throw error;
    }
  },

  /**
   * @private
   * @method sendEmailNotification
   */
  async sendEmailNotification(channel, content) {
    const {smtp, from, templates} = channel.config;
    // ตัวอย่างการใช้ nodemailer (ต้องติดตั้งเพิ่มเติม)
    const template = templates[content.type] || templates.default;

    return {
      success: true,
      channel: channel.id,
      messageId: `email_${Date.now()}`
    };
  },

  /**
   * @method sendLineNotification
   * @description ส่งข้อความผ่าน LINE Notify
   * @param {Object} channel - ข้อมูลการตั้งค่าช่องทาง LINE
   * @param {Object} content - เนื้อหาที่จะส่ง
   * @returns {Promise<Object>}
   */
  async sendLineNotification(channel, content) {
    try {
      const lineNotifyEndpoint = 'https://notify-api.line.me/api/notify';
      const notifyToken = channel.config.notifyToken;

      if (!notifyToken) {
        throw new Error('ไม่พบ LINE Notify Token');
      }

      const formData = new URLSearchParams();
      formData.append('message', content.text);

      if (content.imageUrl) {
        formData.append('imageThumbnail', content.imageUrl);
        formData.append('imageFullsize', content.imageUrl);
      }

      if (content.stickerPackageId && content.stickerId) {
        formData.append('stickerPackageId', content.stickerPackageId);
        formData.append('stickerId', content.stickerId);
      }

      const response = await fetch(lineNotifyEndpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${notifyToken}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`LINE Notify API error: ${result.message}`);
      }

      return {
        success: true,
        channel: channel.id,
        messageId: `line_${Date.now()}`,
        response: result
      };
    } catch (error) {
      console.error('ไม่สามารถส่งการแจ้งเตือนผ่าน LINE:', error);
      throw error;
    }
  },

  /**
   * @private
   * @method sendDiscordNotification
   */
  async sendDiscordNotification(channel, content) {
    const {webhooks} = channel.config;
    const webhook = webhooks[content.type] || webhooks.default;

    const response = await fetch(webhook, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        content: content.text,
        embeds: content.embeds
      })
    });

    if (!response.ok) {
      throw new Error(`Discord API error: ${response.statusText}`);
    }

    return {
      success: true,
      channel: channel.id,
      messageId: `discord_${Date.now()}`
    };
  },

  /**
   * @private
   * @method sendTelegramNotification
   */
  async sendTelegramNotification(channel, content) {
    const {botToken, chatIds, parseMode} = channel.config;
    const targetChatIds = chatIds[content.type] || chatIds.default;

    return {
      success: true,
      channel: channel.id,
      messageId: `telegram_${Date.now()}`
    };
  },

  /**
   * @private
   * @method sendWebPushNotification
   */
  async sendWebPushNotification(channel, content) {
    const {options} = channel.config;
    WebPushNotification.info(content.text, {
      ...options,
      ...(content.options || {})
    });

    return {
      success: true,
      channel: channel.id,
      messageId: `webpush_${Date.now()}`
    };
  },

  /**
   * @private
   * @method formatContentForChannel
   * @description แปลงเนื้อหา HTML ให้เหมาะสมกับแต่ละช่องทาง
   * @param {string} html - เนื้อหา HTML
   * @param {Object} channel - ข้อมูลช่องทางการแจ้งเตือน
   * @param {Object} options - ตัวเลือกเพิ่มเติม
   * @returns {Object} เนื้อหาที่จัดรูปแบบแล้ว
   */
  formatContentForChannel(html, channel, options) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html.textContent, 'text/html');
    const plainText = this.htmlToPlainText(doc);
    const title = doc.querySelector('h1, h2, h3')?.textContent || 'การแจ้งเตือนใหม่';

    // ดึงค่าสีและไอคอนตามประเภท
    const typeConfig = CONFIG.NOTIFICATION_SETTINGS.types[options.type] ||
      CONFIG.NOTIFICATION_SETTINGS.types.info;

    // กำหนดรูปแบบตามช่องทาง
    switch (channel.id) {
      case 'email':
        return {
          type: options.type,
          subject: title,
          html: html,
          text: plainText
        };

      case 'line':
        // ปรับแต่งข้อความสำหรับ LINE
        let lineMessage = '\n';

        // เพิ่มไอคอนตามประเภทการแจ้งเตือน
        switch (options.type) {
          case 'success':
            lineMessage += '✅ ';
            break;
          case 'warning':
            lineMessage += '⚠️ ';
            break;
          case 'error':
            lineMessage += '❌ ';
            break;
          case 'urgent':
            lineMessage += '🚨 ';
            break;
          default:
            lineMessage += 'ℹ️ ';
        }

        // เพิ่มหัวข้อ
        lineMessage += `${title}\n\n`;

        // เพิ่มเนื้อหา
        lineMessage += plainText;

        // เพิ่มเวลา
        lineMessage += `\n\nเวลา: ${new Date().toLocaleString('th-TH')}`;

        // กำหนด sticker ตามประเภท
        let stickerInfo = {};
        switch (options.type) {
          case 'success':
            stickerInfo = {packageId: '446', stickerId: '1988'}; // ชูนิ้วโป้ง
            break;
          case 'warning':
            stickerInfo = {packageId: '446', stickerId: '1989'}; // ตกใจ
            break;
          case 'error':
            stickerInfo = {packageId: '789', stickerId: '10885'}; // ผิดหวัง
            break;
          case 'urgent':
            stickerInfo = {packageId: '789', stickerId: '10881'}; // ฉุกเฉิน
            break;
        }

        return {
          text: lineMessage,
          ...stickerInfo,
          type: options.type
        };

      case 'discord':
        return {
          type: options.type,
          text: plainText,
          embeds: [{
            title: title,
            description: plainText,
            color: this.hexToDecimal(typeConfig.color),
            timestamp: new Date().toISOString()
          }]
        };

      case 'telegram':
        return {
          type: options.type,
          text: `<b>${title}</b>\n\n${plainText}`,
          parse_mode: 'HTML'
        };

      case 'web_push':
        return {
          type: options.type,
          title: title,
          text: plainText.substring(0, 100) + '...',
          options: {
            icon: typeConfig.icon,
            badge: channel.config.options.badge,
            ...channel.config.defaultSettings[options.type]
          }
        };

      default:
        return {
          type: options.type,
          text: plainText
        };
    }
  },

  /**
   * @private
   * @method htmlToPlainText
   * @description แปลง HTML เป็นข้อความธรรมดาโดยรักษาโครงสร้างเอาไว้
   * @param {Document} doc - เอกสาร HTML ที่แปลงแล้ว
   * @returns {string} ข้อความธรรมดา
   */
  htmlToPlainText(doc) {
    let text = '';
    const walk = (node) => {
      if (node.nodeType === 3) { // โหนดข้อความ
        text += node.textContent;
      } else if (node.nodeType === 1) { // โหนดองค์ประกอบ
        const nodeName = node.nodeName.toLowerCase();

        // เพิ่มบรรทัดใหม่ก่อนองค์ประกอบแบบบล็อก
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(nodeName)) {
          if (text.length && !text.endsWith('\n')) {
            text += '\n';
          }
        }

        // เพิ่มสัญลักษณ์หัวข้อย่อยสำหรับรายการ
        if (nodeName === 'li') {
          text += '• ';
        }

        // ประมวลผลโหนดลูก
        node.childNodes.forEach(walk);

        // เพิ่มบรรทัดใหม่หลังองค์ประกอบแบบบล็อก
        if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'tr'].includes(nodeName)) {
          text += '\n';
        }
      }
    };

    walk(doc.body);
    return text
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  },

  /**
   * @private
   * @method checkRateLimit
   * @description ตรวจสอบการจำกัดการส่ง
   * @returns {boolean}
   */
  checkRateLimit() {
    const now = Date.now();
    const {rateLimit} = CONFIG.NOTIFICATION_SETTINGS;

    // ตรวจสอบระยะห่างขั้นต่ำ
    if (this.stats.lastSentTime &&
      (now - this.stats.lastSentTime) < (rateLimit.minInterval * 1000)) {
      return false;
    }

    // ตรวจสอบจำนวนต่อชั่วโมง
    const hourlyNotifications = this.notificationHistory.filter(
      n => (now - n.timestamp) < 3600000
    ).length;
    if (hourlyNotifications >= rateLimit.maxPerHour) {
      return false;
    }

    // ตรวจสอบจำนวนต่อวัน
    const dailyNotifications = this.notificationHistory.filter(
      n => (now - n.timestamp) < 86400000
    ).length;
    if (dailyNotifications >= rateLimit.maxPerDay) {
      return false;
    }

    return true;
  },

  /**
     * @private
     * @method updateStats
     * @description อัพเดทสถิติการส่งการแจ้งเตือน
     * @param {Array} results - ผลลัพธ์การส่งการแจ้งเตือน
     */
  updateStats(results) {
    this.stats.totalSent += results.length;
    this.stats.successCount += results.filter(r => r.status === 'fulfilled').length;
    this.stats.failureCount += results.filter(r => r.status === 'rejected').length;
    this.stats.lastSentTime = Date.now();
  },

  /**
   * @private
   * @method logNotification
   * @description บันทึกประวัติการแจ้งเตือน
   * @param {string} content - เนื้อหาที่ส่ง
   * @param {Object} options - ตัวเลือกที่ใช้
   * @param {Array} results - ผลลัพธ์การส่ง
   */
  logNotification(content, options, results) {
    const notification = {
      id: `notify_${Date.now()}`,
      timestamp: Date.now(),
      content,
      options,
      results: results.map(r => ({
        status: r.status,
        channel: r.value?.channel,
        error: r.reason?.message
      }))
    };

    this.notificationHistory.unshift(notification);

    // จำกัดขนาดประวัติ
    const maxAge = CONFIG.NOTIFICATION_SETTINGS.historyRetention * 86400000; // แปลงวันเป็นมิลลิวินาที
    this.notificationHistory = this.notificationHistory.filter(
      n => (Date.now() - n.timestamp) < maxAge
    );
  },

  /**
   * @private
   * @method hexToDecimal
   * @description แปลงสี HEX เป็นเลขฐานสิบ (สำหรับ Discord)
   * @param {string} hex - รหัสสี HEX
   * @returns {number} เลขฐานสิบ
   */
  hexToDecimal(hex) {
    return parseInt(hex.replace('#', ''), 16);
  },

  /**
   * @method getStats
   * @description ดึงสถิติการส่งการแจ้งเตือน
   * @returns {Object} สถิติการส่งการแจ้งเตือน
   */
  getStats() {
    return {
      ...this.stats,
      historyCount: this.notificationHistory.length,
      successRate: this.stats.totalSent ?
        (this.stats.successCount / this.stats.totalSent * 100).toFixed(2) + '%' :
        '0%'
    };
  },

  /**
   * @method getHistory
   * @description ดึงประวัติการแจ้งเตือน
   * @param {Object} options - ตัวเลือกการกรอง
   * @returns {Array} ประวัติการแจ้งเตือน
   */
  getHistory(options = {}) {
    let history = [...this.notificationHistory];

    // กรองตามประเภท
    if (options.type) {
      history = history.filter(n => n.options.type === options.type);
    }

    // กรองตามช่วงเวลา
    if (options.startDate) {
      history = history.filter(n => n.timestamp >= options.startDate);
    }
    if (options.endDate) {
      history = history.filter(n => n.timestamp <= options.endDate);
    }

    // จัดเรียง
    if (options.sort) {
      history.sort((a, b) => {
        return options.sort === 'asc' ?
          a.timestamp - b.timestamp :
          b.timestamp - a.timestamp;
      });
    }

    // จำกัดจำนวน
    if (options.limit) {
      history = history.slice(0, options.limit);
    }

    return history;
  },

  /**
   * @method clearHistory
   * @description ล้างประวัติการแจ้งเตือน
   * @param {Object} options - ตัวเลือกการล้างประวัติ
   */
  clearHistory(options = {}) {
    if (options.before) {
      this.notificationHistory = this.notificationHistory.filter(
        n => n.timestamp > options.before
      );
    } else {
      this.notificationHistory = [];
    }
  }
};