const securityPlugin = require("eslint-plugin-security");

module.exports = [
  // Bật toàn bộ rule bảo mật khuyên dùng
  securityPlugin.configs.recommended,
  {
    // Cấu hình môi trường cho NodeGoat (Node.js)
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs"
    }
  }
];