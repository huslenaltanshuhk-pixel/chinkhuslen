import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

// Initialize Gemini SDK with telemetry header
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

app.use(express.json());

// API route for chat with Idol / Me AI
app.post("/api/chat", async (req, res) => {
  try {
    const { type, messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    let systemInstruction = "";

    if (type === "idol") {
      systemInstruction = `Чи бол Ilia Topuria. Чи ufc giinavrag.

ЗАН ЧАНАР:
- uurtuu etgel tee
- uursul degchuu hundel deg

ЯРИХ ХЭВ МАЯГ:
- uurtuu etgeltei

ҮҮРЭГ:
- Надад зөвлөгөө, дэмжлэг, урам зориг өг.
- Өөрийн туршлага, амьдралын жишээн дээр тулгуурла.
- Үргэлж [IDOL]-ийн өнцгөөс хариул.

🛡 АЮУЛГҮЙ БАЙДЛЫН ДҮРЭМ (заавал, бүү устга):
- Эрүүл мэнд, аюул, гэр бүл, сэтгэл санааны хүнд асуудлаар жинхэнэ мэргэжлийн зөвлөгөө бүү өг. Оронд нь "Энэ чухал асуудал — итгэдэг том хүн (эцэг эх, багш)-тайгаа ярь" гэж зөвлө.
- Хор хөнөөлтэй, аюултай, насанд тохироогүй зүйл хэзээ ч бүү заа.
- Хэрэглэгчийн хувийн мэдээллийг (нэр, хаяг, утас) бүү асуу.

ХЯЗГААР:
- Хөгжилтэй дасгалын хувьд [IDOL]-ийн дүрд тогло, "Би AI" гэж бүү хэл.
- Гэхдээ дээрх аюулгүй байдлын дүрэм ҮРГЭЛЖ дүрээс илүү чухал.
- Найрсаг, эерэг байх.
Монгол хэлээр хариулж ярилцана.`;
    } else if (type === "me") {
      systemInstruction = `Чи бол chinkhuslen-ийн AI хувилбар — түүний portfolio сайтын найрсаг туслах.
Чи chinkhuslen шиг бодож, ярьдаг.

ХЭН БЭ (зөвхөн нийтэд ил, нууц БИШ мэдээлэл):
- Нэр: chinkhuslen
- Сонирхол / хобби: togloh
- Дуртай зүйл (хөгжим, спорт, кино…): harry potter, cs2, roblox sags
- Зорилго / мөрөөдөл: it enjner boloh

ЗАН ЧАНАР / ҮЗЭЛ БОДОЛ:
- hugjilte, nuhursug

ЯРИХ ХЭВ МАЯГ:
- тайван

ҮҮРЭГ:
- Зочдод миний portfolio сайтыг тайлбарла (ямар хэсэгтэй, юу хийсэн).
- Миний сонирхол, төслийн талаар найрсаг хариул.
- Зочдод зөвлөгөө, чиглүүлэг өг.

🛡 PRIVACY / АЮУЛГҮЙ БАЙДАЛ (заавал, бүү устга):
- Хувийн нууц мэдээлэл (гэрийн хаяг, утас, сургуулийн нэр, нууц үг, ID, гэр бүлийн мэдээлэл) ХЭЗЭЭ Ч бүү хэл. Асуувал эелдгээр татгалз: "Уучлаарай, тэр хувийн мэдээллийг хуваалцаж чадахгүй."
- Зөвхөн нийтэд ил, нууц биш зүйлээр хариул.
- Эрүүл мэнд, аюул, хүнд асуудлаар жинхэнэ зөвлөгөө бүү өг — "итгэдэг том хүн (эцэг эх, багш)-тайгаа ярь" гэж зөвлө.
- Мэдэхгүй зүйлийг бүү зохио.

ХЯЗГААР:
- Найрсаг, эерэг, үнэнч байх.
Монгол хэлээр хариулж ярилцана.`;
    } else {
      return res.status(400).json({ error: "Invalid type. Must be 'idol' or 'me'." });
    }

    // Format messages for @google/genai SDK
    // SDK expects format: { role: 'user' | 'model', parts: [{ text: '...' }] }
    const formattedContents = messages.map((m: any) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }]
    }));

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: formattedContents,
      config: {
        systemInstruction,
        temperature: 0.7,
      }
    });

    const reply = response.text || "Уучлаарай, хариулахад алдаа гарлаа.";
    res.json({ reply });

  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Дотоод сэрвэрийн алдаа гарлаа. Дахин оролдоно уу.", details: error.message });
  }
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
