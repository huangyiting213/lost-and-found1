import { t } from "./i18n.js";

let modalEl = null;

// 确保 modal HTML 存在(只创建一次)
function ensureModal() {
    if (modalEl) return modalEl;
    
    const html = `
        <div class="modal fade warm-modal" id="warmConfirmModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content">
                    <div class="modal-body">
                        <div class="warm-modal-icon" id="warmModalIcon">🗑️</div>
                        <h5 id="warmModalTitle">Are you sure?</h5>
                        <p class="warm-modal-detail" id="warmModalDetail">You are about to:</p>
                        <div class="warm-modal-item" id="warmModalItem"></div>
                        <p class="warm-modal-hint" id="warmModalHint">This action cannot be undone.</p>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal" id="warmModalCancel">Cancel</button>
                        <button type="button" class="btn btn-danger" id="warmModalConfirm">Confirm</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML("beforeend", html);
    modalEl = document.getElementById("warmConfirmModal");
    return modalEl;
}

/**
 * 弹出确认弹窗
 * @param {Object} options
 *   - icon: emoji 字符串(默认 🗑️)
 *   - iconType: 'danger' / 'success' / 默认暖橙
 *   - title: 标题(支持 i18n key 或文本)
 *   - detail: 详细说明(支持 i18n key 或文本)
 *   - itemName: 物品名(高亮显示)
 *   - hint: 底部提示文字
 *   - confirmText: 确认按钮文字
 *   - confirmClass: 'btn-danger' / 'btn-success' / 'btn-primary'
 *   - cancelText: 取消按钮文字
 * @returns Promise<boolean>(true=确认, false=取消)
 */
export function showConfirm(options = {}) {
    ensureModal();
    
    const {
        icon = "🗑️",
        iconType = "danger",
        title = "Are you sure?",
        detail = "",
        itemName = "",
        hint = "This action cannot be undone.",
        confirmText = "Confirm",
        confirmClass = "btn-danger",
        cancelText = "Cancel"
    } = options;
    
    // 注入内容
    const iconEl = document.getElementById("warmModalIcon");
    iconEl.textContent = icon;
    iconEl.className = `warm-modal-icon ${iconType}`;
    
    document.getElementById("warmModalTitle").textContent = title;
    document.getElementById("warmModalDetail").textContent = detail;
    document.getElementById("warmModalDetail").style.display = detail ? "block" : "none";
    
    const itemEl = document.getElementById("warmModalItem");
    itemEl.textContent = itemName;
    itemEl.style.display = itemName ? "inline-block" : "none";
    
    document.getElementById("warmModalHint").textContent = hint;
    
    const cancelBtn = document.getElementById("warmModalCancel");
    cancelBtn.textContent = cancelText;
    
    const confirmBtn = document.getElementById("warmModalConfirm");
    confirmBtn.textContent = confirmText;
    confirmBtn.className = `btn ${confirmClass}`;
    
    // 显示并等待结果
    const bsModal = new bootstrap.Modal(modalEl);
    bsModal.show();
    
    return new Promise((resolve) => {
        const onConfirm = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            modalEl.removeEventListener("hidden.bs.modal", onDismiss);
            bsModal.hide();
            resolve(true);
        };
        const onDismiss = () => {
            confirmBtn.removeEventListener("click", onConfirm);
            modalEl.removeEventListener("hidden.bs.modal", onDismiss);
            resolve(false);
        };
        confirmBtn.addEventListener("click", onConfirm);
        modalEl.addEventListener("hidden.bs.modal", onDismiss);
    });
}

/**
 * 弹出 Toast 提示(成功/失败的轻量提示)
 * @param {string} message - 显示文字
 * @param {string} type - 'success' / 'danger' / 'info'(默认)
 * @param {string} icon - emoji 图标(可选)
 */
export function showToast(message, type = "info", icon = "") {
    const defaultIcons = { success: "✅", danger: "⚠️", info: "💡" };
    const useIcon = icon || defaultIcons[type] || "💡";
    
    const toast = document.createElement("div");
    toast.className = `warm-toast ${type}`;
    toast.innerHTML = `<span class="toast-icon">${useIcon}</span><span>${message}</span>`;
    document.body.appendChild(toast);
    
    // 触发淡入
    setTimeout(() => toast.classList.add("show"), 10);
    
    // 2.8 秒后淡出移除
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 400);
    }, 2800);
}