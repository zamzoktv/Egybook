const dialog = document.getElementById('composerDialog');
const textarea = document.getElementById('postText');
const toast = document.getElementById('toast');

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 2300);
}

function openComposer(prefill = '') {
  textarea.value = prefill ? `إضافة ${prefill}\n` : '';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else showToast('ميزة إنشاء المنشور تحتاج متصفحًا حديثًا');
}

document.getElementById('openComposer').addEventListener('click', () => openComposer());
document.getElementById('fab').addEventListener('click', () => openComposer());
document.querySelectorAll('[data-compose]').forEach(button => {
  button.addEventListener('click', () => openComposer(button.dataset.compose));
});
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
document.getElementById('postForm').addEventListener('submit', event => {
  if (event.submitter && event.submitter.id === 'publishBtn') {
    event.preventDefault();
    const text = textarea.value.trim();
    if (!text) return showToast('اكتب حاجة الأول قبل النشر');
    const post = document.createElement('article');
    post.className = 'post panel';
    post.innerHTML = `<header class="post-header"><div class="avatar">ح</div><div class="post-author"><strong>حسابي</strong><small>الآن · ◉</small></div><button class="more-btn" aria-label="المزيد">•••</button></header><p class="post-copy"></p><div class="post-stats"><span>💙 ٠ إعجاب</span><span>٠ تعليق · ٠ مشاركة</span></div><div class="post-actions"><button class="like-btn">♡ <span>إعجاب</span></button><button>▱ <span>تعليق</span></button><button>↗ <span>مشاركة</span></button><button class="save-btn">♧</button></div>`;
    post.querySelector('.post-copy').textContent = text;
    document.querySelector('.feed-section').prepend(post);
    dialog.close();
    showToast('تمت إضافة المنشور للمعاينة التجريبية');
    textarea.value = '';
  }
});

document.addEventListener('click', event => {
  const like = event.target.closest('.like-btn');
  if (like) {
    like.classList.toggle('liked');
    const span = like.querySelector('span');
    if (span) span.textContent = like.classList.contains('liked') ? 'أعجبني' : 'إعجاب';
    return;
  }
  const save = event.target.closest('.save-btn');
  if (save) {
    save.classList.toggle('liked');
    showToast(save.classList.contains('liked') ? 'اتحفظ المنشور في المحفوظات' : 'تم إلغاء الحفظ');
    return;
  }
  const tab = event.target.closest('[data-tab]');
  if (tab) {
    document.querySelectorAll('[data-tab]').forEach(item => item.classList.remove('active','selected'));
    document.querySelectorAll(`[data-tab="${tab.dataset.tab}"]`).forEach(item => item.classList.add(item.classList.contains('bottom-item') ? 'selected' : 'active'));
    showToast(`قسم ${tab.dataset.tab} — واجهة تجريبية`);
  }
});
document.getElementById('messagesBtn').addEventListener('click', () => showToast('واجهة الرسائل هنربطها في المرحلة التالية'));
document.getElementById('bottomMessages').addEventListener('click', () => showToast('واجهة الرسائل هنربطها في المرحلة التالية'));
document.getElementById('sortBtn').addEventListener('click', () => showToast('عرض أحدث المنشورات'));
