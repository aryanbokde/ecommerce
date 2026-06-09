const url = 'http://localhost:3000/api/auth/sign-in/email';
const data = { email: 'manager1@shop.com', password: 'Password123!' };
const headers = {
  'Content-Type': 'application/json',
  Origin: 'http://localhost:3000',
  Accept: 'application/json',
};

(async () => {
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    console.log('status', res.status);
    console.log('ok', res.ok);
    console.log('headers', JSON.stringify(Object.fromEntries(res.headers.entries()), null, 2));
    console.log('text', await res.text());
  } catch (err) {
    console.error('ERR', err);
    process.exit(1);
  }
})();
