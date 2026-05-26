<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from "vue";
// @ts-ignore
import markdownText from "@/assets/茂智云仓操作手册.md?raw";
import SearchLine from "~icons/ri/search-line";
import ArrowUpSLine from "~icons/ri/arrow-up-s-line";
import ArrowDownSLine from "~icons/ri/arrow-down-s-line";
import CloseLine from "~icons/ri/close-line";
import FileCopyLine from "~icons/ri/file-copy-line";
import TaskLine from "~icons/ri/task-line";
import MenuLine from "~icons/ri/menu-line";
import ArrowUpCircleLine from "~icons/ri/arrow-up-circle-line";
import LinksLine from "~icons/ri/links-line";

defineOptions({ name: "Manual" });

interface TocItem {
  id: string;
  text: string;
  level: number;
}

interface SearchResult {
  headingId: string;
  headingText: string;
  snippet: string;
  globalIndex: number;
}

/* ========= 状态 ========= */
const activeId = ref("");
const rightActiveId = ref("");
const renderedHtml = ref("");
const contentRef = ref<HTMLElement>();
const contentScrollRef = ref<HTMLElement>();
const searchQuery = ref("");
const searchInputRef = ref<HTMLInputElement>();
const headerSearchInputRef = ref<HTMLInputElement>();
const currentMatchIndex = ref(0);
const totalMatches = ref(0);
const dropdownVisible = ref(false);
const dropdownIndex = ref(0);
const scrollProgress = ref(0);
const showBackTop = ref(false);
const tocCollapsed = ref<Record<string, boolean>>({});
const sidebarOpen = ref(false);
const tocSearchQuery = ref("");
const tocVisible = ref(true);

/* ========= 工具函数 ========= */
function slugify(text: string): string {
  return text
    .replace(/[^一-龥\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/* ========= TOC 数据 ========= */
const toc = computed<TocItem[]>(() => {
  const items: TocItem[] = [];
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdownText)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    items.push({ id: slugify(text), text, level });
  }
  return items;
});

/** 按 H2 分组，H3 为子项 */
const tocGroups = computed(() => {
  const groups: { h2: TocItem; children: TocItem[]; index: number }[] = [];
  let current: (typeof groups)[0] | null = null;
  let idx = 0;
  for (const item of toc.value) {
    if (item.level === 2) {
      current = { h2: item, children: [], index: ++idx };
      groups.push(current);
    } else if (current) {
      current.children.push(item);
    }
  }
  return groups;
});

const filteredTocGroups = computed(() => {
  const q = tocSearchQuery.value.trim().toLowerCase();
  if (!q) return tocGroups.value;
  return tocGroups.value
    .map(g => ({
      ...g,
      children: g.children.filter(c => c.text.toLowerCase().includes(q))
    }))
    .filter(g => g.h2.text.toLowerCase().includes(q) || g.children.length > 0);
});

function isGroupCollapsed(groupIndex: number): boolean {
  return tocCollapsed.value[String(groupIndex)] ?? false;
}

function toggleGroup(groupIndex: number) {
  const key = String(groupIndex);
  tocCollapsed.value[key] = !tocCollapsed.value[key];
}

/* ========= 搜索下拉 ========= */
function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,4}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*]\s+/gm, "")
    .replace(/^\d+[.)]\s+/gm, "")
    .replace(/>\s+/g, "")
    .replace(/\|/g, " ")
    .replace(/⚠️/g, "");
}

const searchResults = computed<SearchResult[]>(() => {
  const q = searchQuery.value.trim();
  if (!q) return [];
  const escaped = escapeRegex(q);
  const regex = new RegExp(escaped, "gi");
  const lines = markdownText.split("\n");
  const results: SearchResult[] = [];
  let currentHeadingId = "";
  let currentHeadingText = "";

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    if (raw.trim().startsWith("```")) {
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) i++;
      continue;
    }
    const hMatch = raw.trim().match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      currentHeadingText = hMatch[2].trim();
      currentHeadingId = slugify(currentHeadingText);
      continue;
    }
    const t = raw.trim();
    if (!t || /^-{3,}$/.test(t) || /^\|[-:\s|]+\|$/.test(t)) continue;
    const plain = stripMarkdown(t);
    if (!plain) continue;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(plain)) !== null) {
      const pos = m.index;
      const start = Math.max(0, pos - 20);
      const end = Math.min(plain.length, pos + q.length + 20);
      let snippet = plain.slice(start, end);
      if (start > 0) snippet = "..." + snippet;
      if (end < plain.length) snippet = snippet + "...";
      results.push({
        headingId: currentHeadingId,
        headingText: currentHeadingText || "正文",
        snippet,
        globalIndex: results.length + 1
      });
    }
  }
  return results.slice(0, 20);
});

function highlightSnippet(text: string, query: string): string {
  const escaped = escapeRegex(query);
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<em class="snippet-highlight">$1</em>'
  );
}

/* ========= Markdown 渲染 ========= */
function inlineParse(line: string): string {
  line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  line = line.replace(/`([^`]+)`/g, "<code>$1</code>");
  line = line.replace(/⚠️/g, '<strong style="color:#E6A23C">⚠️</strong>');

  // 小节标签前缀图标
  line = line.replace(
    /<strong>(功能说明|操作步骤|常见错误(?:与解决方法)?|注意事项)<\/strong>/g,
    (_m, label) => {
      const icons: Record<string, string> = {
        功能说明: "📋",
        操作步骤: "📝",
        常见错误: "⚠️",
        常见错误与解决方法: "⚠️",
        注意事项: "💡"
      };
      const icon = icons[label] || "";
      return `<strong><span class="section-label-icon">${icon}</span>${label}</strong>`;
    }
  );
  return line;
}

/** 为标题生成锚点链接 HTML */
function renderHeading(depth: number, text: string, id: string): string {
  const display = inlineParse(text);
  if (depth < 2) return `<h${depth}>${display}</h${depth}>`;
  const anchor = `<a class="heading-anchor" href="#${id}" title="复制链接" data-id="${id}">#</a>`;
  return `<h${depth} id="${id}">${display}${anchor}</h${depth}>`;
}

function renderMarkdown(md: string): string {
  const lines = md.split("\n");
  const html: string[] = [];
  let i = 0;
  const len = lines.length;

  while (i < len) {
    const raw = lines[i];
    const line = raw.trim();

    if (line === "") {
      i++;
      continue;
    }
    if (/^-{3,}$/.test(line)) {
      html.push(
        '<div class="md-hr"><span></span><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2" fill="#ddd"/></svg><span></span></div>'
      );
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2];
      const id = depth >= 2 ? slugify(text) : "";
      html.push(renderHeading(depth, text, id));
      i++;
      continue;
    }

    // 引用块 → callout
    if (line.startsWith("> ")) {
      const calloutType = detectCallout(line);
      const calloutIcons: Record<string, string> = {
        info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#409eff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
        warning:
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e6a23c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        danger:
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#f56c6c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>'
      };
      const icon = calloutIcons[calloutType] || calloutIcons.info;
      html.push(
        `<blockquote class="callout callout-${calloutType}"><span class="callout-icon">${icon}</span><div class="callout-body">`
      );
      while (i < len && lines[i].trim().startsWith("> ")) {
        html.push(`<p>${inlineParse(lines[i].trim().slice(2))}</p>`);
        i++;
      }
      html.push("</div></blockquote>");
      continue;
    }

    if (line.startsWith("|")) {
      html.push('<div class="md-table-wrap"><table class="md-table">');
      let isFirst = true;
      while (i < len && lines[i].trim().startsWith("|")) {
        const cells = lines[i]
          .trim()
          .split("|")
          .filter(c => c !== "");
        if (/^\|[-:\s|]+\|$/.test(lines[i].trim())) {
          i++;
          continue;
        }
        const tag = isFirst ? "th" : "td";
        html.push("<tr>");
        cells.forEach(c =>
          html.push(`<${tag}>${inlineParse(c.trim())}</${tag}>`)
        );
        html.push("</tr>");
        isFirst = false;
        i++;
      }
      html.push("</table></div>");
      continue;
    }

    if (/^[-*]\s+/.test(line)) {
      html.push("<ul>");
      while (i < len && /^[-*]\s+/.test(lines[i].trim())) {
        html.push(
          `<li>${inlineParse(lines[i].trim().replace(/^[-*]\s+/, ""))}</li>`
        );
        i++;
      }
      html.push("</ul>");
      continue;
    }

    if (/^\d+[.)]\s+/.test(line)) {
      html.push("<ol>");
      while (i < len && /^\d+[.)]\s+/.test(lines[i].trim())) {
        html.push(
          `<li>${inlineParse(lines[i].trim().replace(/^\d+[.)]\s+/, ""))}</li>`
        );
        i++;
      }
      html.push("</ol>");
      continue;
    }

    if (line.startsWith("```")) {
      html.push('<div class="code-block"><pre><code>');
      i++;
      while (i < len && !lines[i].trim().startsWith("```")) {
        html.push(escapeHtml(lines[i]));
        i++;
      }
      html.push(
        "</code></pre><button class=\"code-copy-btn\" title=\"复制代码\" onclick=\"(function(btn){var p=btn.parentElement;var c=p.querySelector('code').innerText;navigator.clipboard.writeText(c).then(function(){btn.classList.add('copied');btn.innerHTML='<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;14&quot; height=&quot;14&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><polyline points=&quot;20 6 9 17 4 12&quot;/></svg> 已复制';setTimeout(function(){btn.classList.remove('copied');btn.innerHTML='<svg xmlns=&quot;http://www.w3.org/2000/svg&quot; width=&quot;14&quot; height=&quot;14&quot; viewBox=&quot;0 0 24 24&quot; fill=&quot;none&quot; stroke=&quot;currentColor&quot; stroke-width=&quot;2&quot; stroke-linecap=&quot;round&quot; stroke-linejoin=&quot;round&quot;><rect x=&quot;9&quot; y=&quot;9&quot; width=&quot;13&quot; height=&quot;13&quot; rx=&quot;2&quot; ry=&quot;2&quot;/><path d=&quot;M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1&quot;/></svg> 复制';},1500)})(event.target)\">" +
          '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> 复制' +
          "</button></div>"
      );
      i++;
      continue;
    }

    html.push(`<p>${inlineParse(line)}</p>`);
    i++;
  }
  return html.join("\n");
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function detectCallout(line: string): string {
  if (/\*\*注意/.test(line) || /\*\*警告/.test(line) || /⚠️/.test(line))
    return "warning";
  if (
    /\*\*提示/.test(line) ||
    /\*\*说明/.test(line) ||
    /\*\*功能说明/.test(line)
  )
    return "info";
  if (/\*\*危险/.test(line) || /\*\*禁止/.test(line)) return "danger";
  return "info";
}

/* ========= 内容高亮 ========= */
function highlightHtml(html: string, query: string): string {
  if (!query.trim()) return html;
  const escaped = escapeRegex(query);
  return html.replace(
    /(<pre><code>[\s\S]*?<\/code><\/pre>)|(<code>[^<]*<\/code>)|([^<]+)/g,
    (match, preBlock, inlineCode, text) => {
      if (preBlock || inlineCode) return match;
      return text.replace(
        new RegExp(`(${escaped})`, "gi"),
        '<mark class="search-highlight">$1</mark>'
      );
    }
  );
}

const displayHtml = computed(() =>
  highlightHtml(renderedHtml.value, searchQuery.value)
);

const matchCount = computed(() => {
  if (!searchQuery.value.trim()) return 0;
  const text = markdownText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");
  const m = text.match(new RegExp(escapeRegex(searchQuery.value), "gi"));
  return m ? m.length : 0;
});

/* ========= 滚动与导航 ========= */
function onContentScroll() {
  const el = contentScrollRef.value;
  if (!el) return;
  // 进度条
  const scrollH = el.scrollHeight - el.clientHeight;
  scrollProgress.value =
    scrollH > 0 ? Math.min((el.scrollTop / scrollH) * 100, 100) : 0;
  // 回到顶部按钮
  showBackTop.value = el.scrollTop > 300;
  // 右侧导航高亮
  updateRightNav(el);
}

function updateRightNav(el: HTMLElement) {
  const headings = el.querySelectorAll("h2, h3");
  let current = "";
  for (const h of headings) {
    const rect = (h as HTMLElement).getBoundingClientRect();
    if (rect.top <= 120) {
      current = h.id;
    }
  }
  rightActiveId.value = current;
}

/* ========= 搜索交互 ========= */
function scrollToMatch(index: number) {
  nextTick(() => {
    const marks = contentScrollRef.value?.querySelectorAll(
      "mark.search-highlight"
    );
    if (!marks || marks.length === 0) return;
    marks.forEach(m => m.classList.remove("active"));
    const target = marks[index - 1] as HTMLElement;
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

watch(displayHtml, () => {
  totalMatches.value = matchCount.value;
  if (totalMatches.value > 0) {
    currentMatchIndex.value = 1;
    dropdownIndex.value = 0;
    nextTick(() => scrollToMatch(1));
  }
});

function selectDropdownResult(item: SearchResult) {
  currentMatchIndex.value = item.globalIndex;
  totalMatches.value = matchCount.value;
  dropdownVisible.value = false;
  nextTick(() => scrollToMatch(item.globalIndex));
}

function prevMatch() {
  if (totalMatches.value === 0) return;
  currentMatchIndex.value =
    currentMatchIndex.value <= 1
      ? totalMatches.value
      : currentMatchIndex.value - 1;
  scrollToMatch(currentMatchIndex.value);
}

function nextMatch() {
  if (totalMatches.value === 0) return;
  currentMatchIndex.value =
    currentMatchIndex.value >= totalMatches.value
      ? 1
      : currentMatchIndex.value + 1;
  scrollToMatch(currentMatchIndex.value);
}

function clearSearch() {
  searchQuery.value = "";
  currentMatchIndex.value = 0;
  totalMatches.value = 0;
  dropdownVisible.value = false;
  dropdownIndex.value = 0;
}

function onSearchInput() {
  dropdownIndex.value = 0;
  dropdownVisible.value =
    searchQuery.value.trim().length > 0 && searchResults.value.length > 0;
}

function onSearchFocus() {
  if (searchQuery.value.trim() && searchResults.value.length > 0)
    dropdownVisible.value = true;
}

function onSearchBlur() {
  setTimeout(() => {
    dropdownVisible.value = false;
  }, 200);
}

function handleSearchKeydown(e: KeyboardEvent) {
  const results = searchResults.value;
  if (results.length === 0) return;
  if (e.key === "ArrowDown") {
    e.preventDefault();
    dropdownIndex.value = Math.min(dropdownIndex.value + 1, results.length - 1);
    return;
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    dropdownIndex.value = Math.max(dropdownIndex.value - 1, 0);
    return;
  }
  if (e.key === "Enter") {
    e.preventDefault();
    if (dropdownVisible.value && results[dropdownIndex.value])
      selectDropdownResult(results[dropdownIndex.value]);
    else if (e.shiftKey) prevMatch();
    else nextMatch();
    return;
  }
  if (e.key === "Escape") {
    clearSearch();
    searchInputRef.value?.blur();
    headerSearchInputRef.value?.blur();
  }
}

/* ========= 导航函数 ========= */
function scrollToSection(id: string) {
  activeId.value = id;
  rightActiveId.value = id;
  const el = document.getElementById(id);
  if (el) {
    const top =
      el.getBoundingClientRect().top +
      (contentScrollRef.value?.scrollTop || 0) -
      72;
    contentScrollRef.value?.scrollTo({ top, behavior: "smooth" });
  }
  sidebarOpen.value = false;
}

function scrollToTop() {
  contentScrollRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

function onAnchorClick(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (!target.classList.contains("heading-anchor")) return;
  e.preventDefault();
  const id = target.dataset.id;
  if (!id) return;
  const url = window.location.origin + "/#/manual?section=" + id;
  navigator.clipboard.writeText(url).then(() => {
    target.classList.add("anchor-copied");
    const el = document.getElementById(id);
    if (el) el.classList.add("anchor-flash");
    setTimeout(() => {
      target.classList.remove("anchor-copied");
      if (el) el.classList.remove("anchor-flash");
    }, 1500);
  });
}

/* ========= IntersectionObserver ========= */
let observer: IntersectionObserver | null = null;

function setupObserver() {
  if (!contentScrollRef.value) return;
  observer?.disconnect();
  const headings = contentScrollRef.value.querySelectorAll("h2, h3");
  if (headings.length === 0) return;
  observer = new IntersectionObserver(
    entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          activeId.value = entry.target.id;
          break;
        }
      }
    },
    { rootMargin: "-5% 0px -70% 0px", threshold: 0.1 }
  );
  headings.forEach(h => observer!.observe(h));
}

function handleAnchorDelegation(e: MouseEvent) {
  const target = e.target as HTMLElement;
  if (target.closest(".heading-anchor")) {
    onAnchorClick(e);
  }
}

/* ========= 生命周期 ========= */
onMounted(() => {
  renderedHtml.value = renderMarkdown(markdownText);
  nextTick(() => {
    setupObserver();
    // 展开当前激活的 TOC 分组
    tocGroups.value.forEach((g, i) => {
      tocCollapsed.value[String(i)] = false;
    });
    // 处理 URL 中的 section 参数
    const params = new URLSearchParams(
      window.location.hash.split("?")[1] || ""
    );
    const sectionId = params.get("section");
    if (sectionId) nextTick(() => scrollToSection(sectionId));
  });
});

onUnmounted(() => {
  observer?.disconnect();
});
</script>

<template>
  <div class="doc-layout">
    <!-- ==================== 进度条 ==================== -->
    <div class="progress-bar" :style="{ width: scrollProgress + '%' }" />

    <!-- ==================== 顶部导航 ==================== -->
    <header class="doc-header">
      <div class="doc-header-left">
        <button class="mobile-menu-btn" @click="sidebarOpen = !sidebarOpen">
          <MenuLine />
        </button>
        <img src="/logo.png" alt="logo" class="doc-logo-img" />
        <span class="doc-logo-text">茂智云仓</span>
        <span class="doc-logo-sep">|</span>
        <span class="doc-subtitle">操作手册</span>
      </div>
      <div class="doc-header-right">
        <div class="search-area">
          <div
            class="search-wrapper"
            :class="{ focused: dropdownVisible || !!searchQuery }"
          >
            <SearchLine class="search-icon" />
            <input
              ref="headerSearchInputRef"
              v-model="searchQuery"
              type="text"
              class="search-input"
              placeholder="搜索文档..."
              @input="onSearchInput"
              @focus="onSearchFocus"
              @blur="onSearchBlur"
              @keydown="handleSearchKeydown"
            />
            <template v-if="totalMatches > 0 && !dropdownVisible">
              <span class="search-count"
                >{{ currentMatchIndex }}/{{ totalMatches }}</span
              >
              <button
                class="search-nav-btn"
                title="上一个 (Shift+Enter)"
                @mousedown.prevent
                @click="prevMatch"
              >
                <ArrowUpSLine />
              </button>
              <button
                class="search-nav-btn"
                title="下一个 (Enter)"
                @mousedown.prevent
                @click="nextMatch"
              >
                <ArrowDownSLine />
              </button>
            </template>
            <button
              v-if="searchQuery"
              class="search-clear-btn"
              title="清除"
              @mousedown.prevent
              @click="clearSearch"
            >
              <CloseLine />
            </button>
          </div>
          <Transition name="dropdown">
            <div
              v-if="dropdownVisible && searchResults.length > 0"
              class="search-dropdown"
            >
              <div class="dropdown-header">
                搜索 "{{ searchQuery }}" — 共 {{ searchResults.length }} 条结果
              </div>
              <div class="dropdown-list">
                <div
                  v-for="(item, idx) in searchResults"
                  :key="idx"
                  :class="['dropdown-item', { active: idx === dropdownIndex }]"
                  @mousedown.prevent
                  @click="selectDropdownResult(item)"
                >
                  <div class="dropdown-heading">{{ item.headingText }}</div>
                  <div
                    class="dropdown-snippet"
                    v-html="highlightSnippet(item.snippet, searchQuery)"
                  />
                </div>
              </div>
            </div>
          </Transition>
        </div>
        <span class="doc-version">v1.0</span>
      </div>
    </header>

    <!-- ==================== 主体 ==================== -->
    <div class="doc-main">
      <!-- 移动端遮罩 -->
      <Transition name="overlay-fade">
        <div
          v-if="sidebarOpen"
          class="mobile-overlay"
          @click="sidebarOpen = false"
        />
      </Transition>

      <!-- 左侧 TOC -->
      <aside class="doc-sidebar" :class="{ open: sidebarOpen }">
        <div class="toc-search-box">
          <SearchLine class="toc-search-icon" />
          <input
            v-model="tocSearchQuery"
            type="text"
            class="toc-search-input"
            placeholder="筛选目录..."
          />
          <button
            v-if="tocSearchQuery"
            class="toc-search-clear"
            @click="tocSearchQuery = ''"
          >
            <CloseLine />
          </button>
        </div>
        <nav class="doc-toc">
          <template v-for="group in filteredTocGroups" :key="group.h2.id">
            <div
              :class="['toc-group-h2', { active: activeId === group.h2.id }]"
              @click="scrollToSection(group.h2.id)"
            >
              <span
                class="toc-collapse-arrow"
                :class="{ expanded: !isGroupCollapsed(group.index) }"
                @click.stop="toggleGroup(group.index)"
              >
                <svg
                  width="10"
                  height="10"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M8 5l8 7-8 7z" />
                </svg>
              </span>
              <span class="toc-group-num">{{ group.index }}</span>
              <span class="toc-group-text">{{ group.h2.text }}</span>
            </div>
            <div
              v-if="!isGroupCollapsed(group.index)"
              class="toc-group-children"
            >
              <div
                v-for="child in group.children"
                :key="child.id"
                :class="['toc-group-h3', { active: activeId === child.id }]"
                @click="scrollToSection(child.id)"
              >
                {{ child.text }}
              </div>
            </div>
          </template>
        </nav>
      </aside>

      <!-- 中间内容 -->
      <main
        ref="contentScrollRef"
        class="doc-content"
        @scroll="onContentScroll"
        @click="handleAnchorDelegation"
      >
        <div ref="contentRef" class="markdown-body" v-html="displayHtml" />
      </main>

      <!-- 右侧「本页导航」 -->
      <aside v-if="toc.length > 0" class="doc-right-nav">
        <div class="right-nav-title">本页导航</div>
        <nav class="right-nav-list">
          <a
            v-for="item in toc"
            :key="item.id"
            :class="[
              'right-nav-item',
              `rn-l${item.level}`,
              { active: rightActiveId === item.id }
            ]"
            @click.prevent="scrollToSection(item.id)"
            >{{ item.text }}</a
          >
        </nav>
      </aside>
    </div>

    <!-- 回到顶部 -->
    <Transition name="fab-fade">
      <button
        v-if="showBackTop"
        class="back-top-btn"
        title="回到顶部"
        @click="scrollToTop"
      >
        <ArrowUpCircleLine />
      </button>
    </Transition>
  </div>
</template>

<style scoped>
/* ==================== 基础变量 ==================== */
.doc-layout {
  --font:
    -apple-system, blinkmacsystemfont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", helvetica, arial,
    sans-serif;
  --doc-text: #333;
  --doc-heading: #1a1a1a;
  --doc-border: #e8e8e8;

  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font);
  background: #fff;
}

/* ==================== 进度条 ==================== */
.progress-bar {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 200;
  height: 2px;
  background: var(--el-color-primary, #409eff);
  border-radius: 0 1px 1px 0;
  transition: width 0.15s ease;
}

/* ==================== 顶部导航 ==================== */
.doc-header {
  position: sticky;
  top: 0;
  z-index: 100;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 48px;
  padding: 0 24px;
  background: #fff;
  border-bottom: 1px solid var(--doc-border);
}

.doc-header-left {
  display: flex;
  flex-shrink: 0;
  gap: 0;
  align-items: center;
}

.mobile-menu-btn {
  display: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin-right: 4px;
  font-size: 20px;
  color: #555;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 6px;
}

.mobile-menu-btn:hover {
  background: #f5f5f5;
}

.doc-logo-img {
  flex-shrink: 0;
  height: 28px;
}

.doc-logo-text {
  margin-left: 8px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1.15;
  color: #ea5413;
  white-space: nowrap;
}

.doc-logo-sep {
  margin: 0 10px;
  font-size: 16px;
  font-weight: 300;
  color: #ddd;
}

.doc-subtitle {
  font-size: 13px;
  color: #999;
  letter-spacing: 0.5px;
}

.doc-header-right {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
}

.doc-version {
  padding: 2px 8px;
  font-size: 11px;
  color: #aaa;
  white-space: nowrap;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

/* ==================== 搜索框 ==================== */
.search-area {
  position: relative;
  width: 280px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 8px;
  background: #f9f9f9;
  border: 1px solid var(--doc-border);
  border-radius: 6px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-wrapper.focused {
  background: #fff;
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px rgb(64 158 255 / 10%);
}

.search-icon {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  color: #aaa;
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--doc-text);
  outline: none;
  background: transparent;
  border: none;
}

.search-input::placeholder {
  color: #bbb;
}

.search-count {
  flex-shrink: 0;
  margin-right: 2px;
  font-size: 11px;
  color: #999;
  white-space: nowrap;
}

.search-nav-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #999;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.search-nav-btn:hover {
  color: var(--el-color-primary);
  background: #eee;
}

.search-nav-btn svg {
  width: 13px;
  height: 13px;
}

.search-clear-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  padding: 0;
  color: #999;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.search-clear-btn:hover {
  color: #555;
  background: #eee;
}

.search-clear-btn svg {
  width: 13px;
  height: 13px;
}

/* 搜索下拉 */
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  max-height: 380px;
  overflow: hidden;
  background: #fff;
  border: 1px solid var(--doc-border);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.dropdown-header {
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: 12px;
  color: #999;
  border-bottom: 1px solid #f0f0f0;
}

.dropdown-list {
  flex: 1;
  padding: 4px 0;
  overflow-y: auto;
}

.dropdown-item {
  padding: 10px 14px;
  cursor: pointer;
  transition: background 0.1s;
}

.dropdown-item:hover,
.dropdown-item.active {
  background: #f0f7ff;
}

.dropdown-heading {
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 11px;
  color: #999;
  white-space: nowrap;
}

.dropdown-snippet {
  font-size: 13px;
  line-height: 1.6;
  color: #555;
  word-break: break-all;
}

.dropdown-snippet :deep(.snippet-highlight) {
  padding: 0 1px;
  font-style: normal;
  font-weight: 600;
  color: #e24b5b;
  background: #fff3cd;
  border-radius: 2px;
}

.dropdown-enter-active,
.dropdown-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

/* ==================== 主体布局 ==================== */
.doc-main {
  display: flex;
  flex: 1;
  width: 100%;
  max-width: 1480px;
  margin: 0 auto;
  overflow: hidden;
}

/* ==================== 左侧 TOC ==================== */
.doc-sidebar {
  flex-shrink: 0;
  width: 260px;
  padding: 12px 0 24px;
  overflow-y: auto;
  background: #fff;
  border-right: 1px solid #f0f0f0;
}

.toc-search-box {
  display: flex;
  align-items: center;
  height: 32px;
  padding: 0 10px;
  margin: 0 12px 12px;
  background: #f9f9f9;
  border: 1px solid #e8e8e8;
  border-radius: 6px;
}

.toc-search-icon {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  color: #bbb;
}

.toc-search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  font-family: var(--font);
  font-size: 12px;
  color: #333;
  outline: none;
  background: transparent;
  border: none;
}

.toc-search-input::placeholder {
  color: #bbb;
}

.toc-search-clear {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  padding: 0;
  color: #aaa;
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 3px;
}

.toc-search-clear:hover {
  color: #555;
  background: #eee;
}

.toc-search-clear svg {
  width: 12px;
  height: 12px;
}

.doc-toc {
  display: flex;
  flex-direction: column;
}

.toc-group-h2 {
  display: flex;
  gap: 6px;
  align-items: center;
  padding: 7px 14px;
  margin: 1px 8px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  cursor: pointer;
  border-radius: 6px;
  transition: all 0.15s ease;
}

.toc-group-h2:hover {
  background: #f5f7fa;
}

.toc-group-h2.active {
  color: var(--el-color-primary);
  background: #ecf5ff;
}

.toc-collapse-arrow {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  color: #bbb;
  transition: transform 0.15s ease;
}

.toc-collapse-arrow.expanded {
  color: #666;
  transform: rotate(90deg);
}

.toc-group-num {
  display: inline-flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  font-size: 11px;
  font-weight: 700;
  color: var(--el-color-primary);
  background: #ecf5ff;
  border-radius: 50%;
}

.toc-group-h2.active .toc-group-num {
  color: #fff;
  background: var(--el-color-primary);
}

.toc-group-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toc-group-children {
  padding: 0;
}

.toc-group-h3 {
  padding: 5px 14px 5px 60px;
  margin: 1px 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.5;
  color: #666;
  white-space: nowrap;
  cursor: pointer;
  border-radius: 5px;
  transition: all 0.15s ease;
}

.toc-group-h3:hover {
  color: var(--el-color-primary);
  background: #f9fbfd;
}

.toc-group-h3.active {
  padding-left: 57px;
  color: var(--el-color-primary);
  background: #ecf5ff;
  border-left: 3px solid var(--el-color-primary);
}

/* 移动端遮罩 */
.mobile-overlay {
  position: fixed;
  inset: 0;
  z-index: 150;
  display: none;
  background: rgb(0 0 0 / 30%);
}

.overlay-fade-enter-active,
.overlay-fade-leave-active {
  transition: opacity 0.2s ease;
}

.overlay-fade-enter-from,
.overlay-fade-leave-to {
  opacity: 0;
}

/* ==================== 内容区 ==================== */
.doc-content {
  flex: 1;
  padding: 40px 48px 80px;
  overflow: hidden auto;
  scroll-behavior: smooth;
}

.markdown-body {
  max-width: 720px;
  margin: 0 auto;
  font-size: 15px;
  line-height: 1.78;
  color: #333;
}

/* 标题层级 */
.markdown-body :deep(h1) {
  padding-bottom: 14px;
  margin: 0 0 24px;
  font-size: 30px;
  font-weight: 800;
  line-height: 1.3;
  color: #111;
  border-bottom: 2px solid #eee;
}

.markdown-body :deep(h2) {
  position: relative;
  margin: 48px 0 16px;
  font-size: 25px;
  font-weight: 700;
  line-height: 1.35;
  color: #1a1a1a;
}

.markdown-body :deep(h3) {
  position: relative;
  margin: 32px 0 10px;
  font-size: 19px;
  font-weight: 600;
  line-height: 1.4;
  color: #2c2c2c;
}

.markdown-body :deep(h4) {
  position: relative;
  margin: 24px 0 8px;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.45;
  color: #444;
}

/* 标题锚点 */
.markdown-body :deep(.heading-anchor) {
  display: inline-block;
  margin-left: 8px;
  font-size: 18px;
  font-weight: 400;
  line-height: 1;
  vertical-align: middle;
  color: transparent;
  text-decoration: none;
  transition: color 0.15s;
}

.markdown-body :deep(h2):hover .heading-anchor,
.markdown-body :deep(h3):hover .heading-anchor,
.markdown-body :deep(h4):hover .heading-anchor {
  color: #ccc;
}

.markdown-body :deep(.heading-anchor:hover) {
  color: var(--el-color-primary) !important;
}

.markdown-body :deep(.heading-anchor.anchor-copied) {
  color: #67c23a !important;
}

.markdown-body :deep(.anchor-flash) {
  animation: anchor-flash 1.5s ease;
}

@keyframes anchor-flash {
  0% {
    background: transparent;
  }

  30% {
    background: #fffde7;
  }

  100% {
    background: transparent;
  }
}

/* 段落与列表 */
.markdown-body :deep(p) {
  margin: 0 0 14px;
}

.markdown-body :deep(.section-label-icon) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-right: 6px;
  font-size: 12px;
  vertical-align: -2px;
}

/* 无序列表 */
.markdown-body :deep(ul) {
  padding-left: 22px;
  margin: 0 0 14px;
}

.markdown-body :deep(li) {
  margin: 5px 0;
}

/* 有序列表 → 步骤圆圈 */
.markdown-body :deep(ol) {
  padding-left: 0;
  margin: 0 0 14px;
  list-style: none;
  counter-reset: step-counter;
}

.markdown-body :deep(ol li) {
  position: relative;
  padding-left: 36px;
  margin: 8px 0;
  line-height: 1.7;
  counter-increment: step-counter;
}

.markdown-body :deep(ol li::before) {
  position: absolute;
  top: 1px;
  left: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 700;
  color: var(--el-color-primary);
  content: counter(step-counter);
  background: #ecf5ff;
  border: 1.5px solid #d9ecff;
  border-radius: 50%;
}

/* 分割线：居中圆点 + 横线 */
.markdown-body :deep(.md-hr) {
  display: flex;
  gap: 0;
  align-items: center;
  margin: 40px 0;
  border: none;
}

.markdown-body :deep(.md-hr span) {
  flex: 1;
  height: 1px;
  background: #eee;
}

.markdown-body :deep(.md-hr svg) {
  flex-shrink: 0;
  margin: 0 12px;
}

/* Callout 引用块 */
.markdown-body :deep(.callout) {
  display: flex;
  gap: 14px;
  padding: 14px 18px;
  margin: 20px 0;
  font-size: 14px;
  line-height: 1.7;
  border-left: none;
  border-radius: 6px;
}

.markdown-body :deep(.callout-icon) {
  display: flex;
  flex-shrink: 0;
  align-items: flex-start;
  padding-top: 2px;
}

.markdown-body :deep(.callout-body) {
  flex: 1;
  min-width: 0;
}

.markdown-body :deep(.callout-body p) {
  margin: 4px 0;
  color: inherit;
}

.markdown-body :deep(.callout-info) {
  background: #f0f9ff;
  box-shadow: inset 3px 0 0 0 #409eff;
}

.markdown-body :deep(.callout-warning) {
  background: #fdf6ec;
  box-shadow: inset 3px 0 0 0 #e6a23c;
}

.markdown-body :deep(.callout-danger) {
  background: #fef0f0;
  box-shadow: inset 3px 0 0 0 #f56c6c;
}

/* 表格 */
.md-table-wrap {
  margin: 20px 0;
  overflow-x: auto;
}

.markdown-body :deep(.md-table) {
  width: 100%;
  overflow: hidden;
  font-size: 13px;
  border-collapse: collapse;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.markdown-body :deep(.md-table th) {
  position: sticky;
  top: 0;
  z-index: 1;
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-align: left;
  white-space: nowrap;
  background: #f5f7fa;
  border-right: none;
  border-bottom: 1px solid #e8e8e8;
  border-left: none;
}

.markdown-body :deep(.md-table td) {
  padding: 10px 16px;
  font-size: 13px;
  text-align: left;
  border-right: none;
  border-bottom: 1px solid #f0f0f0;
  border-left: none;
}

.markdown-body :deep(.md-table tr:nth-child(even) td) {
  background: #f9fafb;
}

.markdown-body :deep(.md-table tr:hover td) {
  background: #f0f4f8;
}

.markdown-body :deep(.md-table tr:last-child td) {
  border-bottom: none;
}

/* 行内代码 */
.markdown-body :deep(code) {
  padding: 2px 6px;
  font-family: "SF Mono", Consolas, Monaco, "Courier New", monospace;
  font-size: 13px;
  color: #e24b5b;
  background: #f5f5f5;
  border-radius: 3px;
}

/* 代码块 */
:deep(.code-block) {
  position: relative;
  margin: 20px 0;
}

.markdown-body :deep(pre) {
  padding: 14px 16px;
  margin: 0;
  overflow-x: auto;
  line-height: 1.6;
  background: #f8f8fa;
  border-left: 3px solid #409eff;
  border-radius: 4px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  color: #333;
  background: none;
}

:deep(.code-copy-btn) {
  position: absolute;
  top: 8px;
  right: 8px;
  display: flex;
  gap: 4px;
  align-items: center;
  padding: 4px 10px;
  font-family: var(--font);
  font-size: 12px;
  color: #666;
  cursor: pointer;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 4px;
  transition: all 0.15s;
}

:deep(.code-copy-btn):hover {
  background: #f0f0f0;
  border-color: #ccc;
}

:deep(.code-copy-btn.copied) {
  color: #67c23a;
  border-color: #67c23a;
}

/* 加粗 */
.markdown-body :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

/* 搜索高亮 */
.markdown-body :deep(mark.search-highlight) {
  padding: 1px 3px;
  color: #856404;
  background: #fff3cd;
  border-radius: 2px;
  transition: background 0.15s;
}

.markdown-body :deep(mark.search-highlight.active) {
  color: #fff;
  background: #e6a23c;
}

/* ==================== 右侧导航 ==================== */
.doc-right-nav {
  position: sticky;
  top: 48px;
  flex-shrink: 0;
  align-self: flex-start;
  width: 180px;
  max-height: calc(100vh - 48px);
  padding: 24px 0;
  overflow-y: auto;
}

.right-nav-title {
  padding: 0 16px 8px;
  font-size: 11px;
  font-weight: 600;
  color: #bbb;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.right-nav-list {
  display: flex;
  flex-direction: column;
  margin-left: 16px;
  border-left: 1px solid #f0f0f0;
}

.right-nav-item {
  padding: 3px 14px;
  margin-left: -1px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  line-height: 1.6;
  color: #999;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  border-left: 1px solid transparent;
  transition: all 0.15s ease;
}

.right-nav-item:hover {
  color: #555;
}

.right-nav-item.active {
  color: var(--el-color-primary);
  border-left-color: var(--el-color-primary);
}

.rn-l3 {
  padding-left: 28px;
  font-size: 11px;
}

/* ==================== 回到顶部 ==================== */
.back-top-btn {
  position: fixed;
  right: 32px;
  bottom: 40px;
  z-index: 50;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  font-size: 22px;
  color: #666;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 50%;
  box-shadow: 0 2px 8px rgb(0 0 0 / 8%);
  transition: all 0.2s ease;
}

.back-top-btn:hover {
  color: var(--el-color-primary);
  border-color: var(--el-color-primary);
  box-shadow: 0 4px 14px rgb(0 0 0 / 12%);
  transform: translateY(-2px);
}

.fab-fade-enter-active,
.fab-fade-leave-active {
  transition:
    opacity 0.25s ease,
    transform 0.25s ease;
}

.fab-fade-enter-from,
.fab-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}

/* ==================== 响应式 ==================== */

/* 隐藏右侧导航 */
@media (width <= 1280px) {
  .doc-right-nav {
    display: none;
  }
}

/* 平板: 缩小 TOC */
@media (width <= 1024px) {
  .doc-sidebar {
    width: 240px;
  }

  .doc-content {
    padding: 32px 32px 64px;
  }

  .search-area {
    width: 240px;
  }
}

/* 小屏: 收起 TOC 到抽屉 */
@media (width <= 768px) {
  .mobile-menu-btn {
    display: flex;
  }

  .doc-header {
    padding: 0 16px;
  }

  .doc-logo-text {
    font-size: 18px;
  }

  .doc-logo-img {
    height: 24px;
  }

  .doc-logo-sep {
    margin: 0 6px;
    font-size: 14px;
  }

  .doc-subtitle {
    font-size: 12px;
  }

  .doc-version {
    display: none;
  }

  .search-area {
    width: 180px;
  }

  .toc-search-box {
    margin: 48px 12px 12px;
  }

  .doc-sidebar {
    position: fixed;
    top: 0;
    bottom: 0;
    left: 0;
    z-index: 180;
    width: 280px;
    box-shadow: none;
    transform: translateX(-100%);
    transition: transform 0.25s ease;
  }

  .doc-sidebar.open {
    box-shadow: 4px 0 20px rgb(0 0 0 / 10%);
    transform: translateX(0);
  }

  .mobile-overlay {
    display: block;
  }

  .doc-content {
    padding: 24px 16px 48px;
  }

  .markdown-body {
    max-width: 100%;
  }

  .markdown-body :deep(h1) {
    font-size: 24px;
  }

  .markdown-body :deep(h2) {
    margin-top: 36px;
    font-size: 21px;
  }

  .markdown-body :deep(h3) {
    margin-top: 24px;
    font-size: 17px;
  }

  .back-top-btn {
    right: 16px;
    bottom: 24px;
  }
}
</style>
