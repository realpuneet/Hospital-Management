module.exports = {
  apps: [
    { name: 'carepulse-api', script: 'src/server.js', instances: 'max', exec_mode: 'cluster', env: { NODE_ENV: 'production', START_WORKER: 'false' }, max_memory_restart: '600M' },
    { name: 'carepulse-worker', script: 'src/jobs/worker.js', instances: 2, exec_mode: 'fork', env: { NODE_ENV: 'production' } },
  ],
};
