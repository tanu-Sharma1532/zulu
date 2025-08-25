const twilio = require("twilio");
const twilio = require("twilio");

// Twilio credentials
const accountSid = "ACe7de990bc9816868b8548ebc251bb217";
const authToken = "2aed51424e85c6d66f3d633c13eafbd1";
const messagingServiceSid = "MG2028116e6f94e07a866b4b3c05e94074";

const client = twilio(accountSid, authToken);

async function createMessage() {
  const message = await client.messages.create({
    body: "My first RCS message. Hello, world!",
    messagingServiceSid: "MG2028116e6f94e07a866b4b3c05e94074",
    to: "+918377926576",
  });

  console.log(message.body);

}

createMessage();