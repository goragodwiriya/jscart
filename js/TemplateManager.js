/**
 * TemplateManager รับผิดชอบการจัดการเทมเพลต HTML และ modal
 * จัดการการโหลดเทมเพลตจาก DOM, การสร้างอินสแตนซ์พร้อมการผูกข้อมูล
 * และการจัดการสถานะและอีเวนต์ของ modal
 */
const TemplateManager = {
  /**
   * แมพเก็บเทมเพลตโดยใช้ ID เป็นคีย์
   * @type {Map<string, HTMLTemplateElement>}
   */
  templates: new Map(),

  /**
   * โหมดดีบัก
   * @type {boolean}
   */
  debugMode: false,

  /**
   * ค่า z-index พื้นฐานสำหรับ modal เพื่อการจัดเรียงที่ถูกต้อง
   * @type {number}
   */
  modalBaseZIndex: 1000,

  /**
   * เริ่มต้นการทำงานของ TemplateManager
   */
  init() {
    try {
      // โหลดเทมเพลตจาก DOM
      document.querySelectorAll('template[id]').forEach(template => {
        if (this.isValidTemplate(template)) {
          this.templates.set(template.id, template);
        }
      });

      this.debugMode = CONFIG.DEBUG_MODE || false;
      if (this.debugMode) {
        console.log('[TemplateManager] จำนวนเทมเพลตที่โหลด:', this.templates.size);
      }

      State.activeModals = [];
      this.setupGlobalEvents();

    } catch (error) {
      console.error('[TemplateManager] ข้อผิดพลาดในการเริ่มต้น:', error);
    }
  },

  /**
   * ตรวจสอบความถูกต้องของเทมเพลต
   */
  isValidTemplate(template) {
    return template && template.id && template.content;
  },

  /**
   * ตั้งค่าอีเวนต์ระดับ global สำหรับจัดการ modal
   */
  setupGlobalEvents() {
    // จัดการปุ่ม ESC สำหรับปิด modal บนสุด
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.hasActiveModals()) {
        const topModal = this.getTopModal();
        if (topModal && !topModal.classList.contains('persistent')) {
          this.closeModal(topModal);
        }
      }
    });

    // จัดการคลิกนอก modal เพื่อปิด
    document.addEventListener('click', (e) => {
      if (this.hasActiveModals()) {
        const topModal = this.getTopModal();
        if (topModal &&
          !topModal.classList.contains('persistent') &&
          e.target === topModal) {
          this.closeModal(topModal);
        }
      }
    });
  },

  /**
   * สร้างอินสแตนซ์ของเทมเพลตพร้อมข้อมูล
   */
  create(templateId, data = {}) {
    try {
      if (!templateId || typeof templateId !== 'string') {
        throw new Error('ID เทมเพลตไม่ถูกต้อง');
      }

      const template = this.templates.get(templateId);
      if (!template) {
        throw new Error(`ไม่พบเทมเพลต: ${templateId}`);
      }

      const element = template.content.cloneNode(true);
      element.firstElementChild?.setAttribute('data-template', templateId);

      return this.fillData(element, this.sanitizeData(data));

    } catch (error) {
      this.debug('เกิดข้อผิดพลาดในการสร้างเทมเพลต:', error);
      return null;
    }
  },

  /**
   * ทำความสะอาดข้อมูลเพื่อป้องกัน XSS
   */
  sanitizeData(data) {
    if (data instanceof DocumentFragment || data instanceof HTMLElement) {
      return data;
    }

    if (data == null) {
      return '';
    }

    if (data instanceof Date) {
      return data.toISOString();
    }

    if (typeof data === 'string') {
      const div = document.createElement('div');
      div.textContent = data;
      return div.innerHTML;
    }

    if (typeof data === 'number' || typeof data === 'boolean') {
      return data.toString();
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeData(item));
    }

    if (typeof data === 'object') {
      const sanitized = {};
      Object.entries(data).forEach(([key, value]) => {
        sanitized[key] = this.sanitizeData(value);
      });
      return sanitized;
    }

    return String(data);
  },

  /**
   * แทนที่ข้อมูลในเทมเพลต
   */
  fillData(element, data) {
    element.querySelectorAll('[data-text]').forEach(el => {
      const key = el.dataset.text;
      if (data[key] !== undefined) {
        el.textContent = data[key];
      }
    });

    element.querySelectorAll('[data-attr]').forEach(el => {
      const attrs = el.dataset.attr.split(';');
      attrs.forEach(attr => {
        const [attrName, key] = attr.split(':');
        if (['disabled', 'checked'].includes(attrName)) {
          el[attrName] = data[key] == true;
        } else {
          el.setAttribute(attrName, data[key]);
        }
      });
    });

    element.querySelectorAll('[data-class]').forEach(el => {
      const key = el.dataset.class;
      if (data[key] !== undefined) {
        if (typeof data[key] === 'string') {
          el.className = data[key];
        } else if (typeof data[key] === 'object') {
          Object.entries(data[key]).forEach(([className, condition]) => {
            el.classList.toggle(className, condition);
          });
        }
      }
    });

    element.querySelectorAll('[data-if]').forEach(el => {
      const condition = el.dataset.if;
      if (!data[condition]) {
        el.remove();
      }
    });

    element.querySelectorAll('[data-container]').forEach(el => {
      const key = el.dataset.container;
      const content = data[key];

      if (!content) return;

      el.innerHTML = '';

      if (Array.isArray(content)) {
        content.forEach(item => {
          this.appendContent(el, item);
        });
      } else {
        this.appendContent(el, content);
      }
    });

    return element;
  },

  /**
   * เพิ่มเนื้อหาลงใน container
   */
  appendContent(container, content) {
    try {
      if (content instanceof DocumentFragment) {
        container.appendChild(content.cloneNode(true));
      } else if (content instanceof HTMLElement) {
        container.appendChild(content.cloneNode(true));
      } else if (typeof content === 'string') {
        if (content.trim().startsWith('<') && content.trim().endsWith('>')) {
          container.innerHTML += content;
        } else {
          const textNode = document.createTextNode(content);
          container.appendChild(textNode);
        }
      } else if (content !== null && content !== undefined) {
        const textNode = document.createTextNode(String(content));
        container.appendChild(textNode);
      }
    } catch (error) {
      console.error('เกิดข้อผิดพลาดในการเพิ่มเนื้อหา:', error);
      container.appendChild(document.createTextNode(String(content)));
    }
  },

  /**
   * ประมวลผลการผูกข้อมูลตามประเภทที่ระบุ
   */
  processDataBinding(element, type, data) {
    const selector = `[data-${type}]`;
    element.querySelectorAll(selector).forEach(el => {
      try {
        switch (type) {
          case 'text':
            this.bindText(el, data);
            break;
          case 'attr':
            this.bindAttributes(el, data);
            break;
          case 'class':
            this.bindClasses(el, data);
            break;
          case 'if':
            this.bindCondition(el, data);
            break;
          case 'container':
            this.bindContainer(el, data);
            break;
          case 'repeat':
            this.bindRepeat(el, data);
            break;
        }
      } catch (error) {
        this.debug(`เกิดข้อผิดพลาดในการประมวลผล ${type}:`, error);
      }
    });
  },

  /**
   * แสดง modal
   */
  showModal(templateId, data = {}) {
    try {
      const fragment = this.create(templateId, data);
      if (!fragment) return null;

      const wrapper = document.createElement('div');
      wrapper.appendChild(fragment);
      const modal = wrapper.firstElementChild;

      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.style.zIndex = this.modalBaseZIndex + State.activeModals.length;

      document.body.appendChild(modal);
      this.setupModalEvents(modal);
      State.activeModals.push(modal);

      requestAnimationFrame(() => {
        modal.classList.add('active');
        this.focusFirstElement(modal);
      });

      return modal;

    } catch (error) {
      this.debug('เกิดข้อผิดพลาดในการแสดง modal:', error);
      return null;
    }
  },

  /**
   * ตั้งค่าอีเวนต์สำหรับ modal
   */
  setupModalEvents(modal) {
    if (!modal) return;

    const handlers = {
      close: () => this.closeModal(modal),
      backdropClick: (e) => {
        if (e.target === modal && !modal.classList.contains('persistent')) {
          this.closeModal(modal);
        }
      },
      trapFocus: (e) => this.handleTabKey(e, modal)
    };

    modal.querySelectorAll('.modal-close')
      .forEach(btn => btn.addEventListener('click', handlers.close));

    modal.addEventListener('click', handlers.backdropClick);
    modal.addEventListener('keydown', handlers.trapFocus);

    State.activeModals.forEach(m => {
      if (m !== modal) this.closeModal(m);
    });

    modal.addEventListener('modalClosed', () => {
      modal.removeEventListener('click', handlers.backdropClick);
      modal.removeEventListener('keydown', handlers.trapFocus);
    }, {once: true});
  },

  /**
   * จัดการการกดปุ่ม Tab เพื่อควบคุมโฟกัสภายใน modal
   */
  handleTabKey(e, modal) {
    if (e.key !== 'Tab') return;

    const focusableElements = modal.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus();
        e.preventDefault();
      }
    }
  },

  /**
   * ตั้งค่าโฟกัสให้กับอิลิเมนต์แรกที่โฟกัสได้ภายใน modal
   */
  focusFirstElement(modal) {
    const focusable = modal.querySelector(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable) {
      focusable.focus();
    }
  },

  /**
   * ปิด modal
   */
  closeModal(modal) {
    if (!modal) return;

    const close = () => {
      modal.dispatchEvent(new CustomEvent('modalClosed'));
      modal.remove();
      State.activeModals = State.activeModals.filter(m => m !== modal);

      const topModal = this.getTopModal();
      if (topModal) {
        this.focusFirstElement(topModal);
      }
    };

    modal.classList.remove('active');
    modal.classList.add('closing');

    modal.addEventListener('animationend', () => close(), {once: true});
    setTimeout(close, CONFIG.ANIMATION_DURATION);
  },

  /**
   * ปิด modal ทั้งหมด
   */
  closeAllModals() {
    [...State.activeModals].forEach(modal => this.closeModal(modal));
  },

  /**
   * ตรวจสอบว่ามี modal ที่เปิดอยู่หรือไม่
   */
  hasActiveModals() {
    return State.activeModals.length > 0;
  },

  /**
   * ดึง modal ที่อยู่บนสุด
   */
  getTopModal() {
    return State.activeModals[State.activeModals.length - 1] || null;
  },

  /**
   * ลงทะเบียนเทมเพลตใหม่
   */
  registerTemplate(id, templateString) {
    const template = document.createElement('template');
    template.id = id;
    template.innerHTML = templateString;
    this.templates.set(id, template);
  },

  /**
   * ลบเทมเพลตที่ลงทะเบียนไว้
   */
  removeTemplate(id) {
    this.templates.delete(id);
  },

  /**
   * ตรวจสอบว่ามีเทมเพลตที่ระบุหรือไม่
   */
  hasTemplate(id) {
    return this.templates.has(id);
  },

  /**
   * ดึง HTML string ของเทมเพลต
   */
  getTemplateString(id) {
    const template = this.templates.get(id);
    return template ? template.innerHTML : null;
  },

  /**
     * แสดงข้อความดีบัก
     */
  debug(...args) {
    if (this.debugMode) {
      console.log('[TemplateManager]', ...args);
    }
  },

  /**
   * ผูกข้อความกับอิลิเมนต์
   */
  bindText(element, data) {
    const key = element.dataset.text;
    if (data[key] !== undefined) {
      element.textContent = this.sanitizeData(data[key]);
    }
  },

  /**
   * ผูกแอตทริบิวต์กับอิลิเมนต์
   */
  bindAttributes(element, data) {
    const attrs = element.dataset.attr.split(';');
    attrs.forEach(attr => {
      const [attrName, key] = attr.split(':');
      const value = this.sanitizeData(data[key]);

      if (['disabled', 'checked', 'selected', 'readonly'].includes(attrName)) {
        element[attrName] = Boolean(value);
      } else {
        element.setAttribute(attrName, value);
      }
    });
  },

  /**
   * ผูกคลาสกับอิลิเมนต์
   */
  bindClasses(element, data) {
    const key = element.dataset.class;
    const value = data[key];

    if (value !== undefined) {
      if (typeof value === 'string') {
        element.className = this.sanitizeData(value);
      } else if (typeof value === 'object') {
        Object.entries(value).forEach(([className, condition]) => {
          element.classList.toggle(className, Boolean(condition));
        });
      }
    }
  },

  /**
   * ผูกเงื่อนไขกับอิลิเมนต์
   */
  bindCondition(element, data) {
    const condition = element.dataset.if;
    if (!data[condition]) {
      element.remove();
    }
  },

  /**
   * ผูกข้อมูลกับคอนเทนเนอร์
   */
  bindContainer(element, data) {
    const key = element.dataset.container;
    const content = data[key];

    if (!content) {
      element.innerHTML = '';
      return;
    }

    if (Array.isArray(content)) {
      element.innerHTML = '';
      content.forEach(item => {
        this.appendContent(element, this.sanitizeData(item));
      });
    } else {
      element.innerHTML = '';
      this.appendContent(element, this.sanitizeData(content));
    }
  },

  /**
   * ผูกการทำซ้ำกับอิลิเมนต์
   */
  bindRepeat(element, data) {
    const config = element.dataset.repeat.split(':');
    if (config.length !== 2) return;

    const [itemName, arrayKey] = config;
    const array = data[arrayKey];

    if (!Array.isArray(array)) return;

    const template = element.cloneNode(true);
    element.innerHTML = '';

    array.forEach((item, index) => {
      const itemData = {
        [itemName]: item,
        index,
        isFirst: index === 0,
        isLast: index === array.length - 1
      };

      const instance = template.cloneNode(true);
      this.fillData(instance, {...data, ...itemData});
      element.appendChild(instance);
    });
  },

  /**
   * หน่วงเวลาการทำงาน
   */
  async delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  },

  /**
   * เพิ่มคลาสชั่วคราว
   */
  async addTemporaryClass(element, className, duration) {
    element.classList.add(className);
    await this.delay(duration);
    element.classList.remove(className);
  },

  /**
   * อัพเดทข้อมูลในเทมเพลต
   */
  update(element, data) {
    if (!element) return;

    const templateId = element.getAttribute('data-template');
    if (!templateId || !this.hasTemplate(templateId)) return;

    const updatedElement = this.create(templateId, data);
    if (updatedElement) {
      element.replaceWith(updatedElement);
    }
  },

  /**
   * ล้างข้อมูลในเทมเพลต
   */
  clear(element) {
    if (!element) return;
    this.update(element, {});
  }
};