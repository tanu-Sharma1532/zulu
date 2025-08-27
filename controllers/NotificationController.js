const fs = require("fs");
const path = require("path");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const pool = require("../config/db");

const FIREBASE_URL = "https://fcm.googleapis.com/v1/projects/zulu-consumer/messages:send";
const SA_PATH = path.join(__dirname, "../data/zulu-consumer-96dc5c2efd96.json");


function ok(payload)   { return { error: false, ...payload }; }
function fail(message, extra = {}) { return { error: true, message, ...extra }; }
function toCSV(obj) { return JSON.stringify(obj); } 

function logApiResponse(tag, accessToken, request, response) {
  console.log(`[${tag}] ATK=${String(accessToken).slice(0,25)}...`);
  console.log("Request:", typeof request === "string" ? request : JSON.stringify(request));
  console.log("Response:", typeof response === "string" ? response : JSON.stringify(response));
}

function buildMessagePayload({ token, title, body, imageUrl, payload }) {
  const msg = {
    message: {
      token,
      notification: { title, body },
      data: {
        notification_payload: JSON.stringify(payload),
      },
      android: {
        priority: "high",
        notification: {
          click_action: "FLUTTER_NOTIFICATION_CLICK",
          body,
        },
      },
      apns: {
        headers: {
          "apns-topic": "com.zulu.consumer.zuluconsumer",
          "apns-push-type": "alert",
          "apns-priority": "10",
        },
        payload: {
          aps: {
            category: "NEW_NOTIFICATION",
            sound: "default",
            "content-available": 1,
            alert: { title, body },
          },
        },
      },
    },
  };

  if (imageUrl) {
    msg.message.notification.image = imageUrl;
    msg.message.data.image = String(imageUrl);
    msg.message.android.notification.image = imageUrl;
    msg.message.apns.payload.fcm_options = { image: imageUrl };
  }

  return msg;
}

async function getAccessToken() {
  if (!fs.existsSync(SA_PATH)) {
    return "Error: Service account file missing!";
  }
  const svc = JSON.parse(fs.readFileSync(SA_PATH, "utf8"));
  const now = Math.floor(Date.now() / 1000);
  const iat = now;
  const exp = now + 3600;

  const claims = {
    iss: svc.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: svc.token_uri,
    iat,
    exp,
  };

  // Sign a JWT (RS256) and exchange for OAuth token
  const signed = jwt.sign(claims, svc.private_key, { algorithm: "RS256", header: { alg: "RS256", typ: "JWT" } });

  try {
    const resp = await axios.post(
      svc.token_uri,
      new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: signed,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );
    const accessToken = resp.data?.access_token;
    logApiResponse("access token", "Bearer ****", JSON.stringify({ iat, exp }), resp.data);
    return accessToken ? `Bearer ${accessToken}` : "Error: Could not get access token!";
  } catch (err) {
    return `Error: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`;
  }
}

// === DB helpers ===
async function getUserToken(user_id) {
  const [rows] = await pool.query("SELECT token FROM firebase_tokens WHERE user_id = ?", [user_id]);
  return rows?.[0]?.token || null;
}

async function insertAppNotification({ table = "app_notifications", user_id = null, is_admin = 0, notification_type = "", title, body, payload }) {
  const row = {
    user_id,
    is_admin,
    notification_type,
    title,
    body,
    payload: JSON.stringify(payload),
  };
  const [res] = await pool.query(`INSERT INTO ${table} SET ?`, [row]);
  return res.insertId;
}

// ====== ADMIN USERS TABLE (instead of hard-coding) ======
// Schema suggestion: admin_users(id PK auto, user_id BIGINT UNIQUE, created_at DATETIME DEFAULT CURRENT_TIMESTAMP)
async function listAdminUserIds() {
  const [rows] = await pool.query("SELECT user_id FROM admin_users ORDER BY created_at DESC");
  return rows.map(r => r.user_id);
}
async function addAdminUserId(user_id) {
  await pool.query("INSERT IGNORE INTO admin_users (user_id) VALUES (?)", [user_id]);
}
async function removeAdminUserId(user_id) {
  await pool.query("DELETE FROM admin_users WHERE user_id = ?", [user_id]);
}

// === HTTP to FCM ===
async function postToFcm(accessToken, messagePayload) {
  const headers = {
    Authorization: accessToken,
    "Content-Type": "application/json",
  };
  const resp = await axios.post(FIREBASE_URL, messagePayload, { headers, validateStatus: () => true });
  return { http_code: resp.status, data: resp.data };
}

/* -------------------------------------------------------------------------- */
/*                              Controller Methods                             */
/* -------------------------------------------------------------------------- */

// POST /notifications/send
async function sendPushNotification(req, res) {
  try {
    const { user_id, title, body, image, payload } = req.body || {};
    if (!user_id || !title || !body || payload === undefined) {
      return res.json(fail("User ID, Title, Body, and Payload are required"));
    }

    const notification_type = payload?.notification_type ?? "";
    const token = await getUserToken(user_id);
    if (!token) return res.json(fail("No FCM token found for user"));

    const notification_id = await insertAppNotification({
      user_id,
      notification_type,
      title,
      body,
      payload,
    });

    const messagePayload = buildMessagePayload({
      token,
      title,
      body,
      imageUrl: image,
      payload,
    });
    messagePayload.message.data.notification_id = String(notification_id);

    const accessToken = await getAccessToken();
    if (String(accessToken).startsWith("Error")) {
      return res.json(fail(accessToken));
    }

    const { http_code, data } = await postToFcm(accessToken, messagePayload);
    logApiResponse("Notification response", accessToken, messagePayload, data);

    if (http_code === 200) return res.json(ok({ message: "Notification sent", response: data }));
    return res.json(fail("Failed to send notification", { http_code, response: data }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function sendPushNotificationToAdmins(req, res) {
  try {
    const { title, body, image, payload } = req.body || {};
    if (!title || !body || payload === undefined) {
      return res.json(fail("Title, Body, and Payload are required"));
    }

    const notification_type = payload?.notification_type ?? "";

    await pool.query(
      "INSERT INTO admin_app_notifications (notification_type, title, body, payload) VALUES (?, ?, ?, ?)",
      [notification_type, title, body, JSON.stringify(payload)]
    );

    const admin_user_ids = await listAdminUserIds();
    const accessToken = await getAccessToken();
    if (String(accessToken).startsWith("Error")) {
      return res.json(fail(accessToken));
    }

    const results = [];
    for (const user_id of admin_user_ids) {
      const token = await getUserToken(user_id);
      if (!token) {
        results.push({ user_id, error: "No FCM token found" });
        continue;
      }

      const notification_id = await insertAppNotification({
        is_admin: 1,
        user_id,
        notification_type,
        title,
        body,
        payload,
      });

      const messagePayload = buildMessagePayload({
        token,
        title,
        body,
        imageUrl: image,
        payload,
      });
      messagePayload.message.data.notification_id = String(notification_id);

      const { http_code, data } = await postToFcm(accessToken, messagePayload);
      logApiResponse("Admin Notification response", accessToken, messagePayload, data);

      results.push(
        http_code === 200
          ? { user_id, response: data }
          : { user_id, error: "Failed to send notification", http_code, response: data }
      );
    }

    return res.json(ok({ message: "Notifications sent", results }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function getUserFCMToken(req, res) {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.json(fail("User ID is required"));
    const token = await getUserToken(user_id);
    if (!token) return res.json(fail("No FCM token found for user"));
    return res.json(ok({ token }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function updateFirebaseToken(req, res) {
  try {
    const { user_id, token } = req.body || {};
    if (!user_id || !token) return res.json(fail("User ID and Token are required"));

    const [userRows] = await pool.query("SELECT id FROM users WHERE id = ?", [user_id]);
    if (!userRows.length) return res.json(fail("User does not exist"));

    const [existingByToken] = await pool.query("SELECT user_id FROM firebase_tokens WHERE token = ?", [token]);
    if (existingByToken.length && existingByToken[0].user_id != user_id) {
      await pool.query("DELETE FROM firebase_tokens WHERE token = ?", [token]);
    }

    const [existingByUser] = await pool.query("SELECT token FROM firebase_tokens WHERE user_id = ?", [user_id]);
    if (existingByUser.length) {
      await pool.query(
        "UPDATE firebase_tokens SET token=?, updated_at=NOW() WHERE user_id=?",
        [token, user_id]
      );
      return res.json(ok({ message: "Token updated successfully" }));
    } else {
      await pool.query("INSERT INTO firebase_tokens (user_id, token) VALUES (?, ?)", [user_id, token]);
      return res.json(ok({ message: "Token added successfully" }));
    }
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function updateNotificationStatus(req, res) {
  try {
    const { notification_id, status } = req.body || {};
    if (!notification_id || !status) return res.json(fail("Notification ID and status are required"));

    const updateData = {};
    if (status === "read") updateData.is_read = true;
    else if (status === "clicked" || status === "archive") updateData.is_displayed = true;

    if (Object.keys(updateData).length) {
      await pool.query("UPDATE app_notifications SET ? WHERE id = ?", [updateData, notification_id]);
    }
    return res.json(ok({ message: "Notification updated" }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function getUserNotifications(req, res) {
  try {
    const { user_id } = req.query || {};
    if (!user_id) return res.json(fail("User ID is required"));
    const [rows] = await pool.query(
      `SELECT id, notification_type, title, body, payload, is_read, is_displayed, created_at, updated_at
       FROM app_notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [user_id]
    );
    if (!rows.length) return res.json(ok({ message: "No notifications found", notifications: [] }));
    return res.json(ok({ notifications: rows }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function updateAdminNotificationStatus(req, res) {
  try {
    const { notification_id, status } = req.body || {};
    if (!notification_id || !status) return res.json(fail("Notification ID and status are required"));

    const updateData = {};
    if (status === "read") updateData.is_read = true;
    else if (status === "clicked" || status === "archive") updateData.is_displayed = true;

    if (Object.keys(updateData).length) {
      await pool.query("UPDATE admin_app_notifications SET ? WHERE id = ?", [updateData, notification_id]);
    }
    return res.json(ok({ message: "Admin notification updated" }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function getAdminNotifications(_req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT id, notification_type, title, body, payload, is_read, is_displayed, created_at, updated_at
       FROM admin_app_notifications
       ORDER BY created_at DESC`
    );
    if (!rows.length) return res.json(ok({ message: "No admin notifications found", notifications: [] }));
    return res.json(ok({ notifications: rows }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function sendTestNotification(_req, res) {
  try {
    const hardcodedToken = "token";
    const messagePayload = {
      message: {
        token: hardcodedToken,
        notification: { title: "Breaking News", body: "New news story available." },
        data: { story_id: "story_12345" },
        android: {
          notification: { click_action: "TOP_STORY_ACTIVITY", body: "Check out the Top Story" },
        },
        apns: {
          headers: {
            "apns-topic": "com.zulu.consumer.zuluconsumer",
            "apns-push-type": "alert",
            "apns-priority": "10",
          },
          payload: {
            aps: {
              category: "NEW_NOTIFICATION",
              sound: "default",
              alert: { title: "Your Notification Title", body: "Your Notification Message" },
              badge: 1,
            },
          },
        },
      },
    };

    const accessToken = await getAccessToken();
    if (String(accessToken).startsWith("Error")) return res.json(fail(accessToken));

    const { http_code, data } = await postToFcm(accessToken, messagePayload);
    if (http_code === 200) return res.json(ok({ response: data }));
    return res.json(fail("Failed to send test notification", { http_code, response: data }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function addAdminUser(req, res) {
  try {
    const { user_id } = req.body || {};
    if (!user_id) return res.json(fail("user_id is required"));
    await addAdminUserId(user_id);
    return res.json(ok({ message: "Admin user added" }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function removeAdminUser(req, res) {
  try {
    const { user_id } = req.params || {};
    if (!user_id) return res.json(fail("user_id is required"));
    await removeAdminUserId(user_id);
    return res.json(ok({ message: "Admin user removed" }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

async function listAdminUsers(_req, res) {
  try {
    const ids = await listAdminUserIds();
    return res.json(ok({ admin_user_ids: ids }));
  } catch (err) {
    return res.json(fail(err.message));
  }
}

module.exports = {
  sendPushNotification,
  sendPushNotificationToAdmins,
  getUserFCMToken,
  updateFirebaseToken,
  updateNotificationStatus,
  getUserNotifications,
  updateAdminNotificationStatus,
  getAdminNotifications,
  sendTestNotification,

  addAdminUser,
  removeAdminUser,
  listAdminUsers,
};
