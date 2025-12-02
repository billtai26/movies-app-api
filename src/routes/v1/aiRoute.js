import express from 'express'
import OpenAI from 'openai'
import { AIChatModel } from '../../models/aiChatModel.js'
import { GET_DB } from '~/config/mongodb'

const router = express.Router()

const client = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: 'https://api.groq.com/openai/v1'
})

// ======================= Kiểm tra xem câu hỏi có liên quan phim không =======================
function isMovieRelated(message = '') {
  const text = message.toLowerCase()

  const keywords = [
    'phim', 'movie', 'đang chiếu', 'sắp chiếu',
    'rạp', 'đặt vé', 'suất chiếu', 'ghế', 'cinesta'
  ]

  return keywords.some(k => text.includes(k))
}

// ======================= Lấy phim từ MongoDB =======================
async function fetchMovies() {
  return await GET_DB()
    .collection('movies')
    .find({ _destroy: false })
    .project({
      title: 1,
      genres: 1,
      description: 1,
      posterUrl: 1,
      status: 1,
      averageRating: 1
    })
    .limit(30)
    .toArray()
}

// ======================= Save chat =======================
async function saveChat(userId, userMsg, botMsg) {
  if (!userId) return
  const now = new Date()

  await AIChatModel.create({
    userId,
    role: 'user',
    content: userMsg,
    createdAt: now
  })

  await AIChatModel.create({
    userId,
    role: 'assistant',
    content: botMsg,
    createdAt: now
  })
}

// ======================= AI trả lời về phim =======================
async function movieAI(message, movies) {
  const systemPrompt = `
Bạn là Cinesta AI — trợ lý thông minh của hệ thống đặt vé Cinesta.
Bạn chỉ được sử dụng dữ liệu phim bên dưới để trả lời khi câu hỏi liên quan đến phim:

${JSON.stringify(movies, null, 2)}

Nhiệm vụ:
- Phân tích câu hỏi.
- Lọc phim phù hợp theo title, thể loại, mô tả, hoặc status (now_showing / coming_soon).
- Nếu có phim phù hợp → trả về theo format sau:

<<MOVIES>> [
  { "title": "Tên phim", "genre": "Hành động", "rating": 8.5, "poster": "..." }
]

- Nếu câu hỏi chỉ là nói chuyện (không yêu cầu tìm phim) → trả lời tự nhiên.

QUAN TRỌNG: Không được bịa thêm phim không có trong danh sách trên.
  `

  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ],
    temperature: 0.2
  })

  return completion.choices[0].message.content.trim()
}

// ======================= AI trả lời bình thường =======================
async function generalAI(message) {
  const completion = await client.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      {
        role: 'system',
        content: `
Bạn là trợ lý AI thân thiện. Trả lời tự nhiên, logic, hữu ích cho mọi câu hỏi.
Không tạo phim hoặc dữ liệu Cinesta trừ khi được hỏi rõ ràng.
        `
      },
      { role: 'user', content: message }
    ],
    temperature: 0.7
  })

  return completion.choices[0].message.content.trim()
}

// ======================= ROUTE CHÍNH =======================
router.post('/chat', async (req, res) => {
  try {
    const { userId, message } = req.body
    if (!message) return res.json({ reply: 'Bạn muốn nói gì với Cinesta AI?' })

    let reply = ''

    if (isMovieRelated(message)) {
      // Nếu câu hỏi liên quan phim → Movie Mode
      const movies = await fetchMovies()
      reply = await movieAI(message, movies)
    } else {
      // Nếu câu hỏi ngoài lề → General Mode
      reply = await generalAI(message)
    }

    // Lưu chat
    await saveChat(userId, message, reply)

    return res.json({ reply })

  } catch (err) {
    console.error('AI Chat Error:', err)
    return res.status(500).json({
      reply: 'Xin lỗi, Cinesta AI đang gặp lỗi.'
    })
  }
})

// ======================= Lịch sử chat =======================
router.get('/history', async (req, res) => {
  try {
    const { userId } = req.query
    if (!userId) return res.json([])

    const history = await AIChatModel.findByUser(userId)

    res.json(history.map(h => ({
      role: h.role,
      content: h.content
    })))

  } catch (err) {
    res.json([])
  }
})

export default router
