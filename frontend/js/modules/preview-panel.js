/**
 * Preview Panel
 * Sandbox preview + element mapping + natural language edits + multimodal input
 */
class PreviewPanel {
  constructor() {
    this.hostId = null;
    this.root = null;
    this.iframe = null;
    this.currentSource = '';
    this.selectedElement = null;
    this.deviceMode = 'desktop';
    this.apiUrl = window.appState?.settings?.apiUrl || window.location.origin;
  }

  attachTo(hostId) {
    this.hostId = hostId;
    const host = document.getElementById(hostId);
    if (!host) {
      return;
    }

    host.innerHTML = `
      <div class="preview-panel">
        <div class="preview-toolbar">
          <div class="preview-device">
            <button class="btn-secondary" data-device="mobile">移动</button>
            <button class="btn-secondary" data-device="tablet">平板</button>
            <button class="btn-secondary" data-device="desktop">桌面</button>
          </div>
          <div class="preview-actions">
            <label class="btn-secondary">
              上传参考图
              <input type="file" id="previewImageInput" accept="image/*" style="display:none;" />
            </label>
            <button class="btn-secondary" id="previewSketchBtn">草图</button>
          </div>
        </div>
        <div class="preview-body">
          <div class="preview-iframe-wrap">
            <iframe id="previewIframe" sandbox="allow-scripts allow-same-origin"></iframe>
          </div>
          <div class="preview-side">
            <div class="preview-section">
              <div class="preview-section-title">元素定位</div>
              <div id="previewElementInfo" class="preview-element-info">点击预览区元素进行定位</div>
            </div>
            <div class="preview-section">
              <div class="preview-section-title">自然语言修改</div>
              <textarea id="previewNlInput" placeholder="例如：把标题改为‘创意验证平台’"></textarea>
              <button class="btn-primary" id="previewApplyBtn">应用修改</button>
            </div>
            <div class="preview-section">
              <div class="preview-section-title">多模态结果</div>
              <div id="previewVisionResult" class="preview-vision-result">暂无</div>
            </div>
          </div>
        </div>
      </div>
    `;

    this.root = host.querySelector('.preview-panel');
    this.iframe = host.querySelector('#previewIframe');

    host.querySelectorAll('[data-device]').forEach(btn => {
      btn.addEventListener('click', () => this.setDeviceMode(btn.dataset.device));
    });

    const imageInput = host.querySelector('#previewImageInput');
    imageInput?.addEventListener('change', event => this.handleImageUpload(event));

    host.querySelector('#previewApplyBtn')?.addEventListener('click', () => this.applyNlUpdate());
  }

  renderPreview({ artifact }) {
    if (!this.iframe || !artifact) {
      return;
    }
    this.currentSource = artifact.content || '';
    this.iframe.srcdoc = this.currentSource;

    this.iframe.onload = () => {
      try {
        const doc = this.iframe.contentDocument;
        doc.addEventListener('click', evt => {
          evt.preventDefault();
          evt.stopPropagation();
          this.handleElementPick(evt.target);
        });
      } catch (error) {}
    };
  }

  setDeviceMode(mode) {
    this.deviceMode = mode;
    if (!this.iframe) return;
    const wrap = this.iframe.parentElement;
    if (!wrap) return;
    wrap.classList.remove('mode-mobile', 'mode-tablet', 'mode-desktop');
    wrap.classList.add(`mode-${mode}`);
  }

  handleElementPick(element) {
    if (!element) return;
    if (this.selectedElement) {
      this.selectedElement.style.outline = '';
    }
    this.selectedElement = element;
    element.style.outline = '2px dashed #3b82f6';

    const mapping = this.mapElementToSource(element);
    const info = document.getElementById('previewElementInfo');
    if (info) {
      info.innerHTML = `
        <div><strong>标签：</strong>${element.tagName.toLowerCase()}</div>
        <div><strong>类：</strong>${element.className || '-'}</div>
        <div><strong>行号：</strong>${mapping.line || '未定位'}</div>
      `;
    }
  }

  mapElementToSource(element) {
    if (!element || !this.currentSource) {
      return {};
    }
    const snippet = element.outerHTML.slice(0, 200);
    const index = this.currentSource.indexOf(snippet);
    if (index === -1) {
      return {};
    }
    const line = this.currentSource.slice(0, index).split('\n').length;
    return { line };
  }

  applyNlUpdate() {
    const input = document.getElementById('previewNlInput');
    if (!input) return;
    const instruction = input.value.trim();
    if (!instruction) return;

    if (this.selectedElement) {
      this.selectedElement.textContent = instruction;
    }

    input.value = '';
  }

  async handleImageUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = String(reader.result || '').split(',')[1] || '';
      if (!base64) return;
      try {
        if (window.requireAuth) {
          const ok = await window.requireAuth({ redirect: true, prompt: true });
          if (!ok) {
            return;
          }
        }
        const authToken = window.getAuthToken ? window.getAuthToken() : null;
        const response = await fetch(`${this.apiUrl}/api/vision/analyze`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
          },
          body: JSON.stringify({ image: base64, prompt: '请识别参考图的关键界面元素', enableOCR: true })
        });
        if (!response.ok) {
          throw new Error('分析失败');
        }
        const result = await response.json();
        const text = result.data?.ocrResult?.text || '无识别内容';
        const target = document.getElementById('previewVisionResult');
        if (target) {
          target.textContent = text;
        }
      } catch (error) {
        const target = document.getElementById('previewVisionResult');
        if (target) {
          target.textContent = '识别失败';
        }
      }
    };
    reader.readAsDataURL(file);
  }
}

if (typeof window !== 'undefined') {
  window.previewPanel = new PreviewPanel();
}
