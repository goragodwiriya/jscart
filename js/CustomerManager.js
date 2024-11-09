/**
 * @class CustomerManager
 * @description ระบบจัดการข้อมูลลูกค้า การจัดส่ง และการแสดงผลข้อมูลที่เกี่ยวข้อง
 */
const CustomerManager = {
  /** @type {CustomerStorage} ตัวจัดการข้อมูลลูกค้าใน Storage */
  storage: null,

  /**
   * @method init
   * @description เริ่มต้นระบบจัดการข้อมูลลูกค้า
   */
  init() {
    this.storage = new CustomerStorage();
    this.setupTemplates();
    this.setupEventListeners();
    this.updateProfileDisplay();
  },

  /**
   * @method setupTemplates
   * @description ลงทะเบียนเทมเพลตสำหรับแสดงผลข้อมูลลูกค้า
   */
  setupTemplates() {
    TemplateManager.registerTemplate('customer-info-template',
      `<div id="customerInfoModal" class="modal">
        <div class="modal-content glass">
          <div class="modal-header">
            <h2 class="icon-shipping">ข้อมูลการจัดส่ง</h2>
            <button class="modal-close" aria-label="ปิด">&times;</button>
          </div>
          <form id="profileForm" class="form">
            <div class="modal-body">
              <!-- ข้อมูลส่วนตัว -->
              <div class="form-section">
                <div class="form-group">
                  <label for="name">ชื่อ-นามสกุล *</label>
                  <input type="text" id="name" name="name"
                    class="form-control" data-attr="value:name" required>
                </div>
                <div class="form-group">
                  <label for="phone">เบอร์โทรศัพท์ *</label>
                  <input type="tel" id="phone" name="phone"
                    class="form-control" pattern="[0-9]{10}"
                    title="กรุณากรอกเบอร์โทรศัพท์ 10 หลัก"
                    data-attr="value:phone" required>
                </div>
                <div class="form-group">
                  <label for="email">อีเมล</label>
                  <input type="email" id="email" name="email" class="form-control">
                </div>
              </div>

              <!-- ข้อมูลที่อยู่ -->
              <div class="form-section">
                <div class="form-group">
                  <label class="required" for="addressLine1">ที่อยู่</label>
                  <input type="text" id="addressLine1" name="addressLine1"
                    class="form-control" data-attr="value:addressLine1" required>
                </div>
                <div class="form-group">
                  <label for="addressLine2">ที่อยู่เพิ่มเติม</label>
                  <input type="text" id="addressLine2" name="addressLine2"
                    class="form-control" data-attr="value:addressLine2">
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label class="required" for="district">เขต/อำเภอ</label>
                    <input type="text" id="district" name="district"
                      class="form-control" data-attr="value:district" required>
                  </div>
                  <div class="form-group">
                    <label class="required" for="province">จังหวัด</label>
                    <input type="text" id="province" name="province"
                      class="form-control" data-attr="value:province" required>
                  </div>
                </div>
                <div class="form-group">
                  <label class="required" for="postalCode">รหัสไปรษณีย์</label>
                  <input type="text" id="postalCode" name="postalCode"
                    pattern="[0-9]{5}" class="form-control"
                    data-attr="value:postalCode" required>
                </div>
                <div class="form-group">
                  <label for="deliveryNotes">หมายเหตุสำหรับการจัดส่ง</label>
                  <textarea id="deliveryNotes" name="deliveryNotes"
                    class="form-control" rows="2" data-text="deliveryNotes">
                  </textarea>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="submit" class="btn btn-primary">บันทึกข้อมูล</button>
            </div>
          </form>
        </div>
      </div>`
    );
  },

  /**
   * @method setupEventListeners
   * @description ตั้งค่าการรับฟังอีเวนต์ต่างๆ ที่เกี่ยวข้องกับข้อมูลลูกค้า
   */
  setupEventListeners() {
    document.addEventListener('click', (e) => {
      const target = e.target;
      if (target.id === 'editProfileBtn') {
        this.showEditForm();
      } else if (target.id === 'viewOrderHistoryBtn') {
        OrderHistoryManager.showOrderHistory();
      }
    });

    document.addEventListener('submit', async (e) => {
      if (e.target.id === 'profileForm') {
        e.preventDefault();
        await this.handleProfileSubmit(e.target);
      }
    });

    EventBus.on('state:changed', ({property, value}) => {
      if (property === 'customerInfo') {
        this.updateProfileDisplay();
      }
    });
  },

  /**
   * @method showEditForm
   * @description แสดงฟอร์มแก้ไขข้อมูลลูกค้า
   * @param {Function} [callback] - ฟังก์ชันที่จะทำงานหลังบันทึกข้อมูล
   */
  showEditForm(callback) {
    const customerInfo = this.storage.customerInfo;
    const modal = TemplateManager.showModal('customer-info-template', {
      ...customerInfo
    });

    if (modal) {
      this.setupFormValidation(modal.querySelector('form'));
      if (callback) {
        this.onSaveCallback = callback;
      }
    }
  },

  /**
   * @method setupFormValidation
   * @description ตั้งค่าการตรวจสอบความถูกต้องของฟอร์ม
   * @param {HTMLFormElement} form - ฟอร์มที่ต้องการตรวจสอบ
   */
  setupFormValidation(form) {
    if (!form) return;

    const handleFieldValidation = (field) => {
      this.clearFieldError(field);
      const fieldName = field.getAttribute('name');
      const fieldValue = field.value;

      const validationResult = this.storage.validateCustomerInfo({
        [fieldName]: fieldValue
      });

      if (!validationResult.isValid && validationResult.field === fieldName) {
        this.showFieldError(field, validationResult.message);
      }
    };

    form.querySelectorAll('input, textarea').forEach(field => {
      field.addEventListener('blur', () => handleFieldValidation(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
  },

  /**
   * @method handleProfileSubmit
   * @description จัดการการบันทึกข้อมูลลูกค้า
   * @param {HTMLFormElement} form - ฟอร์มข้อมูลลูกค้า
   */
  async handleProfileSubmit(form) {
    try {
      const formData = new FormData(form);
      const profileData = this.processFormData(formData);

      const validationResult = this.storage.validateCustomerInfo(profileData);
      if (!validationResult.isValid) {
        const field = form.querySelector(`[name="${validationResult.field}"]`);
        if (field) {
          this.showFieldError(field, validationResult.message);
          field.focus();
        }
        NotificationManager.warning(validationResult.message);
        return;
      }

      const loadingId = NotificationManager.loading('กำลังบันทึกข้อมูล...');
      await this.storage.updateCustomerInfo(profileData);
      NotificationManager.updateLoading(loadingId, 'บันทึกข้อมูลเรียบร้อย', 'success');

      TemplateManager.closeModal(document.getElementById('customerInfoModal'));

      if (this.onSaveCallback) {
        this.onSaveCallback(this.storage.customerInfo);
        this.onSaveCallback = null;
      }

    } catch (error) {
      console.error('Error saving profile:', error);
      NotificationManager.error('เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    }
  },

  /**
   * @method processFormData
   * @description แปลงข้อมูลจากฟอร์มให้อยู่ในรูปแบบที่ต้องการ
   * @param {FormData} formData - ข้อมูลจากฟอร์ม
   * @returns {Object} ข้อมูลที่แปลงแล้ว
   */
  processFormData(formData) {
    const profileData = {};
    const notifications = {};

    for (const [key, value] of formData.entries()) {
      if (key === 'notifications') {
        notifications[value] = true;
      } else {
        profileData[key] = value;
      }
    }

    profileData.notifications = notifications;
    return profileData;
  },

  /**
   * @method showFieldError
   * @description แสดงข้อความแจ้งเตือนข้อผิดพลาดในช่องกรอกข้อมูล
   * @param {HTMLElement} field - ช่องกรอกข้อมูล
   * @param {string} message - ข้อความแจ้งเตือน
   */
  showFieldError(field, message) {
    field.classList.add('error');
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = message;
    field.parentNode.insertBefore(errorElement, field.nextSibling);
  },

  /**
   * @method clearFieldError
   * @description ลบข้อความแจ้งเตือนข้อผิดพลาดในช่องกรอกข้อมูล
   * @param {HTMLElement} field - ช่องกรอกข้อมูล
   */
  clearFieldError(field) {
    field.classList.remove('error');
    const errorMessage = field.parentNode.querySelector('.error-message');
    if (errorMessage) {
      errorMessage.remove();
    }
  },

  /**
   * @method updateProfileDisplay
   * @description อัพเดทการแสดงผลชื่อลูกค้า
   */
  updateProfileDisplay() {
    const customerInfo = this.storage.customerInfo;
    const profileName = document.getElementById('editProfileBtn');
    if (profileName && customerInfo?.name) {
      profileName.textContent = customerInfo.name;
    }
  },

  /**
   * @method getCustomerInfo
   * @description ดึงข้อมูลลูกค้าปัจจุบัน
   * @returns {Object} ข้อมูลลูกค้า
   */
  getCustomerInfo() {
    return this.storage.customerInfo;
  }
};