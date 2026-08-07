const config = {
  // To be overwritten by deployment steps http://localhost:8080
  baseUrl: process.env.REACT_APP_BACKEND_BASE_URL || 'https://planmate.org',
  googleClientId: process.env.REACT_APP_GOOGLE_CLIENT_ID,

};

export default config;
