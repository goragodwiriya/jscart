/**
 * ระบบจัดการธีม
 * รับผิดชอบการจัดการธีมมืด/สว่าง การบันทึกการตั้งค่า
 * และการตรวจสอบการตั้งค่าธีมของระบบ
 */
const ThemeManager = {
  /**
   * เริ่มต้นการทำงานของระบบจัดการธีม
   * - ค้นหาปุ่มสลับธีม
   * - ตั้งค่าตัวรับฟังเหตุการณ์
   * - โหลดธีมที่บันทึกไว้
   */
  init() {
    this.themeToggle = document.getElementById('themeToggle');
    this.setupEventListeners();
    this.loadTheme();
  },

  /**
   * ตั้งค่าตัวรับฟังเหตุการณ์สำหรับการเปลี่ยนธีม
   * - การคลิกปุ่มสลับธีม
   * - การเปลี่ยนแปลงธีมของระบบ
   */
  setupEventListeners() {
    // ตั้งค่าการคลิกปุ่มสลับธีม
    this.themeToggle?.addEventListener('click', () => this.toggleTheme());

    // รับฟังการเปลี่ยนแปลงธีมของระบบ
    window.matchMedia('(prefers-color-scheme: dark)')
      .addEventListener('change', (e) => this.handleSystemThemeChange(e));
  },

  /**
   * โหลดธีมที่บันทึกไว้หรือใช้ธีมตามการตั้งค่าของระบบ
   */
  loadTheme() {
    const savedTheme = Storage.load('theme');
    if (savedTheme) {
      // ใช้ธีมที่ผู้ใช้บันทึกไว้
      document.documentElement.setAttribute('data-theme', savedTheme);
      this.updateToggleButton(savedTheme);
    } else {
      // ใช้ธีมตามการตั้งค่าของระบบ
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.updateToggleButton(isDark ? 'dark' : 'light');
    }
  },

  /**
   * สลับระหว่างธีมมืดและสว่าง
   * - อัพเดทธีมในหน้าเว็บ
   * - บันทึกการตั้งค่า
   * - อัพเดทปุ่มสลับธีม
   * - แสดงการแจ้งเตือน
   */
  toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

    document.documentElement.setAttribute('data-theme', newTheme);
    Storage.save('theme', newTheme);
    this.updateToggleButton(newTheme);

    // แสดงการแจ้งเตือนการเปลี่ยนธีม
    NotificationManager.info(
      newTheme === 'dark' ? 'เปลี่ยนเป็นธีมมืด' : 'เปลี่ยนเป็นธีมสว่าง'
    );
  },

  /**
   * อัพเดทสถานะและไอคอนของปุ่มสลับธีม
   * @param {string} theme - ธีมปัจจุบัน ('dark' หรือ 'light')
   */
  updateToggleButton(theme) {
    if (!this.themeToggle) return;

    // อัพเดทคลาสของปุ่มตามธีมปัจจุบัน
    this.themeToggle.className = theme === 'dark' ? 'nav-btn icon-night' : 'nav-btn icon-day';
  },

  /**
   * จัดการการเปลี่ยนแปลงธีมของระบบ
   * จะอัพเดทเฉพาะเมื่อผู้ใช้ไม่ได้ตั้งค่าธีมไว้เอง
   * @param {MediaQueryListEvent} e - เหตุการณ์การเปลี่ยนธีมของระบบ
   */
  handleSystemThemeChange(e) {
    // อัพเดทเฉพาะเมื่อผู้ใช้ไม่ได้ตั้งค่าธีมไว้
    if (!Storage.load('theme')) {
      const newTheme = e.matches ? 'dark' : 'light';
      document.documentElement.setAttribute('data-theme', newTheme);
      this.updateToggleButton(newTheme);
    }
  }
};
