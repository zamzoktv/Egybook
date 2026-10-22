/* =========================================================
   EgyBook — Complete Frontend JavaScript
   Arabic RTL | Responsive Social Feed
   Local Storage | Posts | Likes | Comments | Search
   ========================================================= */

(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) =>
    Array.from(root.querySelectorAll(selector));

  const STORAGE_KEY = "egybook_posts_v1";
  const SAVED_KEY = "egybook_saved_v1";
  const MAX_MEDIA_SIZE = 5 * 1024 * 1024;

  const postsList = $("#postsList");
  const postForm = $("#postForm");
  const postContent = $("#postContent");
  const createPostModal = $("#createPostModal");
  const searchModal = $("#searchModal");
  const commentModal = $("#commentModal");
  const photoInput = $("#photoInput");
  const videoInput = $("#videoInput");
  const mediaPreview = $("#mediaPreview");
  const toastElement = $("#toast");
  const searchInput = $("#searchInput");
  const commentForm = $("#commentForm");
  const commentContent = $("#commentContent");
  const postVisibility = $("#postVisibility");
  const emptyMessage = $("#emptyMessage");

  let selectedMedia = null;
  let activeCommentPost = null;
  let toastTimer = null;
  let newestFirst = true;
  let currentPage = "home";
  let activeSearch = "";
  let savedPostIds = readJSON(SAVED_KEY, []);

  /* =========================
     STORAGE HELPERS
     ========================= */

  function readJSON(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      console.warn("EgyBook: Unable to read local storage.", error);
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.warn("EgyBook: Unable to save local data.", error);
      showToast("مساحة التخزين على الجهاز غير كافية.");
      return false;
    }
  }

  function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, character => {
      const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
      };

      return entities[character];
    });
  }

  function formatDate(timestamp) {
    try {
      return new Intl.DateTimeFormat("ar-EG", {
        dateStyle: "medium",
        timeStyle: "short"
      }).format(new Date(timestamp));
    } catch {
      return "الآن";
    }
  }

  function createId() {
    if (window.crypto && typeof window.crypto.randomUUID === "function") {
      return window.crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }

  /* =========================
     TOAST
     ========================= */

  function showToast(message) {
    if (!toastElement) return;

    toastElement.textContent = message;
    toastElement.classList.add("show");

    clearTimeout(toastTimer);

    toastTimer = setTimeout(() => {
      toastElement.classList.remove("show");
    }, 2800);
  }

  /* =========================
     MODAL HELPERS
     ========================= */

  function openModal(modal) {
    if (!modal) return;

    modal.hidden = false;
    modal.classList.add("is-open");
    document.body.style.overflow = "hidden";

    const focusTarget = $("textarea, input:not([type='file']), select", modal);

    if (focusTarget) {
      setTimeout(() => focusTarget.focus(), 80);
    }
  }

  function closeModal(modal) {
    if (!modal) return;

    modal.hidden = true;
    modal.classList.remove("is-open");

    if (!$(".modal.is-open")) {
      document.body.style.overflow = "";
    }
  }

  function closeAllModals() {
    $$(".modal").forEach(closeModal);
  }

  function openComposer() {
    selectedMedia = null;

    if (postForm) {
      postForm.reset();
    }

    if (mediaPreview) {
      mediaPreview.innerHTML = "";
      mediaPreview.hidden = true;
    }

    openModal(createPostModal);
  }

  /* =========================
     POST STORAGE
     ========================= */

  function getStoredPosts() {
    const posts = readJSON(STORAGE_KEY, []);
    return Array.isArray(posts) ? posts : [];
  }

  function saveStoredPosts(posts) {
    return writeJSON(STORAGE_KEY, posts);
  }

  function persistPost(post) {
    const posts = getStoredPosts();
    posts.unshift(post);

    if (!saveStoredPosts(posts)) {
      showToast("تعذر حفظ المنشور على الجهاز.");
      return false;
    }

    return true;
  }

  function updateStoredPost(postId, updater) {
    const posts = getStoredPosts();
    const index = posts.findIndex(post => post.id === postId);

    if (index < 0) return;

    const updated = updater(posts[index]);
    posts[index] = updated;

    saveStoredPosts(posts);
  }

  function removeStoredPost(postId) {
    const posts = getStoredPosts().filter(post => post.id !== postId);
    saveStoredPosts(posts);
  }

  /* =========================
     MEDIA
     ========================= */

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("تعذرت قراءة الملف."));

      reader.readAsDataURL(file);
    });
  }

  async function handleMediaSelection(file, type) {
    if (!file) return;

    if (file.size > MAX_MEDIA_SIZE) {
      showToast("حجم الملف أكبر من 5 ميجابايت.");
      return;
    }

    if (type === "image" && !file.type.startsWith("image/")) {
      showToast("اختار ملف صورة صالح.");
      return;
    }

    if (type === "video" && !file.type.startsWith("video/")) {
      showToast("اختار ملف فيديو صالح.");
      return;
    }

    try {
      const dataURL = await readFileAsDataURL(file);

      selectedMedia = {
        type,
        data: dataURL,
        name: file.name,
        mimeType: file.type
      };

      renderMediaPreview();
      openModal(createPostModal);

      showToast(type === "image" ? "تم اختيار الصورة." : "تم اختيار الفيديو.");
    } catch {
      showToast("حصلت مشكلة أثناء قراءة الملف.");
    }
  }

  function renderMediaPreview() {
    if (!mediaPreview || !selectedMedia) return;

    mediaPreview.innerHTML = "";

    const media = document.createElement(
      selectedMedia.type === "image" ? "img" : "video"
    );

    media.src = selectedMedia.data;
    media.alt = selectedMedia.type === "image" ? "معاينة الصورة" : "معاينة الفيديو";

    if (selectedMedia.type === "video") {
      media.controls = true;
      media.preload = "metadata";
    }

    mediaPreview.appendChild(media);
    mediaPreview.hidden = false;
  }

  function createMediaElement(media) {
    if (!media || !media.data) return null;

    const element = document.createElement(
      media.type === "video" ? "video" : "img"
    );

    element.className = "post-media";
    element.src = media.data;

    if (media.type === "video") {
      element.controls = true;
      element.preload = "metadata";
    } else {
      element.alt = "صورة المنشور";
      element.loading = "lazy";
    }

    return element;
  }

  /* =========================
     POST RENDERING
     ========================= */

  function createPostElement(post) {
    const article = document.createElement("article");

    article.className = "post";
    article.dataset.postId = post.id;
    article.dataset.createdAt = String(post.createdAt || Date.now());
    article.dataset.visibility = post.visibility || "الجميع";

    const isLiked = Boolean(post.liked);
    const isSaved = savedPostIds.includes(post.id);
    const comments = Array.isArray(post.comments) ? post.comments : [];

    article.innerHTML = `
      <header class="post-header">
        <div class="avatar">${escapeHTML(post.avatar || "ح")}</div>

        <div class="post-author">
          <div class="author-name">${escapeHTML(post.author || "مستخدم EgyBook")}</div>
          <div class="post-meta">${escapeHTML(post.dateLabel || formatDate(post.createdAt))} · 🌐</div>
        </div>

        <button class="more-button" data-action="post-menu" aria-label="خيارات المنشور">⋯</button>
      </header>

      <p class="post-text">${escapeHTML(post.text || "")}</p>

      <div class="post-media-container"></div>

      <div class="post-stats">
        <div class="reaction-summary">
          <div class="reaction-icons"><span>👍</span><span>❤️</span></div>
          <span class="like-count">${Number(post.likes || 0)} تفاعل</span>
        </div>

        <span>
          <span class="comment-count">${comments.length}</span> تعليق ·
          <span class="share-count">${Number(post.shares || 0)}</span> مشاركة
        </span>
      </div>

      <div class="post-actions">
        <button class="post-action ${isLiked ? "liked" : ""}" data-action="like" aria-pressed="${isLiked}">
          <span class="action-icon">👍</span><span>إعجاب</span>
        </button>

        <button class="post-action" data-action="comment">
          <span class="action-icon">▱</span><span>تعليق</span>
        </button>

        <button class="post-action" data-action="share">
          <span class="action-icon">➦</span><span>مشاركة</span>
        </button>

        <button class="post-action ${isSaved ? "saved" : ""}" data-action="save" aria-pressed="${isSaved}">
          <span class="action-icon">♧</span><span>حفظ</span>
        </button>
      </div>

      <div class="comments-area" hidden>
        <div class="comment-list"></div>

        <form class="comment-form">
          <input type="text" name="comment" maxlength="1000" placeholder="اكتب تعليقك..." aria-label="اكتب تعليقك" required>
          <button type="submit">إرسال</button>
        </form>
      </div>
    `;

    const mediaContainer = $(".post-media-container", article);
    const mediaElement = createMediaElement(post.media);

    if (mediaElement && mediaContainer) {
      mediaContainer.appendChild(mediaElement);
    }

    const commentList = $(".comment-list", article);

    comments.forEach(comment => {
      commentList.appendChild(createCommentElement(comment));
    });

    return article;
  }

  function createCommentElement(comment) {
    const element = document.createElement("div");
    element.className = "comment";

    const author = document.createElement("span");
    author.className = "comment-author";
    author.textContent = comment.author || "مستخدم";

    const text = document.createElement("span");
    text.textContent = comment.text || "";

    element.append(author, text);

    return element;
  }

  function renderStoredPosts() {
    if (!postsList) return;

    const posts = getStoredPosts();
    postsList.querySelectorAll("[data-generated='true']").forEach(element => element.remove());

    posts.forEach(post => {
      const element = createPostElement(post);
      element.dataset.generated = "true";

      if (newestFirst) {
        postsList.prepend(element);
      } else {
        postsList.append(element);
      }
    });

    applyCurrentFilters();
  }

  /* =========================
     CREATE A POST
     ========================= */

  async function publishPost(event) {
    event.preventDefault();

    const text = postContent?.value.trim() || "";

    if (!text && !selectedMedia) {
      showToast("اكتب شيئًا أو أضف صورة أو فيديو.");
      return;
    }

    const post = {
      id: createId(),
      author: "أنت",
      avatar: "ح",
      text,
      createdAt: Date.now(),
      dateLabel: "الآن",
      likes: 0,
      liked: false,
      comments: [],
      shares: 0,
      visibility: postVisibility?.value || "الجميع",
      media: selectedMedia ? { ...selectedMedia } : null
    };

    if (!persistPost(post)) return;

    const element = createPostElement(post);
    element.dataset.generated = "true";

    if (postsList) {
      if (newestFirst) {
        postsList.prepend(element);
      } else {
        postsList.append(element);
      }
    }

    postForm.reset();
    selectedMedia = null;

    if (mediaPreview) {
      mediaPreview.innerHTML = "";
      mediaPreview.hidden = true;
    }

    if (photoInput) photoInput.value = "";
    if (videoInput) videoInput.value = "";

    closeModal(createPostModal);
    showToast("تم نشر منشورك على هذا الجهاز.");
    applyCurrentFilters();
  }

  /* =========================
     LIKES
     ========================= */

  function toggleLike(postElement) {
    const postId = postElement.dataset.postId;
    const button = $('[data-action="like"]', postElement);

    if (!button) return;

    const liked = button.classList.toggle("liked");
    button.setAttribute("aria-pressed", String(liked));

    updateStoredPost(postId, post => ({
      ...post,
      liked,
      likes: Math.max(0, Number(post.likes || 0) + (liked ? 1 : -1))
    }));

    const stored = getStoredPosts().find(post => post.id === postId);

    if (stored) {
      const count = $(".like-count", postElement);
      if (count) count.textContent = `${stored.likes} تفاعل`;
    }

    showToast(liked ? "أضفت إعجابك ❤️" : "تم إلغاء الإعجاب.");
  }

  /* =========================
     SAVED POSTS
     ========================= */

  function toggleSave(postElement) {
    const postId = postElement.dataset.postId;
    const button = $('[data-action="save"]', postElement);

    if (!button) return;

    const wasSaved = savedPostIds.includes(postId);

    if (wasSaved) {
      savedPostIds = savedPostIds.filter(id => id !== postId);
    } else {
      savedPostIds.push(postId);
    }

    writeJSON(SAVED_KEY, savedPostIds);

    button.classList.toggle("saved", !wasSaved);
    button.setAttribute("aria-pressed", String(!wasSaved));

    showToast(wasSaved ? "تمت إزالة المنشور من المحفوظات." : "تم حفظ المنشور على جهازك.");

    if (currentPage === "saved") {
      applyCurrentFilters();
    }
  }

  /* =========================
     COMMENTS
     ========================= */

  function toggleComments(postElement) {
    const area = $(".comments-area", postElement);

    if (!area) return;

    area.hidden = !area.hidden;

    if (!area.hidden) {
      const input = $('input[name="comment"]', area);
      if (input) input.focus();
    }
  }

  function addComment(postElement, text) {
    const postId = postElement.dataset.postId;
    const comment = {
      id: createId(),
      author: "أنت",
      text,
      createdAt: Date.now()
    };

    const list = $(".comment-list", postElement);

    if (list) {
      list.appendChild(createCommentElement(comment));
    }

    const countElement = $(".comment-count", postElement);

    if (countElement) {
      countElement.textContent = String(
        Number(countElement.textContent || 0) + 1
      );
    }

    updateStoredPost(postId, post => ({
      ...post,
      comments: [...(post.comments || []), comment]
    }));

    showToast("تمت إضافة تعليقك.");
  }

  function submitInlineComment(event) {
    event.preventDefault();

    const form = event.target;
    const input = $('input[name="comment"]', form);
    const text = input?.value.trim();

    if (!text) return;

    const postElement = form.closest(".post");

    if (!postElement) return;

    addComment(postElement, text);
    form.reset();
  }

  function openCommentModal(postElement) {
    activeCommentPost = postElement;
    if (commentForm) commentForm.reset();
    openModal(commentModal);
  }

  function submitModalComment(event) {
    event.preventDefault();

    const text = commentContent?.value.trim();

    if (!text || !activeCommentPost) return;

    addComment(activeCommentPost, text);

    const area = $(".comments-area", activeCommentPost);
    if (area) area.hidden = false;

    closeModal(commentModal);
    activeCommentPost = null;
  }

  /* =========================
     SHARE
     ========================= */

  async function sharePost(postElement) {
    const text = $(".post-text", postElement)?.textContent || "";
    const shareData = {
      title: "EgyBook",
      text: text || "شاهد هذا المنشور على EgyBook",
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(
          `${shareData.text}\n${shareData.url}`
        );
        showToast("تم نسخ المنشور لمشاركته.");
      } else {
        showToast("المشاركة المباشرة غير متاحة على هذا المتصفح.");
        return;
      }

      const postId = postElement.dataset.postId;

      updateStoredPost(postId, post => ({
        ...post,
        shares: Number(post.shares || 0) + 1
      }));

      const shareCount = $(".share-count", postElement);

      if (shareCount) {
        const post = getStoredPosts().find(item => item.id === postId);
        if (post) shareCount.textContent = String(post.shares);
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        showToast("تعذرت مشاركة المنشور.");
      }
    }
  }

  /* =========================
     POST MENU
     ========================= */

  function postMenu(postElement) {
    const postId = postElement.dataset.postId;
    const isGenerated = postElement.dataset.generated === "true";

    if (!isGenerated) {
      showToast("ده منشور تجريبي للعرض.");
      return;
    }

    const shouldDelete = window.confirm(
      "هل تريد حذف هذا المنشور من جهازك؟"
    );

    if (!shouldDelete) return;

    removeStoredPost(postId);
    savedPostIds = savedPostIds.filter(id => id !== postId);
    writeJSON(SAVED_KEY, savedPostIds);

    postElement.remove();
    applyCurrentFilters();
    showToast("تم حذف المنشور من جهازك.");
  }

  /* =========================
     SEARCH & FILTERS
     ========================= */

  function applyCurrentFilters() {
    if (!postsList) return;

    const posts = $$(".post", postsList);
    let visibleCount = 0;

    posts.forEach(post => {
      const text = post.textContent.toLocaleLowerCase("ar");
      const matchesSearch = !activeSearch ||
        text.includes(activeSearch.toLocaleLowerCase("ar"));

      const matchesPage =
        currentPage !== "saved" ||
        savedPostIds.includes(post.dataset.postId);

      const visible = matchesSearch && matchesPage;

      post.hidden = !visible;

      if (visible) visibleCount++;
    });

    if (emptyMessage) {
      emptyMessage.hidden = visibleCount !== 0;
    }

    const feedTitle = $("#feedTitle");

    if (feedTitle) {
      const titles = {
        home: "أحدث المنشورات",
        friends: "منشورات الأصدقاء",
        explore: "استكشف المنشورات",
        reels: "الريلز",
        saved: "المنشورات المحفوظة"
      };

      feedTitle.textContent = titles[currentPage] || "أحدث المنشورات";
    }
  }

  function runSearch() {
    activeSearch = searchInput?.value.trim() || "";
    closeModal(searchModal);
    currentPage = "home";
    updateNavigation();
    applyCurrentFilters();

    showToast(
      activeSearch
        ? `نتائج البحث عن: ${activeSearch}`
        : "تم عرض جميع المنشورات."
    );
  }

  function sortPosts() {
    newestFirst = !newestFirst;

    const posts = $$(".post", postsList);

    posts.sort((a, b) => {
      const timeA = Number(a.dataset.createdAt) || 0;
      const timeB = Number(b.dataset.createdAt) || 0;

      return newestFirst ? timeB - timeA : timeA - timeB;
    });

    posts.forEach(post => postsList.appendChild(post));

    const button = $("#sortButton");

    if (button) {
      button.textContent = newestFirst ? "الأحدث ▾" : "الأقدم ▾";
    }

    showToast(newestFirst ? "عرض الأحدث أولًا." : "عرض الأقدم أولًا.");
  }

  /* =========================
     NAVIGATION
     ========================= */

  function updateNavigation() {
    $$("[data-page]").forEach(button => {
      const isActive = button.dataset.page === currentPage;

      button.classList.toggle("active", isActive);

      if (isActive) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }

  function navigateTo(page) {
    const allowedPages = ["home", "friends", "explore", "reels", "saved"];

    if (!allowedPages.includes(page)) return;

    currentPage = page;
    activeSearch = "";

    if (searchInput) searchInput.value = "";

    updateNavigation();
    applyCurrentFilters();

    if (page === "friends") {
      showToast("قسم الأصدقاء يحتاج إلى نظام حسابات واتصال بالخادم.");
    } else if (page === "reels") {
      showToast("قسم الريلز يحتاج إلى تجهيز نظام الفيديوهات.");
    }

    const target = page === "home" ? $("#feedSection") : $("#feedSection");

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  }

  /* =========================
     STORIES & PLACEHOLDER ACTIONS
     ========================= */

  function handleStoryAction(action, button) {
    switch (action) {
      case "add-story":
        showToast("إضافة القصص ستتوفر بعد تجهيز رفع القصص.");
        break;

      case "all-stories":
        showToast("عرض القصص يحتاج إلى خدمة قصص متصلة بالخادم.");
        break;

      case "story":
        showToast(`قصة ${button.dataset.name || ""} تجريبية حاليًا.`);
        break;
    }
  }

  function handleGeneralAction(action) {
    switch (action) {
      case "open-composer":
        openComposer();
        break;

      case "search":
        openModal(searchModal);
        break;

      case "run-search":
        runSearch();
        break;

      case "messages":
        showToast("الرسائل تحتاج إلى حسابات وقاعدة بيانات.");
        break;

      case "notifications":
        showToast("الإشعارات ستتوفر بعد ربط الموقع بالخادم.");
        break;

      case "profile":
        showToast("صفحة الحساب الشخصي تحتاج إلى نظام تسجيل دخول.");
        break;

      case "photo":
        if (photoInput) photoInput.click();
        break;

      case "video":
        if (videoInput) videoInput.click();
        break;

      case "location":
        showToast("إضافة الموقع ستتوفر في تحديث لاحق.");
        break;

      case "music":
        showToast("إضافة الموسيقى ستتوفر في تحديث لاحق.");
        break;

      case "sort":
        sortPosts();
        break;

      case "close-modal":
        closeModal(document.querySelector(".modal.is-open"));
        break;

      default:
        break;
    }
  }

  /* =========================
     EVENT DELEGATION
     ========================= */

  document.addEventListener("click", event => {
    const pageButton = event.target.closest("[data-page]");

    if (pageButton) {
      navigateTo(pageButton.dataset.page);
      return;
    }

    const actionButton = event.target.closest("[data-action]");

    if (!actionButton) {
      if (event.target.classList.contains("modal")) {
        closeModal(event.target);
      }
      return;
    }

    const action = actionButton.dataset.action;
    const postElement = actionButton.closest(".post");

    if (postElement) {
      switch (action) {
        case "like":
          toggleLike(postElement);
          return;

        case "comment":
          toggleComments(postElement);
          return;

        case "share":
          sharePost(postElement);
          return;

        case "save":
          toggleSave(postElement);
          return;

        case "post-menu":
          postMenu(postElement);
          return;

        default:
          break;
      }
    }

    if (["add-story", "all-stories", "story"].includes(action)) {
      handleStoryAction(action, actionButton);
      return;
    }

    handleGeneralAction(action);
  });

  /* =========================
     FORM EVENTS
     ========================= */

  if (postForm) {
    postForm.addEventListener("submit", publishPost);
  }

  if (commentForm) {
    commentForm.addEventListener("submit", submitModalComment);
  }

  document.addEventListener("submit", event => {
    if (event.target.matches(".comment-form")) {
      submitInlineComment(event);
    }
  });

  if (photoInput) {
    photoInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      handleMediaSelection(file, "image");
    });
  }

  if (videoInput) {
    videoInput.addEventListener("change", event => {
      const file = event.target.files?.[0];
      handleMediaSelection(file, "video");
    });
  }

  if (searchInput) {
    searchInput.addEventListener("keydown", event => {
      if (event.key === "Enter") {
        event.preventDefault();
        runSearch();
      }
    });
  }

  document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
      closeAllModals();
    }
  });

  /* =========================
     INITIALIZATION
     ========================= */

  function initialize() {
    if (!postsList) {
      console.error("EgyBook: #postsList was not found.");
      return;
    }

    renderStoredPosts();
    updateNavigation();
    applyCurrentFilters();

    console.info("EgyBook initialized successfully.");
  }

  initialize();

})();
