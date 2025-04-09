// 提供浏览器中的全局API
// 这是必要的，因为我们使用了浏览器中的crypto API
if (typeof window === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}

// 其他全局测试设置可以在这里添加 