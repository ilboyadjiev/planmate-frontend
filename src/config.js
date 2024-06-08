const config = {
  // To be overwritten by deployment steps
  baseUrl: process.env.REACT_APP_BACKEND_BASE_URL || 'http://localhost:8080/planmate',
};

export default config;
