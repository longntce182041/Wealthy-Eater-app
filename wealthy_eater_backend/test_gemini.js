require('dotenv').config();

async function test() {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) {
    console.error("No key");
    return;
  }
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (e) {
    console.error(e);
  }
}
test();
