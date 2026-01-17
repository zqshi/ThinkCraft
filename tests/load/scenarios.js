export const scenarios = {
  smoke: {
    executor: 'constant-vus',
    vus: 5,
    duration: '1m'
  },
  spike: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 50 },
      { duration: '30s', target: 0 }
    ]
  }
};
