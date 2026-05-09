<script setup lang="ts"></script>

<template>
  <footer class="layout-footer">
    <div class="beian-info">
      <img src="/beian-icon.png" alt="公安备案图标" class="beian-icon" />
      <a
        href="https://beian.mps.gov.cn/#/query/webSearch?code=33028202001106"
        target="_blank"
        rel="noreferrer"
        class="beian-link"
        >浙公网安备33028202001106号</a
      >
    </div>
  </footer>
</template>

<style lang="scss" scoped>
.layout-footer {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 0 0 16px;
  font-size: 14px;
}

.beian-info {
  display: flex;
  align-items: center;
  justify-content: center;
}

.beian-icon {
  width: 14px;
  height: 14px;
  margin-right: 4px;
  vertical-align: middle;
}

.beian-link {
  font-size: 14px;
  color: #909399;
  text-decoration: none;

  &:hover {
    color: #909399;
    text-decoration: none;
  }
}
</style>
