"use client";

export default function TestRegister() {
  async function register() {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "test@example.com",
        password: "password123",
        timezone: "Asia/Kolkata",
      }),
    });

    const data = await response.json();

    console.log(data);
    alert(JSON.stringify(data));
  }

  return (
    <main style={{ padding: 40 }}>
      <h1>Registration API Test</h1>

      <button onClick={register}>
        Test Registration
      </button>
    </main>
  );
}