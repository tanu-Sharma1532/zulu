const twilio = require("twilio");

// Twilio credentials
const accountSid = "ACe7de990bc9816868b8548ebc251bb217";
const authToken = "2aed51424e85c6d66f3d633c13eafbd1";
const messagingServiceSid = "MG2028116e6f94e07a866b4b3c05e94074";

const client = twilio(accountSid, authToken);

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtp(mobile) {
  if (!mobile) {
    console.error("❌ Mobile number is required");
    return;
  }

  // Ensure +91 (or other country code)
  const formattedMobile = mobile.startsWith("+") ? mobile : `+91${mobile}`;

  const otp = generateOtp();

  try {
    const msg = await client.messages.create({
      body: `Your OTP is ${otp}`,
      messagingServiceSid,
      to: formattedMobile,
    });

    console.log(`✅ OTP sent to ${formattedMobile}: ${otp}`);
    console.log(`Twilio SID: ${msg.sid}`);
  } catch (error) {
    console.error("❌ Twilio error:", error.message);
  }
}

// 👉 Replace with your own number in E.164 format
sendOtp("+918377926576");