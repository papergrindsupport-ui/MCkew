// Gemini AI gateway for paper explanations, image generation, test-me MCQs,
// chat follow-ups, and post-paper feedback.
// Uses the user-provided GEMINI_API_KEY (Google AI Studio).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TEXT_MODELS = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
const IMAGE_MODEL = "gemini-2.5-flash-image";

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function generateText(prompt: string, apiKey: string, systemInstruction?: string) {
  const body: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7 },
  };
  if (systemInstruction) {
    body.systemInstruction = { parts: [{ text: systemInstruction }] };
  }

  let lastErr = "";
  for (const model of TEXT_MODELS) {
    for (let attempt = 0; attempt < 3; attempt++) {
      const r = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (r.ok) {
        const data = await r.json();
        return (
          data.candidates?.[0]?.content?.parts
            ?.map((p: any) => p.text)
            .filter(Boolean)
            .join("\n") ?? ""
        );
      }
      const text = await r.text();
      lastErr = `Gemini ${model} error ${r.status}: ${text}`;
      // Retry only on overload/rate-limit/server errors
      if (![429, 500, 502, 503, 504].includes(r.status)) break;
      await sleep(800 * Math.pow(2, attempt) + Math.random() * 400);
    }
  }
  throw new Error(lastErr || "Gemini text generation failed");
}

async function generateImage(prompt: string, apiKey: string): Promise<string | null> {
  const body = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
  };
  const r = await fetch(`${GEMINI_BASE}/${IMAGE_MODEL}:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) {
    console.error("Image error", data);
    return null;
  }
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  for (const p of parts) {
    const inline = p.inlineData ?? p.inline_data;
    if (inline?.data) {
      const mime = inline.mimeType ?? inline.mime_type ?? "image/png";
      return `data:${mime};base64,${inline.data}`;
    }
  }
  return null;
}

function questionContext(q: any) {
  const lines: string[] = [];
  lines.push(`Question text: ${typeof q.text === "string" ? q.text : JSON.stringify(q.text)}`);
  if (q.intro)
    lines.push(`Intro: ${typeof q.intro === "string" ? q.intro : JSON.stringify(q.intro)}`);
  if (q.options) {
    lines.push("Options:");
    for (const [letter, opt] of Object.entries(q.options)) {
      lines.push(`  ${letter}: ${typeof opt === "string" ? opt : JSON.stringify(opt)}`);
    }
  }
  if (q.correct) lines.push(`Correct option: ${q.correct}`);
  if (q.userAnswer) lines.push(`User selected: ${q.userAnswer}`);
  if (q.subject) lines.push(`Subject: ${q.subject}`);
  if (q.topic) lines.push(`Topic: ${q.topic}`);
  if (q.lesson) lines.push(`Lesson: ${q.lesson}`);
  if (q.skills?.length) lines.push(`Skills: ${q.skills.join(", ")}`);
  if (q.tags?.length) lines.push(`Tags: ${q.tags.join(", ")}`);
  if (q.difficulty) lines.push(`Difficulty: ${q.difficulty}`);
  return lines.join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { action, payload } = await req.json();

    if (action === "explain") {
      const sys =
        "You are an expert IGCSE/A-Level science tutor. Explain MCQs clearly using GitHub-flavored Markdown with $LaTeX$ for math/chemistry. Structure: brief intro, why correct answer is right, why each wrong option is wrong, key concept summary, common pitfalls. Be precise and concise.";
      const text = await generateText(
        `Explain this multiple-choice question in depth:\n\n${questionContext(payload.question)}`,
        apiKey,
        sys,
      );

      // Generate up to 3 contextual images in parallel
      const imgPlanRaw = await generateText(
        `Based on this question, suggest 1 to 3 short visual prompts (one per line, no numbering) that would help explain the concept visually. Return ONLY prompt lines, no other text. Make each prompt a clear illustration request (diagram, labeled figure, etc).\n\n${questionContext(payload.question)}`,
        apiKey,
      );
      const imgPrompts = imgPlanRaw
        .split("\n")
        .map((l: string) => l.replace(/^[-*\d.\s]+/, "").trim())
        .filter((l: string) => l.length > 5)
        .slice(0, 3);

      const images = (
        await Promise.all(
          imgPrompts.map((p: string) =>
            generateImage(
              `Educational illustration for an IGCSE science textbook, clean and labeled, white background: ${p}`,
              apiKey,
            ),
          ),
        )
      ).filter(Boolean);

      return new Response(JSON.stringify({ explanation: text, images }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "testme") {
      const sys =
        "You generate IGCSE/A-Level style multiple-choice questions. Return ONLY valid JSON, no markdown fences.";
      const prompt = `Create ONE new MCQ on the same topic, lesson, and skills as the reference question. It should test the same concept differently. Avoid copying the wording.

Reference:
${questionContext(payload.question)}

${payload.previousAttempts?.length ? `Avoid repeating these prior questions you generated: ${JSON.stringify(payload.previousAttempts)}` : ""}

Return strict JSON of the form:
{"text":"...","options":{"A":"...","B":"...","C":"...","D":"..."},"correct":"A","rationale":"short why"}`;

      const raw = await generateText(prompt, apiKey, sys);
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/, "")
        .replace(/```\s*$/, "")
        .trim();
      let parsed;
      try {
        parsed = JSON.parse(cleaned);
      } catch {
        parsed = { error: "Could not parse AI response", raw };
      }
      return new Response(JSON.stringify(parsed), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "explain_testme") {
      const sys =
        "You are an expert tutor explaining why a student's answer was wrong on a follow-up MCQ. Use Markdown with LaTeX. Be encouraging.";
      const text = await generateText(
        `The student answered "${payload.userAnswer}" but the correct answer is "${payload.correct}".\n\nQuestion: ${payload.question.text}\nOptions: ${JSON.stringify(payload.question.options)}\n\nExplain clearly why "${payload.correct}" is correct and "${payload.userAnswer}" is wrong, then give a 1-line tip to remember this.`,
        apiKey,
        sys,
      );
      return new Response(JSON.stringify({ explanation: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "chat") {
      // payload.messages: [{role:'user'|'assistant', content:string}], payload.context: string
      const sys = `You are a helpful IGCSE/A-Level tutor continuing a conversation about a specific MCQ. Use Markdown with $LaTeX$ for formulas. Reference this prior explanation context when needed:\n\n${payload.context ?? ""}`;
      const contents = (payload.messages ?? []).map((m: any) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));
      let reply = "";
      let lastChatErr = "";
      outer: for (const model of TEXT_MODELS) {
        for (let attempt = 0; attempt < 3; attempt++) {
          const r = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents,
              systemInstruction: { parts: [{ text: sys }] },
              generationConfig: { temperature: 0.7 },
            }),
          });
          if (r.ok) {
            const data = await r.json();
            reply =
              data.candidates?.[0]?.content?.parts
                ?.map((p: any) => p.text)
                .filter(Boolean)
                .join("\n") ?? "";
            break outer;
          }
          lastChatErr = `Gemini ${model} chat error ${r.status}: ${await r.text()}`;
          if (![429, 500, 502, 503, 504].includes(r.status)) break;
          await sleep(800 * Math.pow(2, attempt) + Math.random() * 400);
        }
      }
      if (!reply && lastChatErr) throw new Error(lastChatErr);
      return new Response(JSON.stringify({ reply }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "feedback") {
      // payload: { paper: {...}, performance: {totalQuestions, correct, wrong, unanswered, percent}, missed: [...], correctList: [...] }
      const sys =
        "You are a personal IGCSE/A-Level coach. Give detailed, organized, encouraging feedback in clean Markdown with these sections (## headings): 'Overall Performance', 'Predicted Grade', 'Strengths', 'Areas to Improve', 'Topics to Practice (with priority)', 'Study Plan (next 7 days)', 'Final Tips'. Use bullet points, bold key terms, and a friendly tone.";
      const prompt = `Generate feedback for this paper attempt:

Paper: ${JSON.stringify(payload.paper)}
Score: ${payload.performance.correct}/${payload.performance.totalQuestions} (${payload.performance.percent}%)
Wrong: ${payload.performance.wrong}, Unanswered: ${payload.performance.unanswered}

Missed questions (with topic/lesson/skills/tags):
${JSON.stringify(payload.missed, null, 2)}

Correctly answered (topic distribution for strengths):
${JSON.stringify(payload.correctList, null, 2)}

Estimate predicted Paper 2 IGCSE grade (9-1) based on % and difficulty. Be specific about which topics/lessons/skills to revisit.`;
      const text = await generateText(prompt, apiKey, sys);
      return new Response(JSON.stringify({ feedback: text }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("gemini-ai error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
