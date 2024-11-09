/**
 * @class NotificationService
 * @description บริการจัดการการส่งการแจ้งเตือนผ่านช่องทางต่างๆ โดยใช้ AdminNotifier
 */
class NotificationService {
  constructor() {
    // เก็บรายการช่องทางการแจ้งเตือนที่เปิดใช้งาน
    this.enabledChannels = Object.values(CONFIG.NOTIFICATIONS)
      .filter(channel => channel.enabled)
      .map(channel => channel.id);
  }

  /**
   * @method sendNotification
   * @description ส่งการแจ้งเตือนไปยังทุกช่องทางที่เปิดใช้งาน
   * @param {Object} options - ตัวเลือกการส่งการแจ้งเตือน
   * @param {string} options.title - หัวข้อการแจ้งเตือน
   * @param {string} options.message - ข้อความการแจ้งเตือน
   * @param {Object} [options.data] - ข้อมูลเพิ่มเติม (ถ้ามี)
   * @returns {Promise<Array>} ผลลัพธ์การส่งการแจ้งเตือน
   */
  async sendNotification({title, message, data = {}}) {
    if (!title || !message) {
      throw new Error('กรุณาระบุหัวข้อและข้อความสำหรับการแจ้งเตือน');
    }

    // สร้างเนื้อหา HTML
    const htmlContent = this.createHtmlContent(title, message, data);

    try {
      // ส่งการแจ้งเตือนผ่าน AdminNotifier
      const results = await AdminNotifier.notify(htmlContent);

      // ตรวจสอบผลลัพธ์
      this.handleNotificationResults(results);

      return results;
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการส่งการแจ้งเตือน:', error);
      throw error;
    }
  }

  /**
   * @method sendUrgentNotification
   * @description ส่งการแจ้งเตือนด่วนพร้อมการจัดรูปแบบพิเศษ
   * @param {string} message - ข้อความการแจ้งเตือน
   * @returns {Promise<Array>}
   */
  async sendUrgentNotification(message) {
    return this.sendNotification({
      title: '⚠️ การแจ้งเตือนด่วน',
      message,
      data: {
        priority: 'high',
        color: '#FF0000',
        icon: '🚨'
      }
    });
  }

  /**
   * @method sendOrderNotification
   * @description ส่งการแจ้งเตือนเกี่ยวกับออเดอร์
   * @param {string} orderId - รหัสออเดอร์
   * @param {string} status - สถานะออเดอร์
   * @param {Object} orderDetails - รายละเอียดออเดอร์
   * @returns {Promise<Array>}
   */
  async sendOrderNotification(orderId, status, orderDetails) {
    const statusText = CONFIG.ORDER_STATUS_TEXT[status] || status;
    const title = `อัพเดทออเดอร์ #${orderId}`;
    const message = `สถานะ: ${statusText}\n${this.formatOrderDetails(orderDetails)}`;

    return this.sendNotification({
      title,
      message,
      data: {
        orderId,
        status,
        type: 'order',
        details: orderDetails
      }
    });
  }

  /**
   * @private
   * @method createHtmlContent
   * @description สร้างเนื้อหา HTML สำหรับการแจ้งเตือน
   * @param {string} title - หัวข้อ
   * @param {string} message - ข้อความ
   * @param {Object} data - ข้อมูลเพิ่มเติม
   * @returns {string} HTML content
   */
  createHtmlContent(title, message, data) {
    const timestamp = new Date().toLocaleString(CONFIG.LOCALE.DEFAULT);
    const priority = data.priority || 'normal';
    const color = data.color || '#000000';

    return `
      <div class="notification ${priority}">
        <h2 style="color: ${color}">${title}</h2>
        <div class="message">${message}</div>
        ${this.createDataSection(data)}
        <div class="footer">
          <small>เวลา: ${timestamp}</small>
          <small>แอพ: ${CONFIG.APP_NAME}</small>
        </div>
      </div>
    `;
  }

  /**
   * @private
   * @method createDataSection
   * @description สร้างส่วนแสดงข้อมูลเพิ่มเติม
   * @param {Object} data - ข้อมูลเพิ่มเติม
   * @returns {string} HTML content
   */
  createDataSection(data) {
    if (!Object.keys(data).length) return '';

    const excludeKeys = ['priority', 'color', 'icon'];
    const filteredData = Object.entries(data)
      .filter(([key]) => !excludeKeys.includes(key));

    if (!filteredData.length) return '';

    return `
      <div class="details">
        ${filteredData.map(([key, value]) => `
          <div class="detail-item">
            <strong>${key}:</strong> ${typeof value === 'object'
        ? JSON.stringify(value, null, 2)
        : value
      }
          </div>
        `).join('')}
      </div>
    `;
  }

  /**
   * @private
   * @method formatOrderDetails
   * @description จัดรูปแบบรายละเอียดออเดอร์
   * @param {Object} details - รายละเอียดออเดอร์
   * @returns {string}
   */
  formatOrderDetails(details) {
    const {items, total, customer} = details;
    let formattedText = '';

    if (customer) {
      formattedText += `ลูกค้า: ${customer.name}\n`;
    }

    if (items?.length) {
      formattedText += '\nรายการสินค้า:\n';
      items.forEach(item => {
        formattedText += `- ${item.name} x${item.quantity}\n`;
      });
    }

    if (total) {
      formattedText += `\nยอดรวม: ${total.toLocaleString()} บาท`;
    }

    return formattedText;
  }

  /**
   * @private
   * @method handleNotificationResults
   * @description จัดการผลลัพธ์การส่งการแจ้งเตือน
   * @param {Array} results - ผลลัพธ์การส่งการแจ้งเตือน
   */
  handleNotificationResults(results) {
    results.forEach((result, index) => {
      const channel = this.enabledChannels[index];
      if (result.status === 'rejected') {
        console.error(`การส่งการแจ้งเตือนไปยัง ${channel} ล้มเหลว:`, result.reason);
      } else if (CONFIG.DEBUG_MODE) {
        console.log(`ส่งการแจ้งเตือนไปยัง ${channel} สำเร็จ:`, result.value);
      }
    });
  }
}