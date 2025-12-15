
const SMS_API_KEY = "anbu_sms_mgq589nm_9mgblyt069h";
const SMS_API_URL = "https://sms.anbuinfosec.dev/api/v1/sms/send";

export const sendSmsOtp = async (phoneNumber: string, otp: string): Promise<boolean> => {
  try {
    const payload = {
      apiKey: SMS_API_KEY,
      recipient: phoneNumber,
      message: `Your NetStrike Verification Code is: ${otp}`
    };

    const response = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log("SMS API Response:", data);
    
    // Assuming API returns success or the status code is 200/201
    return response.ok;
  } catch (error) {
    console.error("Failed to send SMS:", error);
    // In a real app we might return false, but for testing we might want to fail gracefully
    // depending on CORS policies of the API.
    return false;
  }
};

export const generateOtp = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};
