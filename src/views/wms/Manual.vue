<script setup lang="ts">
import { ref, computed, onMounted, nextTick, watch } from "vue";
// @ts-ignore
import markdownText from "@/assets/茂智云仓操作手册.md?raw";
import SearchLine from "~icons/ri/search-line";
import ArrowUpSLine from "~icons/ri/arrow-up-s-line";
import ArrowDownSLine from "~icons/ri/arrow-down-s-line";
import CloseLine from "~icons/ri/close-line";

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

const activeId = ref("");
const renderedHtml = ref("");
const contentRef = ref<HTMLElement>();
const searchQuery = ref("");
const searchInputRef = ref<HTMLInputElement>();
const currentMatchIndex = ref(0);
const totalMatches = ref(0);
const dropdownVisible = ref(false);
const dropdownIndex = ref(0);

function slugify(text: string): string {
  return text
    .replace(/[^一-龥\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .toLowerCase();
}

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

/* ========= 搜索结果下拉 ========= */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 纯文本（去掉 markdown 语法） */
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

    // 跳过代码块
    if (raw.trim().startsWith("```")) {
      const fence = raw.trim();
      i++;
      while (i < lines.length && lines[i].trim() !== fence) i++;
      continue;
    }

    const hMatch = raw.trim().match(/^(#{1,4})\s+(.+)$/);
    if (hMatch) {
      currentHeadingText = hMatch[2].trim();
      currentHeadingId = slugify(currentHeadingText);
      continue;
    }

    // 跳过空行、分隔线、表格分隔行
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

  // 最多返回 20 条
  return results.slice(0, 20);
});

function highlightSnippet(text: string, query: string): string {
  const escaped = escapeRegex(query);
  return text.replace(
    new RegExp(`(${escaped})`, "gi"),
    '<em class="snippet-highlight">$1</em>'
  );
}

/* ========= markdown 渲染 ========= */
function inlineParse(line: string): string {
  line = line.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  line = line.replace(/`([^`]+)`/g, "<code>$1</code>");
  line = line.replace(/⚠️/g, '<strong style="color:#E6A23C">⚠️</strong>');
  return line;
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
      html.push("<hr>");
      i++;
      continue;
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const depth = headingMatch[1].length;
      const text = headingMatch[2];
      const id = depth >= 2 ? ` id="${slugify(text)}"` : "";
      html.push(`<h${depth}${id}>${inlineParse(text)}</h${depth}>`);
      i++;
      continue;
    }

    if (line.startsWith("> ")) {
      html.push("<blockquote>");
      while (i < len && lines[i].trim().startsWith("> ")) {
        html.push(`<p>${inlineParse(lines[i].trim().slice(2))}</p>`);
        i++;
      }
      html.push("</blockquote>");
      continue;
    }

    if (line.startsWith("|")) {
      html.push('<table class="md-table">');
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
      html.push("</table>");
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
      html.push("<pre><code>");
      i++;
      while (i < len && !lines[i].trim().startsWith("```")) {
        html.push(escapeHtml(lines[i]));
        i++;
      }
      html.push("</code></pre>");
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

const displayHtml = computed(() => {
  return highlightHtml(renderedHtml.value, searchQuery.value);
});

const matchCount = computed(() => {
  if (!searchQuery.value.trim()) return 0;
  const text = markdownText
    .replace(/```[\s\S]*?```/g, "")
    .replace(/`[^`]+`/g, "");
  const m = text.match(new RegExp(escapeRegex(searchQuery.value), "gi"));
  return m ? m.length : 0;
});

watch(displayHtml, () => {
  totalMatches.value = matchCount.value;
  if (totalMatches.value > 0) {
    currentMatchIndex.value = 1;
    dropdownIndex.value = 0;
    nextTick(() => scrollToMatch(1));
  }
});

function scrollToMatch(index: number) {
  nextTick(() => {
    const marks = contentRef.value?.querySelectorAll("mark.search-highlight");
    if (!marks || marks.length === 0) return;
    marks.forEach(m => m.classList.remove("active"));
    const target = marks[index - 1] as HTMLElement;
    if (target) {
      target.classList.add("active");
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  });
}

/* ========= 搜索交互 ========= */
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
  if (searchQuery.value.trim() && searchResults.value.length > 0) {
    dropdownVisible.value = true;
  }
}

function onSearchBlur() {
  // 延迟关闭以允许点击 dropdown
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
    if (dropdownVisible.value && results[dropdownIndex.value]) {
      selectDropdownResult(results[dropdownIndex.value]);
    } else if (e.shiftKey) {
      prevMatch();
    } else {
      nextMatch();
    }
    return;
  }
  if (e.key === "Escape") {
    clearSearch();
    searchInputRef.value?.blur();
  }
}

/* ========= 目录导航 ========= */
function scrollToSection(id: string) {
  activeId.value = id;
  const el = document.getElementById(id);
  if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
}

let observer: IntersectionObserver | null = null;

function setupObserver() {
  if (!contentRef.value) return;
  observer?.disconnect();
  const headings = contentRef.value.querySelectorAll("h2, h3");
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
    { rootMargin: "-10% 0px -70% 0px", threshold: 0.1 }
  );
  headings.forEach(h => observer!.observe(h));
}

onMounted(() => {
  renderedHtml.value = renderMarkdown(markdownText);
  nextTick(setupObserver);
});
</script>

<template>
  <div class="doc-layout">
    <header class="doc-header">
      <div class="doc-header-left">
        <img src="/logo.png" alt="logo" class="doc-logo-img" />
        <span class="doc-logo-text">茂智云仓</span>
        <span class="doc-logo-sep">|</span>
        <span class="doc-subtitle">操作手册</span>
      </div>

      <div class="doc-header-center">
        <!-- 搜索区域 -->
        <div class="search-area">
          <div
            class="search-wrapper"
            :class="{ focused: dropdownVisible || !!searchQuery }"
          >
            <SearchLine class="search-icon" />
            <input
              ref="searchInputRef"
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

          <!-- 搜索结果下拉 -->
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
      </div>

      <div class="doc-header-right">
        <span class="doc-version">v1.0</span>
      </div>
    </header>

    <div class="doc-main">
      <aside class="doc-sidebar">
        <nav class="doc-toc">
          <a
            v-for="item in toc"
            :key="item.id"
            :class="[
              'toc-item',
              `toc-l${item.level}`,
              { active: activeId === item.id }
            ]"
            :title="item.text"
            @click.prevent="scrollToSection(item.id)"
          >
            {{ item.text }}
          </a>
        </nav>
      </aside>

      <main ref="contentRef" class="doc-content">
        <div class="markdown-body" v-html="displayHtml" />
      </main>
    </div>
  </div>
</template>

<style scoped>
.doc-layout {
  --font:
    -apple-system, blinkmacsystemfont, "Segoe UI", "PingFang SC",
    "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", helvetica, arial,
    sans-serif;

  display: flex;
  flex-direction: column;
  height: 100vh;
  font-family: var(--font);
  background: var(--el-bg-color);
}

/* ========= 顶部导航 ========= */
.doc-header {
  position: relative;
  z-index: 100;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: space-between;
  height: 56px;
  padding: 0 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.doc-header-left {
  display: flex;
  flex-shrink: 0;
  align-items: center;
}

.doc-logo-img {
  flex-shrink: 0;
  height: 32px;
}

.doc-logo-text {
  margin-left: 10px;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.15;
  color: #ea5413;
  white-space: nowrap;
}

.doc-logo-sep {
  margin: 0 12px;
  font-size: 18px;
  font-weight: 300;
  color: var(--el-border-color);
}

.doc-subtitle {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  letter-spacing: 1px;
}

.doc-header-center {
  display: flex;
  flex: 1;
  justify-content: center;
  padding: 0 24px;
}

.doc-header-right {
  display: flex;
  flex-shrink: 0;
  gap: 16px;
  align-items: center;
}

.doc-version {
  padding: 2px 8px;
  font-size: 12px;
  color: var(--el-text-color-placeholder);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
}

/* ========= 搜索区域 ========= */
.search-area {
  position: relative;
  width: 380px;
}

.search-wrapper {
  display: flex;
  align-items: center;
  width: 100%;
  height: 34px;
  padding: 0 8px;
  background: var(--el-fill-color-light);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.search-wrapper.focused {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 2px var(--el-color-primary-light-8);
}

.search-icon {
  flex-shrink: 0;
  width: 16px;
  height: 16px;
  color: var(--el-text-color-placeholder);
}

.search-input {
  flex: 1;
  min-width: 0;
  height: 100%;
  padding: 0 8px;
  font-family: var(--font);
  font-size: 13px;
  color: var(--el-text-color-primary);
  outline: none;
  background: transparent;
  border: none;
}

.search-input::placeholder {
  color: var(--el-text-color-placeholder);
}

.search-count {
  flex-shrink: 0;
  margin-right: 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.search-nav-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.search-nav-btn:hover {
  color: var(--el-color-primary);
  background: var(--el-fill-color);
}

.search-nav-btn svg {
  width: 14px;
  height: 14px;
}

.search-clear-btn {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  background: transparent;
  border: none;
  border-radius: 4px;
}

.search-clear-btn:hover {
  color: var(--el-text-color-primary);
  background: var(--el-fill-color);
}

.search-clear-btn svg {
  width: 14px;
  height: 14px;
}

/* ========= 搜索下拉 ========= */
.search-dropdown {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 200;
  display: flex;
  flex-direction: column;
  max-height: 420px;
  overflow: hidden;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 10%);
}

.dropdown-header {
  flex-shrink: 0;
  padding: 10px 14px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
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
  background: var(--el-color-primary-light-9);
}

.dropdown-heading {
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.dropdown-snippet {
  font-size: 13px;
  line-height: 1.6;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.dropdown-snippet :deep(.snippet-highlight) {
  padding: 0 1px;
  font-style: normal;
  font-weight: 600;
  color: var(--el-color-danger);
  background: #fff3cd;
  border-radius: 2px;
}

/* dropdown 过渡动画 */
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

/* ========= 主体 ========= */
.doc-main {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* ========= 左侧目录 ========= */
.doc-sidebar {
  flex-shrink: 0;
  width: 240px;
  padding: 16px 0;
  overflow-y: auto;
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color-lighter);
}

.doc-toc {
  display: flex;
  flex-direction: column;
}

.toc-item {
  padding: 6px 20px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13px;
  line-height: 1.7;
  color: var(--el-text-color-regular);
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
  border-left: 3px solid transparent;
  transition: all 0.15s ease;
}

.toc-item:hover {
  color: var(--el-color-primary);
}

.toc-item.active {
  font-weight: 500;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-left-color: var(--el-color-primary);
}

.toc-l2 {
  font-weight: 600;
}

.toc-l3 {
  padding-left: 36px;
}

/* ========= 内容区 ========= */
.doc-content {
  flex: 1;
  padding: 40px 48px 80px;
  overflow-y: auto;
}

.markdown-body {
  max-width: 800px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.7;
  color: #333;
}

/* ========= 标题层次 ========= */
.markdown-body :deep(h1) {
  padding-bottom: 12px;
  margin: 0 0 20px;
  font-size: 26px;
  font-weight: 700;
  line-height: 1.3;
  color: #1a1a1a;
  border-bottom: 1px solid #e8e8e8;
}

.markdown-body :deep(h2) {
  margin: 40px 0 16px;
  font-size: 24px;
  font-weight: 700;
  line-height: 1.35;
  color: #1a1a1a;
}

.markdown-body :deep(h3) {
  margin: 28px 0 12px;
  font-size: 18px;
  font-weight: 600;
  line-height: 1.4;
  color: #333;
}

.markdown-body :deep(h4) {
  margin: 20px 0 8px;
  font-size: 15px;
  font-weight: 600;
  line-height: 1.45;
  color: #555;
}

/* ========= 段落与列表 ========= */
.markdown-body :deep(p) {
  margin: 0 0 12px;
}

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  padding-left: 20px;
  margin: 0 0 12px;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

/* ========= 表格 ========= */
.markdown-body :deep(.md-table) {
  width: 100%;
  margin: 20px 0;
  overflow: hidden;
  font-size: 13px;
  border-collapse: collapse;
  border: 1px solid #e8e8e8;
  border-radius: 4px;
}

.markdown-body :deep(.md-table th) {
  padding: 10px 16px;
  font-size: 13px;
  font-weight: 600;
  color: #333;
  text-align: left;
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
  border-bottom: 1px solid #eee;
  border-left: none;
}

.markdown-body :deep(.md-table tr:nth-child(even) td) {
  background: #fafafa;
}

.markdown-body :deep(.md-table tr:last-child td) {
  border-bottom: none;
}

.markdown-body :deep(.md-table tr:hover td) {
  background: #f0f2f5;
}

/* ========= 分割线 ========= */
.markdown-body :deep(hr) {
  margin: 32px 0;
  border: none;
  border-top: 1px solid #eee;
}

/* ========= 引用块 ========= */
.markdown-body :deep(blockquote) {
  padding: 12px 16px;
  margin: 16px 0;
  font-size: 13px;
  color: #666;
  background: #f5f7fa;
  border-left: 3px solid #409eff;
  border-radius: 0 4px 4px 0;
}

.markdown-body :deep(blockquote p) {
  margin: 4px 0;
}

/* ========= 行内代码 ========= */
.markdown-body :deep(code) {
  padding: 2px 6px;
  font-family: Consolas, Monaco, "Courier New", monospace;
  font-size: 13px;
  color: #e24b5b;
  background: #f5f5f5;
  border-radius: 3px;
}

/* ========= 代码块 ========= */
.markdown-body :deep(pre) {
  padding: 14px 16px;
  margin: 16px 0;
  overflow-x: auto;
  line-height: 1.6;
  background: #f5f5f5;
  border-left: 3px solid #409eff;
  border-radius: 4px;
}

.markdown-body :deep(pre code) {
  padding: 0;
  color: #333;
  background: none;
}

/* ========= 加粗 ========= */
.markdown-body :deep(strong) {
  font-weight: 600;
  color: #1a1a1a;
}

/* ========= 搜索高亮 ========= */
.markdown-body :deep(mark.search-highlight) {
  padding: 1px 2px;
  color: #856404;
  background: #fff3cd;
  border-radius: 2px;
  transition: background 0.15s;
}

.markdown-body :deep(mark.search-highlight.active) {
  color: #fff;
  background: var(--el-color-warning);
}
</style>
