const { request } = require("https");

const authUrl = process.env.AUTH_URL;

export function getProfile(cookie) {
  return new Promise((resolve, reject) => {
    const r = request(authUrl, { headers: { cookie } });

    r.on("error", reject);
    r.on("response", async (res) => {
      if (res.statusCode !== 200) {
        return reject();
      }

      const profile = JSON.parse(await readBody(res));
      resolve(profile);
    });
    r.end();
  });
}
