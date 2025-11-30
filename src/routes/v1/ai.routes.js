import express from "express";
import OpenAI from "openai";
import { AIChatModel } from "../../models/aiChatModel.js";
import { GET_DB } from "~/config/mongodb";

const router = express.Router();

// =============== GROQ CLIENT ===============
const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// ====================== HELPERS ======================

// Bỏ dấu tiếng Việt
function normalize(str = "") {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Lưu lịch sử chat
async function saveChat(userId, userMsg, botMsg) {
  if (!userId) return;

  const now = new Date();

  await AIChatModel.create({
    userId,
    role: "user",
    content: userMsg,
    createdAt: now
  });

  await AIChatModel.create({
    userId,
    role: "assistant",
    content: botMsg,
    createdAt: now
  });
}

// ====================== INTENT DETECTOR ======================
async function detectIntent(message) {
  const prompt = `
Bạn là Cinesta AI.
Hãy phân loại câu người dùng thành 1 trong 3 nhãn sau:
- GREETING  (hello, xin chào, chào bạn...)
- MOVIE     (hỏi phim, thể loại, đang chiếu, sắp chiếu...)
- OTHER     (mọi thứ khác)

CHỈ TRẢ VỀ: GREETING, MOVIE hoặc OTHER.
  `;

  const completion = await client.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: message }
    ],
    temperature: 0.1
  });

  return completion.choices[0].message.content.trim();
}

// ====================== FIND MOVIES ======================
async function recommendMovies(message) {
  const raw = message || "";
  const text = normalize(raw);

  const query = {};         // now_showing / coming_soon
  const or = [];            // match genres or movie title

  // ----- Detect status -----
  if (text.includes("dang chieu") || text.includes("hom nay")) {
    query.status = "now_showing";
  }

  if (text.includes("sap chieu")) {
    query.status = "coming_soon";
  }

  // ----- Detect genres -----
  const genreMap = [
    { keys: ["kinh di", "horror", "ma"], regex: /Horror|Kinh dị/i },
    { keys: ["hanh dong", "action"], regex: /Action/i },
    { keys: ["hai", "hai huoc", "comedy"], regex: /Comedy|Hài/i },
    { keys: ["tinh cam", "romance", "love"], regex: /Romance/i },
    { keys: ["anime", "hoat hinh"], regex: /Animation|Anime/i },
    { keys: ["khoa hoc", "sci fi", "vien tuong"], regex: /Sci-Fi|Khoa học/i }
  ];

  for (const g of genreMap) {
    if (g.keys.some(k => text.includes(k))) {
      or.push({ genres: g.regex });
    }
  }

  // ----- Detect movie name -----
  const nameMatch = raw.match(/phim\s+(.+)/i);
  if (nameMatch) {
    const kw = nameMatch[1].trim();
    or.push({ title: new RegExp(kw, "i") });
  }

  // ----- Combine filters -----
  let mongoQuery = { _destroy: false };

  if (Object.keys(query).length > 0) {
    mongoQuery = { ...mongoQuery, ...query };
  }

  if (or.length > 0) {
    mongoQuery = { ...mongoQuery, $or: or };
  }

  const movies = await GET_DB()
    .collection("movies")
    .find(mongoQuery)
    .project({
      title: 1,
      genres: 1,
      posterUrl: 1,
      averageRating: 1,
      status: 1
    })
    .sort({ averageRating: -1 })
    .limit(5)
    .toArray();

  return movies;
}

// ====================== BUILD REPLY ======================
function buildReply(movies) {
  if (!movies || movies.length === 0) {
    return "Hiện tại Cinesta chưa có phim nào phù hợp với yêu cầu của bạn.";
  }

  let text = "Dưới đây là những phim phù hợp yêu cầu của bạn:\n";

  const arr = movies.map(m => ({
    id: String(m._id),
    title: m.title,
    poster: m.posterUrl || "",
    genre: Array.isArray(m.genres) ? m.genres.join(", ") : "",
    rating: m.averageRating ?? 0
  }));

  return text + "\n<<MOVIES>>" + JSON.stringify(arr);
}

// ====================== ROUTES ======================

// Lấy lịch sử chat
router.get("/history", async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) return res.json([]);

    const history = await AIChatModel.findByUser(userId);

    res.json(history.map(h => ({
      role: h.role,
      content: h.content
    })));
  } catch (err) {
    res.status(500).json([]);
  }
});

// Xử lý chat chính
router.post("/chat", async (req, res) => {
  try {
    const { userId, message } = req.body;
    if (!message) return res.json({ reply: "Bạn muốn hỏi gì về phim ạ?" });

    const intent = await detectIntent(message);

    // Greeting
    if (intent === "GREETING") {
      const reply = "Hello bạn 👋! Bạn muốn xem phim gì hôm nay?";
      await saveChat(userId, message, reply);
      return res.json({ reply });
    }

    // Không liên quan phim
    if (intent === "OTHER") {
      const reply = "Mình chỉ hỗ trợ tìm phim trong hệ thống Cinesta nhé. Bạn thử hỏi: phim đang chiếu, phim hành động...";
      await saveChat(userId, message, reply);
      return res.json({ reply });
    }

    // Tìm phim
    const movies = await recommendMovies(message);
    const reply = buildReply(movies);

    await saveChat(userId, message, reply);
    return res.json({ reply });

  } catch (err) {
    console.error("AI Chat Error:", err);
    res.status(500).json({ reply: "Xin lỗi, hệ thống đang gặp lỗi." });
  }
});

export default router;
