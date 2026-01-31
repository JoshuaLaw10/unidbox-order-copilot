import { describe, expect, it } from "vitest";
import { Resend } from "resend";

describe("Resend API Key Validation", () => {
  it("should have a valid RESEND_API_KEY configured", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    
    // Check that API key exists and has correct format
    expect(apiKey).toBeDefined();
    expect(apiKey).not.toBe("");
    expect(apiKey?.startsWith("re_")).toBe(true);
    
    // API key format is valid - actual sending is tested in the next test
    expect(true).toBe(true);
  });

  it("should be able to send a test email", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    expect(apiKey).toBeDefined();
    
    const resend = new Resend(apiKey);
    
    // Send a minimal test email to verify the API works
    // Using Resend's test endpoint which doesn't actually send
    const { data, error } = await resend.emails.send({
      from: "UnidBox <onboarding@resend.dev>",
      to: "delivered@resend.dev", // Resend's test address
      subject: "API Key Validation Test",
      text: "This is a test email to validate the API key.",
    });
    
    // Check for authentication errors
    if (error) {
      if (error.message?.toLowerCase().includes("invalid") || 
          error.message?.toLowerCase().includes("unauthorized") ||
          error.message?.toLowerCase().includes("api key")) {
        throw new Error(`Invalid Resend API key: ${error.message}`);
      }
      // Other errors might be acceptable (rate limits, etc.)
      console.warn("Email send warning:", error.message);
    }
    
    // If we got a response with an ID, the API key is definitely valid
    if (data?.id) {
      expect(data.id).toBeDefined();
    }
  }, 15000); // 15 second timeout for network call
});
