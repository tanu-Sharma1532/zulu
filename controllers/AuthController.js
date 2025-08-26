const db = require("../config/db");
const jwt = require("jsonwebtoken");
const twilio = require("twilio");

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const serviceSid = process.env.TWILIO_SERVICE_SID;

function generateToken(mobile) {
  return jwt.sign({ mobile }, process.env.JWT_SECRET || 'your-secret-key', { expiresIn: '24h' });
}

async function signUpWithMobile(req, res) {
  try {
    const { mobile, type } = req.body;

    if (!mobile || !type) {
      return res.status(400).json({
        error: true,
        message: 'Mobile and type are required'
      });
    }

    const [existingUser] = await db.query(
      'SELECT id, mobile, email FROM users WHERE mobile = ?',
      [mobile]
    );

    if (existingUser.length > 0) {
      const token = generateToken(mobile);

      return res.json({
        error: false,
        token,
        message: 'Mobile number already exists',
        data: existingUser
      });
    }

    const insertData = {
      mobile,
      type,
      password: '$POIyu7778',
      active: 1
    };

    const [insertResult] = await db.query('INSERT INTO users SET ?', insertData);

    const token = generateToken(mobile);

    return res.json({
      error: false,
      token,
      message: 'Registered Successfully',
      data: insertData,
      user_id: insertResult.insertId
    });

  } catch (error) {
    console.error(error);
    return res.status(500).json({
      error: true,
      message: 'Internal Server Error'
    });
  }
}

async function verifyOtpNew(req, res) {
  const { mobile, otp } = req.body;
  const useDummy = true;

  console.log('🔐 OTP Verification Request:', { mobile, otp, useDummy });

  if (!mobile || !otp) {
    console.log('❌ Missing required fields:', { mobile, otp });
    return res.json({ error: true, message: 'Mobile and OTP required' });
  }

  try {
    let otpVerified = false;
    let resultMessage = '';

    if (useDummy && otp === '3297') {
      otpVerified = true;
      resultMessage = 'OTP verified (dummy)';
      console.log('✅ Dummy OTP verified successfully');
    } else {
      console.log('📱 Attempting Twilio verification for:', mobile);
      console.log('🔑 Service SID:', serviceSid);
      console.log('👤 Twilio Client configured:', !!client);
      
      const verificationCheck = await client.verify.v2.services(serviceSid)
        .verificationChecks.create({ to: `+91${mobile}`, code: otp });

      otpVerified = verificationCheck.status === 'approved';
      resultMessage = otpVerified ? 'OTP verified' : 'Verification failed';
      console.log('📱 Twilio verification result:', { status: verificationCheck.status, otpVerified, resultMessage });
    }

    if (otpVerified) {
      console.log('✅ OTP verified, checking user existence for:', mobile);
      const [rows] = await db.query('SELECT id, mobile, email, username FROM users WHERE mobile = ?', [mobile]);

      if (rows.length > 0) {
        console.log('👤 Existing user found:', { userId: rows[0].id, mobile: rows[0].mobile });
        const token = generateToken(mobile);
        return res.json({
          error: false,
          message: 'Mobile already exists',
          token,
          data: rows[0]
        });
      } else {
        console.log('🆕 New user, creating account for:', mobile);
        const data = {
          mobile,
          type: 'phone',
          password: '$POIyu7778',
          active: 1
        };
        const [insertResult] = await db.query('INSERT INTO users SET ?', data);
        const userId = insertResult.insertId;
        const token = generateToken(mobile);

        console.log('✅ New user created successfully:', { userId, mobile });

        return res.json({
          error: false,
          message: 'Registered Successfully',
          token,
          user_id: userId,
          data: { ...data, id: userId }
        });
      }
    } else {
      console.log('❌ OTP verification failed:', resultMessage);
      return res.json({ error: true, message: resultMessage });
    }
  } catch (error) {
    console.error('💥 Error in OTP verification:', error);
    console.error('📱 Mobile:', mobile);
    console.error('🔑 OTP:', otp);
    console.error('🔧 Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      stack: error.stack
    });
    return res.json({ error: true, message: 'Server error' });
  }
}

async function sendOtp(req, res) {
  const { mobile } = req.body;
  console.log('📱 Send OTP Request:', { mobile });
  
  if (!mobile) {
    console.log('❌ Missing mobile number in request');
    return res.json({ error: true, message: 'Mobile required' });
  }

  try {
    console.log('🔧 Twilio Configuration Check:');
    console.log('  - Account SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('  - Auth Token:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  - Service SID:', process.env.TWILIO_SERVICE_SID ? '✅ Set' : '❌ Missing');
    console.log('  - Client initialized:', !!client);
    console.log('  - Service SID variable:', serviceSid);

    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_SERVICE_SID) {
      console.log('❌ Missing Twilio environment variables');
      return res.json({ 
        error: true, 
        message: 'Twilio configuration incomplete',
        details: {
          accountSid: !!process.env.TWILIO_ACCOUNT_SID,
          authToken: !!process.env.TWILIO_AUTH_TOKEN,
          serviceSid: !!process.env.TWILIO_SERVICE_SID
        }
      });
    }

    console.log('📞 Attempting to send OTP to:', `+91${mobile}`);
    console.log('🔑 Using Service SID:', serviceSid);

    const verification = await client.verify.v2.services(serviceSid)
      .verifications.create({ to: `+91${mobile}`, channel: 'sms' });

    console.log('✅ OTP sent successfully:', {
      requestId: verification.sid,
      status: verification.status,
      to: verification.to,
      channel: verification.channel
    });

    return res.json({ 
      error: false, 
      message: 'OTP sent', 
      request_id: verification.sid,
      details: {
        status: verification.status,
        channel: verification.channel,
        to: verification.to
      }
    });

  } catch (error) {
    console.error('💥 Error sending OTP:', error);
    console.error('📱 Mobile number:', mobile);
    console.error('🔧 Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      statusCode: error.statusCode,
      moreInfo: error.moreInfo,
      stack: error.stack
    });

    let errorMessage = 'Failed to send OTP';
    if (error.code === 60200) {
      errorMessage = 'Invalid phone number format';
    } else if (error.code === 60202) {
      errorMessage = 'Phone number not verified';
    } else if (error.code === 60203) {
      errorMessage = 'Maximum verification attempts exceeded';
    } else if (error.code === 60204) {
      errorMessage = 'Verification service not available';
    } else if (error.code === 60205) {
      errorMessage = 'Invalid verification code';
    }

    return res.json({ 
      error: true, 
      message: errorMessage,
      details: {
        code: error.code,
        status: error.status,
        moreInfo: error.moreInfo
      }
    });
  }
}

async function testTwilioConfig(req, res) {
  console.log('🧪 Testing Twilio Configuration...');
  
  try {
    console.log('🔧 Environment Variables:');
    console.log('  - TWILIO_ACCOUNT_SID:', process.env.TWILIO_ACCOUNT_SID ? '✅ Set' : '❌ Missing');
    console.log('  - TWILIO_AUTH_TOKEN:', process.env.TWILIO_AUTH_TOKEN ? '✅ Set' : '❌ Missing');
    console.log('  - TWILIO_SERVICE_SID:', process.env.TWILIO_SERVICE_SID ? '✅ Set' : '❌ Missing');
    
    console.log('🔧 Client Configuration:');
    console.log('  - Client initialized:', !!client);
    console.log('  - Service SID variable:', serviceSid);
    
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_SERVICE_SID) {
      return res.json({
        error: true,
        message: 'Missing Twilio environment variables',
        details: {
          accountSid: !!process.env.TWILIO_ACCOUNT_SID,
          authToken: !!process.env.TWILIO_AUTH_TOKEN,
          serviceSid: !!process.env.TWILIO_SERVICE_SID
        }
      });
    }

    if (!client) {
      return res.json({
        error: true,
        message: 'Twilio client not initialized'
      });
    }

    return res.json({
      error: false,
      message: 'Twilio configuration looks good',
      details: {
        accountSid: process.env.TWILIO_ACCOUNT_SID ? 'Set' : 'Missing',
        authToken: process.env.TWILIO_AUTH_TOKEN ? 'Set' : 'Missing',
        serviceSid: process.env.TWILIO_SERVICE_SID ? 'Set' : 'Missing',
        clientInitialized: !!client
      }
    });

  } catch (error) {
    console.error('💥 Error testing Twilio config:', error);
    return res.json({
      error: true,
      message: 'Error testing configuration',
      details: error.message
    });
  }
}

module.exports = {
  signUpWithMobile,
  verifyOtpNew,
  sendOtp,
  testTwilioConfig
};
