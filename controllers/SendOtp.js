// sendOtp.js
const twilio = require("twilio");

// Twilio credentials
const accountSid = "ACe7de990bc9816868b8548ebc251bb217";
const authToken = "2aed51424e85c6d66f3d633c13eafbd1";
const messagingServiceSid = "MG2028116e6f94e07a866b4b3c05e94074";

const client = twilio(accountSid, authToken);

// In-memory OTP store (for testing, replace with DB for production)
const otpStore = {};

// Generate 6-digit OTP
function generateOtp() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Send OTP to a mobile number
 * @param {string} mobile
 * @returns {Promise<{success: boolean, message: string}>}
 */
async function sendOtp(mobile) {
  if (!mobile) {
    return { success: false, message: "Mobile number is required" };
  }

  const otp = generateOtp();
  otpStore[mobile] = otp; // store OTP (consider expiry in production)

  try {
    await client.messages.create({
      body: `Your OTP is ${otp}`,
      messagingServiceSid,
      to: mobile,
    });

    console.log(`OTP sent to ${mobile}: ${otp}`);
    return { success: true, message: "OTP sent successfully" };
  } catch (error) {
    console.error("Twilio error:", error);
    return { success: false, message: "Failed to send OTP" };
  }
}

/**
 * Verify OTP for a mobile number
 * @param {string} mobile
 * @param {string} otp
 * @returns {{success: boolean, message: string}}
 */
function verifyOtp(mobile, otp) {
  if (otpStore[mobile] && otpStore[mobile] === otp) {
    delete otpStore[mobile]; // single-use OTP
    return { success: true, message: "OTP verified successfully" };
  }
  return { success: false, message: "Invalid OTP" };
}

module.exports = { sendOtp, verifyOtp };
