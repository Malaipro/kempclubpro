// PM2 ecosystem config для kemp-telegram-server
// Секреты НЕ хранятся здесь — они берутся из .env файла на сервере.
// PM2 подхватывает .env автоматически если dotenv вызывается в src/config.ts.

module.exports = {
  apps: [
    {
      name: 'kemp-telegram-server',
      script: 'dist/index.js',
      cwd: '/var/www/kempclubpro/telegram-server',

      instances: 1,
      exec_mode: 'fork',

      // Автоперезапуск при падении
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',

      // Логи
      out_file: '/var/log/pm2/kemp-telegram-server.out.log',
      error_file: '/var/log/pm2/kemp-telegram-server.error.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,

      env: {
        NODE_ENV: 'production',
        // Остальные переменные задаются в .env на сервере, не здесь.
        // См. .env.example для полного списка.
      },
    },
  ],
};
