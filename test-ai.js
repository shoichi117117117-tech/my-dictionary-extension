const OPENROUTER_API_KEY = "HIDDEN";

async function testOpenRouterKey() {
  console.log("Sending request to OpenRouter API...");

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "HTTP-Referer": "https://github.com/my-dictionary-extension",
        "X-Title": "German English Dictionary Extension",
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: "Provide a concise dictionary breakdown for the German word 'Krankenhaus': gender, plural form, short English definition, and an example sentence."
          }
        ]
      })
    });

    console.log(`Response Status: ${response.status} ${response.statusText}`);

    const data = await response.json();

    if (!response.ok) {
      console.error("API Error Response:", JSON.stringify(data, null, 2));
      return;
    }

    console.log("\n--- LLM Output Success! ---");
    console.log(data.choices[0].message.content);
    console.log("----------------------------\n");
  } catch (err) {
    console.error("Network or Script Error:", err.message);
  }
}

testOpenRouterKey();